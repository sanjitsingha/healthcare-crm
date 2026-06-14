import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function checkDatabase(client) {
  const start = Date.now()
  try {
    const { error } = await client.from('profiles').select('id').limit(1)
    const ms = Date.now() - start
    if (error) return { status: 'outage', latency_ms: ms, message: error.message }
    if (ms > 2000) return { status: 'degraded', latency_ms: ms, message: 'High response time' }
    if (ms > 800)  return { status: 'degraded', latency_ms: ms, message: 'Elevated response time' }
    return { status: 'operational', latency_ms: ms }
  } catch (e) {
    return { status: 'outage', latency_ms: Date.now() - start, message: e.message }
  }
}

async function checkApi() {
  const start = Date.now()
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      }
    )
    const ms = Date.now() - start
    // Supabase REST root returns 200 or 404 — either means the API is up
    if (!res.ok && res.status !== 404) return { status: 'outage', latency_ms: ms, message: `HTTP ${res.status}` }
    if (ms > 2000) return { status: 'degraded', latency_ms: ms, message: 'High response time' }
    if (ms > 800)  return { status: 'degraded', latency_ms: ms, message: 'Elevated response time' }
    return { status: 'operational', latency_ms: ms }
  } catch (e) {
    return { status: 'outage', latency_ms: Date.now() - start, message: e.message }
  }
}

export async function GET() {
  const client = sb()
  const now = new Date().toISOString()

  const [database, api] = await Promise.all([checkDatabase(client), checkApi()])
  // Application is always operational if this route is responding
  const application = { status: 'operational', latency_ms: 0 }

  const services = { database, api, application }
  const statuses = [database.status, api.status]
  const overall = statuses.includes('outage') ? 'outage'
    : statuses.includes('degraded') ? 'degraded'
    : 'operational'

  // Write results to status_checks — best-effort (table may not exist during first deploy)
  try {
    await client.from('status_checks').insert(
      Object.entries(services).map(([service, s]) => ({
        service,
        status: s.status,
        latency_ms: s.latency_ms,
        message: s.message || null,
        checked_at: now,
      }))
    )
  } catch {}

  return NextResponse.json({ services, overall, checked_at: now })
}
