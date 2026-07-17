import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { subscriptionAccess } from '@/lib/subscriptions'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function POST(req) {
  const serverClient = await createServerClient()
  const { data: { user: adminUser } } = await serverClient.auth.getUser()
  if (!adminUser) return json({ error: 'Unauthorized' }, 401)

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.' }, 500)

  const { name, designation, description, phone, email, roleId, orgId, zeoAccess } = await req.json()
  if (!name || !email || !orgId) return json({ error: 'Missing required fields' }, 400)

  const origin = req.headers.get('origin') || 'http://localhost:3000'

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: subscription } = await adminClient.from('subscriptions').select('*').eq('organization_id', orgId).maybeSingle()
  const access = subscription ? subscriptionAccess(subscription) : { writable: true, seatLimit: null }
  if (!access.writable) return json({ error: 'This workspace is read-only. Renew the subscription to invite staff.' }, 403)
  if (access.seatLimit !== null) {
    const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    if ((count || 0) >= access.seatLimit) return json({ error: `This plan includes ${access.seatLimit} seats. Upgrade to invite another member.` }, 403)
  }

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { name, designation: designation || '', org_id: orgId, role_id: roleId || null, zeo_access: !!zeoAccess },
    redirectTo: `${origin}/auth/accept-invite`,
  })

  if (error) return json({ error: error.message }, 400)

  const invitedUserId = data.user.id

  if (roleId) {
    await adminClient.from('user_roles').upsert(
      { user_id: invitedUserId, role_id: roleId, organization_id: orgId },
      { onConflict: 'user_id,organization_id' }
    )
  }

  const { data: orgRow } = await adminClient
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  if (orgRow) {
    const settings = orgRow.settings || {}
    const staffMembers = settings.staff_members || []
    if (!staffMembers.find(m => m.email === email)) {
      await adminClient
        .from('organizations')
        .update({
          settings: {
            ...settings,
            staff_members: [
              ...staffMembers,
              {
                id: crypto.randomUUID(),
                auth_user_id: invitedUserId,
                name,
                designation: designation || '',
                description: description || '',
                phone: phone || '',
                email,
                has_login: true,
                status: 'invited',
                role_id: roleId || null,
                zeo_access: !!zeoAccess,
              },
            ],
          },
        })
        .eq('id', orgId)
    }
  }

  return json({ ok: true })
}
