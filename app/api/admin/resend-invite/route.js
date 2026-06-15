import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function POST(req) {
  const serverClient = await createServerClient()
  const { data: { user: adminUser } } = await serverClient.auth.getUser()
  if (!adminUser) return json({ error: 'Unauthorized' }, 401)

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return json({ error: 'Server misconfiguration' }, 500)

  const { email, authUserId, memberId, name, designation, orgId, roleId } = await req.json()
  if (!email || !orgId) return json({ error: 'Missing required fields' }, 400)

  const origin = req.headers.get('origin') || 'http://localhost:3000'

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Delete the existing pending auth user so Supabase will actually
  // send a fresh invite email when re-invited. Without this step,
  // inviteUserByEmail on an already-pending user does nothing.
  if (authUserId) {
    await adminClient.auth.admin.deleteUser(authUserId)
  }

  // Re-invite — this sends a fresh email
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { name, designation: designation || '', org_id: orgId, role_id: roleId || null },
    redirectTo: `${origin}/auth/accept-invite`,
  })
  if (error) return json({ error: error.message }, 400)

  const newAuthUserId = data.user.id

  // Update the staff_member record with the new auth_user_id
  const { data: orgRow } = await adminClient
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  if (orgRow && memberId) {
    const settings = orgRow.settings || {}
    const staffMembers = (settings.staff_members || []).map(m =>
      m.id === memberId ? { ...m, auth_user_id: newAuthUserId, status: 'invited' } : m
    )
    await adminClient
      .from('organizations')
      .update({ settings: { ...settings, staff_members: staffMembers } })
      .eq('id', orgId)
  }

  return json({ ok: true, newAuthUserId })
}
