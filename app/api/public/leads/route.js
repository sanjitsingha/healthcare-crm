import { NextResponse } from 'next/server'
import { createAdminClient, getOrgByApiKey } from '@/lib/supabase/admin'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

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
  const auth = req.headers.get('authorization') || ''
  const apiKey = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Authorization: Bearer <api_key> header' }, { status: 401, headers: CORS })
  }

  const org = await getOrgByApiKey(apiKey)
  if (!org) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: CORS })
  }

  let body = {}
  try { body = await req.json() } catch { /* empty body */ }

  // name → first_name + last_name
  if (body.name && !body.first_name) {
    const { first, last } = splitName(body.name)
    body = { ...body, first_name: first, ...(last ? { last_name: last } : {}) }
  }
  // notes → description alias
  if (body.notes && !body.description) body = { ...body, description: body.notes }

  const lead = { organization_id: org.id, stage: body.stage || 'New' }
  const custom = {}

  for (const [k, v] of Object.entries(body)) {
    if (k === 'name' || k === 'notes') continue
    if (DIRECT_FIELDS.has(k)) lead[k] = v
    else custom[k] = v
  }
  if (Object.keys(custom).length) lead.custom_data = custom

  if (!lead.first_name && !lead.phone && !lead.email) {
    return NextResponse.json(
      { error: 'Provide at least one of: first_name, phone, email' },
      { status: 422, headers: CORS },
    )
  }

  if (!lead.title) {
    lead.title = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim()
      || lead.email || lead.phone || 'Lead'
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('leads').insert(lead).select('id').single()

  if (error) {
    console.error('[public/leads]', error.message)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500, headers: CORS })
  }

  return NextResponse.json({ ok: true, lead_id: data.id }, { headers: CORS })
}
