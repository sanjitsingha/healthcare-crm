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
    if (integ) return { orgId: org.id, settings: org.settings || {}, integ }
  }
  return null
}

// Lead columns that a form field may be mapped to. Anything else → custom_data.
const LEAD_COLUMNS = new Set([
  'first_name', 'last_name', 'phone', 'email', 'gender', 'date_of_birth',
  'address', 'value', 'currency', 'source', 'priority', 'stage', 'description', 'title',
])

// Remember the form's question names so the mapping UI can offer them as choices.
async function rememberFields(orgId, settings, integId, keys) {
  try {
    const integrations = (settings.integrations || []).map(i =>
      i.id === integId
        ? { ...i, config: { ...i.config, detected_fields: Array.from(new Set([...(i.config?.detected_fields || []), ...keys])) } }
        : i
    )
    await supabase.from('organizations').update({ settings: { ...settings, integrations } }).eq('id', orgId)
  } catch { /* non-critical */ }
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

const normKey = k => String(k).toLowerCase().replace(/[\s_-]+/g, '')

function normalizeGender(v) {
  return v && /^(male|female|other)$/i.test(v) ? v[0].toUpperCase() + v.slice(1).toLowerCase() : null
}

// Apply a user-defined mapping: [{ form_field, lead_field }].
// lead_field is a real lead column, or 'custom:<Label>' to store in custom_data.
// Returns { lead, usedFormKeys } so the auto-mapper can skip already-mapped answers.
function applyFieldMap(fields, fieldMap) {
  const lead = {}
  const custom = {}
  const usedFormKeys = new Set()
  const lookup = {}
  for (const [k, v] of Object.entries(fields)) lookup[normKey(k)] = { k, v }

  for (const row of (fieldMap || [])) {
    if (!row.form_field || !row.lead_field) continue
    const hit = lookup[normKey(row.form_field)]
    if (!hit || hit.v == null || String(hit.v).trim() === '') continue
    const value = String(hit.v).trim()
    usedFormKeys.add(normKey(row.form_field))

    if (row.lead_field.startsWith('custom:')) {
      custom[row.lead_field.slice(7) || row.form_field] = value
    } else if (row.lead_field === 'gender') {
      const g = normalizeGender(value); if (g) lead.gender = g
    } else if (row.lead_field === 'value') {
      const n = Number(value); if (!Number.isNaN(n)) lead.value = n
    } else if (LEAD_COLUMNS.has(row.lead_field)) {
      lead[row.lead_field] = value
    }
  }
  return { lead, custom, usedFormKeys }
}

function mapToLead(fields, fieldMap) {
  // 1) Explicit mapping wins.
  const { lead: mapped, custom, usedFormKeys } = applyFieldMap(fields, fieldMap)

  // 2) Auto-detect anything the mapping didn't set (so partial maps still help).
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
  const extra = { ...custom }
  for (const [k, v] of Object.entries(fields)) {
    const nk = normKey(k)
    if (usedFormKeys.has(nk)) continue            // already mapped explicitly
    if (!mappedKeys.has(nk)) extra[k] = v          // leftover unknown answers
  }

  // Explicit map (mapped.*) overrides auto-detected values.
  const out = {
    first_name: mapped.first_name || first_name || 'Unknown',
    last_name:  mapped.last_name  ?? last_name ?? null,
    phone:      mapped.phone      ?? phone ?? null,
    email:      mapped.email      ?? email ?? null,
    gender:     mapped.gender     ?? gender ?? null,
    description: mapped.description ?? description ?? null,
    custom_data: extra,
  }
  // Optional extra columns only set via explicit mapping.
  for (const col of ['date_of_birth', 'address', 'value', 'currency', 'priority', 'stage', 'source']) {
    if (mapped[col] != null) out[col] = mapped[col]
  }
  out.title = mapped.title
    || [out.first_name, out.last_name].filter(Boolean).join(' ')
    || fullName || 'Form lead'
  return out
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

  const { orgId, settings, integ } = match
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

  const mapped = mapToLead(fields, integ.config?.field_map)
  const lead = {
    ...mapped,
    organization_id: orgId,
    source: mapped.source || SOURCE_LABEL[provider] || 'Webhook',
    stage: mapped.stage || 'New',
  }

  const { data, error } = await supabase.from('leads').insert(lead).select('id').single()
  if (error) return json({ ok: false, error: error.message }, 500)

  // Learn this form's field names for the mapping UI (fire-and-forget).
  await rememberFields(orgId, settings, integ.id, Object.keys(fields))

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
