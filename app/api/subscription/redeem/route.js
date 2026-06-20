import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request) {
  const server = await createClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Invalid activation code.' }, { status: 400 })
  const { code } = await request.json()
  const normalized = String(code || '').trim().toUpperCase()
  if (!/^[A-Z0-9-]{8,64}$/.test(normalized)) return Response.json({ error: 'Invalid activation code.' }, { status: 400 })
  const { data: profile } = await server.from('profiles').select('organization_id').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id) return Response.json({ error: 'Invalid activation code.' }, { status: 400 })
  const hash = createHash('sha256').update(normalized).digest('hex')
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('redeem_activation_code', { p_code_hash: hash, p_organization_id: profile.organization_id, p_user_id: user.id })
    if (error || !data?.ok) return Response.json({ error: 'Invalid activation code.' }, { status: 400 })
    return Response.json({ ok: true, subscription: data })
  } catch { return Response.json({ error: 'Invalid activation code.' }, { status: 400 }) }
}
