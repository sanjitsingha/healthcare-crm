import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function POST(req) {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return json({ error: 'Server misconfiguration' }, 500)

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const orgId = user.user_metadata?.org_id
  if (!orgId) return json({ ok: true }) // owner has no org_id in metadata, skip

  const { data: orgRow } = await adminClient
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  if (!orgRow) return json({ ok: true })

  const settings = orgRow.settings || {}
  const members = settings.staff_members || []
  const updated = members.map(m =>
    m.auth_user_id === user.id || m.email === user.email
      ? { ...m, status: 'active' }
      : m
  )

  await adminClient
    .from('organizations')
    .update({ settings: { ...settings, staff_members: updated } })
    .eq('id', orgId)

  return json({ ok: true })
}
