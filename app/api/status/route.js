import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'

export const revalidate = 60

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const SERVICES = ['database', 'api', 'application']
const WORST = { outage: 3, degraded: 2, operational: 1 }

export async function GET() {
  const client = sb()
  const since90 = subDays(new Date(), 90).toISOString()
  const since24h = subDays(new Date(), 1).toISOString()

  try {
    const [{ data: rows90 }, { data: rows24h }] = await Promise.all([
      client.from('status_checks')
        .select('service, status, checked_at')
        .gte('checked_at', since90)
        .order('checked_at'),
      client.from('status_checks')
        .select('service, latency_ms, checked_at')
        .gte('checked_at', since24h)
        .order('checked_at'),
    ])

    const history = {}
    const uptimePct = {}

    for (const svc of SERVICES) {
      const svcRows = (rows90 || []).filter(r => r.service === svc)

      // Aggregate to worst status per day
      const dayMap = {}
      for (const row of svcRows) {
        const day = format(new Date(row.checked_at), 'yyyy-MM-dd')
        if (!dayMap[day] || (WORST[row.status] || 0) > (WORST[dayMap[day]] || 0)) {
          dayMap[day] = row.status
        }
      }

      // Fill all 90 days (most-recent = last)
      const days = []
      for (let i = 89; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
        days.push({ date: d, status: dayMap[d] || null })
      }
      history[svc] = days

      const withData = days.filter(d => d.status)
      const opDays = withData.filter(d => d.status === 'operational').length
      uptimePct[svc] = withData.length
        ? ((opDays / withData.length) * 100).toFixed(2)
        : null
    }

    // Hourly latency buckets per service (last 24h)
    const trend = {}
    for (const svc of SERVICES) {
      const svcRows = (rows24h || []).filter(r => r.service === svc)
      const hourMap = {}
      for (const row of svcRows) {
        const h = format(new Date(row.checked_at), 'yyyy-MM-dd HH:00')
        if (!hourMap[h]) hourMap[h] = []
        if (row.latency_ms != null) hourMap[h].push(row.latency_ms)
      }
      trend[svc] = Object.entries(hourMap).map(([hour, vals]) => ({
        hour,
        avg_ms: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
      }))
    }

    return NextResponse.json({ history, uptimePct, trend })
  } catch {
    return NextResponse.json({ history: {}, uptimePct: {}, trend: {} })
  }
}
