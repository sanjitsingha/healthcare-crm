import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function PATCH(req) {
  const serverClient = await createServerClient()
  const { data: { user: adminUser } } = await serverClient.auth.getUser()
  if (!adminUser) return json({ error: 'Unauthorized' }, 401)

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return json({ error: 'Server misconfiguration' }, 500)

  const { memberId, authUserId, roleId, orgId } = await req.json()
  if (!orgId || !memberId) return json({ error: 'orgId and memberId are required' }, 400)

  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Update user_roles table (upsert by user+org, set new role)
  if (authUserId) {
    if (roleId) {
      await client
        .from('user_roles')
        .upsert(
          { user_id: authUserId, role_id: roleId, organization_id: orgId },
          { onConflict: 'user_id,organization_id' }
        )
    } else {
      // roleId null = remove role assignment
      await client
        .from('user_roles')
        .delete()
        .eq('user_id', authUserId)
        .eq('organization_id', orgId)
    }
  }

  // 2. Fetch the role name for the UI
  let roleName = null
  if (roleId) {
    const { data: roleRow } = await client
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single()
    roleName = roleRow?.name || null
  }

  // 3. Update staff_members in org settings
  const { data: orgRow } = await client
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  if (orgRow) {
    const settings = orgRow.settings || {}
    const updated = (settings.staff_members || []).map(m =>
      m.id === memberId ? { ...m, role_id: roleId || null, role_name: roleName } : m
    )
    await client
      .from('organizations')
      .update({ settings: { ...settings, staff_members: updated } })
      .eq('id', orgId)
  }

  return json({ ok: true, roleName })
}
