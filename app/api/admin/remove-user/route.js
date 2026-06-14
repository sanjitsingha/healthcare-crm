import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function POST(req) {
  const serverClient = await createServerClient()
  const { data: { user: adminUser } } = await serverClient.auth.getUser()
  if (!adminUser) return json({ error: 'Unauthorized' }, 401)

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.' }, 500)

  const { memberId, authUserId, orgId } = await req.json()
  if (!orgId) return json({ error: 'Missing orgId' }, 400)

  // Prevent self-removal
  if (authUserId && authUserId === adminUser.id) {
    return json({ error: 'You cannot remove your own account.' }, 400)
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Remove from org.settings.staff_members
  const { data: orgRow } = await adminClient
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  if (orgRow) {
    const settings = orgRow.settings || {}
    const updated = (settings.staff_members || []).filter(m => m.id !== memberId)
    await adminClient
      .from('organizations')
      .update({ settings: { ...settings, staff_members: updated } })
      .eq('id', orgId)
  }

  if (authUserId) {
    // 2. Remove from user_roles
    await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', authUserId)
      .eq('organization_id', orgId)

    // 3. Detach profile from org (don't hard-delete the profile)
    await adminClient
      .from('profiles')
      .update({ organization_id: null })
      .eq('id', authUserId)

    // 4. Delete from Supabase Auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUserId)
    if (deleteError) return json({ error: `Auth deletion failed: ${deleteError.message}` }, 400)
  }

  return json({ ok: true })
}
