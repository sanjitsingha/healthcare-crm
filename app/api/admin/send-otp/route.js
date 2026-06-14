import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function POST(req) {
  // Verify the calling user is authenticated
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { email } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Valid email is required' }, 400)
  }

  // Use a plain client (no cookie persistence) to send OTP to the target email.
  // This sends Supabase's native 6-digit OTP email without affecting the admin's session.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  )

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) return json({ error: error.message }, 400)

  return json({ ok: true })
}
