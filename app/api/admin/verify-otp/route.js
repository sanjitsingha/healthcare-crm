import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function POST(req) {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { email, token } = await req.json()
  if (!email || !token) return json({ error: 'email and token are required' }, 400)

  // Verify the OTP server-side. The resulting session stays in memory only — no
  // cookies are set, so the admin's browser session is not affected.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  )

  // New users are created via signInWithOtp(shouldCreateUser:true) which produces a
  // signup-type token. Try 'signup' first; fall back to 'email' for existing users.
  let data, error
  ;({ data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' }))
  if (error) {
    ;({ data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' }))
  }

  if (error || !data?.user) return json({ error: error?.message || 'Invalid or expired OTP' }, 400)

  return json({ ok: true, userId: data.user.id })
}
