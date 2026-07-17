import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function POST(req) {
  const serverClient = await createServerClient()
  const { data: { user: adminUser } } = await serverClient.auth.getUser()
  if (!adminUser) return json({ error: 'Unauthorized' }, 401)

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.' }, 500)
  }

  const { userId, email, password, name, designation, description, phone, orgId, zeoAccess } = await req.json()
  if (!userId || !email || !password || !name || !orgId) {
    return json({ error: 'Missing required fields' }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400)
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // The user was created (unconfirmed) by signInWithOtp and confirmed via verifyOtp.
  // Set their password and profile metadata now.
  const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { name, designation, description: description || null, phone: phone || null, org_id: orgId, role: 'member', zeo_access: !!zeoAccess },
  })

  if (error) return json({ error: error.message }, 400)

  // Also update the org's staff_members list so the user appears in the team roster.
  const { data: orgRow, error: orgErr } = await adminClient
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  if (!orgErr && orgRow) {
    const settings = orgRow.settings || {}
    const staffMembers = settings.staff_members || []
    // Avoid duplicates in case user was already in the list
    const already = staffMembers.find(m => m.email === email || m.auth_user_id === userId)
    if (!already) {
      const newMember = {
        id: crypto.randomUUID(),
        auth_user_id: userId,
        name,
        designation: designation || '',
        description: description || '',
        phone: phone || '',
        email,
        has_login: true,
        role: 'member',
      }
      await adminClient
        .from('organizations')
        .update({ settings: { ...settings, staff_members: [...staffMembers, newMember] } })
        .eq('id', orgId)
    }
  }

  return json({ ok: true, userId: data.user.id })
}
