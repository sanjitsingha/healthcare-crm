import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req) {
  let email, source
  try {
    const body = await req.json()
    email = (body.email || '').trim().toLowerCase()
    source = body.source || 'newsletter_page'
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400)
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return json({ error: 'Server misconfiguration' }, 500)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert({ email, source }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) return json({ error: 'Could not subscribe right now. Please try again.' }, 500)

  return json({ ok: true })
}
