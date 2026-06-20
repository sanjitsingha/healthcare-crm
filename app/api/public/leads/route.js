import { NextResponse } from 'next/server'
import { createAdminClient, getOrgByApiKey } from '@/lib/supabase/admin'
import { runAutomations, logAutomationRuns } from '@/lib/automations/engine'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: CORS })

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

const DIRECT_FIELDS = new Set([
  'first_name', 'last_name', 'phone', 'email', 'gender',
  'date_of_birth', 'address', 'source', 'stage', 'priority',
  'value', 'currency', 'description', 'title',
])

function splitName(full) {
  const parts = (full || '').trim().split(/\s+/)
  return { first: parts[0] || '', last: parts.slice(1).join(' ') }
}

export async function POST(req) {
  try {
    // Check service key first
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set' }, 500)
    }

    // Auth
    const auth = req.headers.get('authorization') || ''
    const apiKey = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null
    if (!apiKey) {
      return json({ error: 'Missing Authorization: Bearer <api_key> header' }, 401)
    }

    const org = await getOrgByApiKey(apiKey)
    if (!org) {
      return json({ error: 'Invalid API key' }, 401)
    }

    // Parse body
    let body = {}
    try { body = await req.json() } catch { /* empty body */ }

    // name → first_name + last_name alias
    if (body.name && !body.first_name) {
      const { first, last } = splitName(body.name)
      body = { ...body, first_name: first, ...(last ? { last_name: last } : {}) }
    }
    // notes → description alias
    if (body.notes && !body.description) body = { ...body, description: body.notes }

    // Map fields
    const lead = { organization_id: org.id, stage: body.stage || 'New' }
    const custom = {}

    for (const [k, v] of Object.entries(body)) {
      if (k === 'name' || k === 'notes') continue
      if (DIRECT_FIELDS.has(k)) lead[k] = v
      else custom[k] = v
    }
    if (Object.keys(custom).length) lead.custom_data = custom

    if (!lead.first_name && !lead.phone && !lead.email) {
      return json({ error: 'Provide at least one of: first_name, phone, email' }, 422)
    }

    if (!lead.title) {
      lead.title = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim()
        || lead.email || lead.phone || 'Lead'
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.from('leads').insert(lead).select('*').single()

    if (error) {
      console.error('[public/leads]', error.message)
      return json({ error: 'Failed to create lead' }, 500)
    }

    // Fire "Lead created" automation rules server-side (best-effort).
    try {
      const outcome = await runAutomations({ supabase, org, target: 'lead', event: 'lead_created', entity: data })
      await logAutomationRuns(supabase, { orgId: org.id, entityType: 'lead', entityId: data.id, outcome })
    } catch (e) { console.error('[public/leads] automation error:', e.message) }

    return json({ ok: true, lead_id: data.id })
  } catch (err) {
    console.error('[public/leads] unexpected error:', err.message)
    return json({ error: 'Internal server error' }, 500)
  }
}
