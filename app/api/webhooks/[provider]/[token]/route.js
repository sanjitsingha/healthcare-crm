import { createClient } from '@supabase/supabase-js'

// Inbound lead-capture webhook.
// External services (Google Forms via Apps Script, WordPress, generic) POST here.
// URL shape: /api/webhooks/<provider>/<token>  — token is generated in Settings → Configuration.
//
// RLS on this project is currently `using(true)`, so the anon key can read orgs
// and insert leads. (See the security TODO before production — this should move to
// a service-role key + locked-down policies.)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
)

const SOURCE_LABEL = {
  google_forms:  'Google Forms',
  wordpress:     'WordPress',
  meta_lead_ads: 'Meta Lead Ads',
  webhook:       'Webhook',
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

// Find the org + integration that owns this token.
async function resolveIntegration(provider, token) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, settings')
  if (error) return null
  for (const org of data || []) {
    const integ = (org.settings?.integrations || []).find(
      i => i.token === token && i.type === provider
    )
    if (integ) return { orgId: org.id, integ }
  }
  return null
}

// Pull a value out of a flat field map by trying several candidate key names
// (case-insensitive, ignoring spaces/underscores).
function pick(fields, candidates) {
  const norm = k => String(k).toLowerCase().replace(/[\s_-]+/g, '')
  const map = {}
  for (const [k, v] of Object.entries(fields)) map[norm(k)] = v
  for (const c of candidates) {
    const v = map[norm(c)]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

function mapToLead(fields) {
  const fullName = pick(fields, ['name', 'full name', 'fullname', 'your name', 'patient name'])
  let first_name = pick(fields, ['first name', 'firstname', 'fname'])
  let last_name  = pick(fields, ['last name', 'lastname', 'lname', 'surname'])
  if (!first_name && fullName) {
    const parts = fullName.split(/\s+/)
    first_name = parts.shift()
    last_name = last_name || (parts.length ? parts.join(' ') : null)
  }

  const phone = pick(fields, ['phone', 'mobile', 'contact', 'contact number', 'phone number', 'whatsapp', 'cell'])
  const email = pick(fields, ['email', 'e-mail', 'email address'])
  const genderRaw = pick(fields, ['gender', 'sex'])
  const gender = genderRaw && /^(male|female|other)$/i.test(genderRaw)
    ? genderRaw[0].toUpperCase() + genderRaw.slice(1).toLowerCase()
    : null
  const description = pick(fields, ['message', 'notes', 'comments', 'comment', 'enquiry', 'inquiry', 'details', 'how can we help'])

  // Keep the raw answers (minus the mapped ones) in custom_data for reference.
  const mappedKeys = new Set(['name', 'full name', 'fullname', 'your name', 'patient name',
    'first name', 'firstname', 'fname', 'last name', 'lastname', 'lname', 'surname',
    'phone', 'mobile', 'contact', 'contact number', 'phone number', 'whatsapp', 'cell',
    'email', 'e-mail', 'email address', 'gender', 'sex',
    'message', 'notes', 'comments', 'comment', 'enquiry', 'inquiry', 'details', 'how can we help']
    .map(k => k.toLowerCase().replace(/[\s_-]+/g, '')))
  const extra = {}
  for (const [k, v] of Object.entries(fields)) {
    if (!mappedKeys.has(String(k).toLowerCase().replace(/[\s_-]+/g, ''))) extra[k] = v
  }

  return {
    first_name: first_name || 'Unknown',
    last_name: last_name || null,
    phone: phone || null,
    email: email || null,
    gender,
    description: description || null,
    title: [first_name, last_name].filter(Boolean).join(' ') || fullName || 'Form lead',
    custom_data: extra,
  }
}

// Accept JSON, form-urlencoded, or Apps Script's text/plain JSON body.
async function readFields(req) {
  const ct = req.headers.get('content-type') || ''
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await req.formData()
    return Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]))
  }
  let body = {}
  try { body = JSON.parse(await req.text() || '{}') } catch { body = {} }
  // Apps Script template sends { fields: {...} }; also accept a flat object.
  return body.fields && typeof body.fields === 'object' ? body.fields : body
}

export async function POST(req, { params }) {
  const { provider, token } = await params
  const match = await resolveIntegration(provider, token)
  if (!match) return json({ ok: false, error: 'Invalid or unknown webhook token' }, 404)

  const { orgId, integ } = match
  if (!integ.enabled) return json({ ok: false, error: 'Integration is disabled' }, 403)

  const fields = await readFields(req)

  // Optional shared-secret check (sent as ?secret= or in the body).
  const secret = integ.config?.secret
  if (secret) {
    const url = new URL(req.url)
    const sent = url.searchParams.get('secret') || fields.secret || fields._secret
    if (sent !== secret) return json({ ok: false, error: 'Secret mismatch' }, 401)
    delete fields.secret; delete fields._secret
  }

  if (!fields || Object.keys(fields).length === 0)
    return json({ ok: false, error: 'No form fields received' }, 400)

  const lead = {
    ...mapToLead(fields),
    organization_id: orgId,
    source: SOURCE_LABEL[provider] || 'Webhook',
    stage: 'New',
  }

  const { data, error } = await supabase.from('leads').insert(lead).select('id').single()
  if (error) return json({ ok: false, error: error.message }, 500)

  return json({ ok: true, lead_id: data.id })
}

// Simple reachability check (open the URL in a browser to confirm it's live).
export async function GET(req, { params }) {
  const { provider, token } = await params
  const match = await resolveIntegration(provider, token)
  return json({
    ok: true,
    provider,
    connected: !!match,
    message: match
      ? 'Webhook is live. Send a POST with form fields to create a lead.'
      : 'No integration found for this token.',
  })
}
