import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const DEFAULT_ROLES = [
  {
    name: 'Admin',
    description: 'Full access to all features',
    permissions: [
      'dashboard','notifications','reports',
      'leads','leads.create','leads.edit','leads.delete','leads.import',
      'contacts','contacts.create','contacts.edit','contacts.delete',
      'organizations',
      'patients','patients.create','patients.edit','patients.delete',
      'appointments','appointments.create','appointments.edit','appointments.delete',
      'consultations','consultations.create','consultations.edit',
      'tasks','billing','automation',
      'settings','settings.organization','settings.users','settings.roles',
      'settings.doctors','settings.departments','settings.tags',
      'settings.modules','settings.services','settings.rules',
      'settings.configuration','settings.logs',
    ],
  },
  {
    name: 'Doctor',
    description: 'Clinical care — patients, appointments, consultations',
    permissions: [
      'dashboard','notifications',
      'patients','patients.create','patients.edit',
      'appointments','appointments.create','appointments.edit',
      'consultations','consultations.create','consultations.edit',
      'tasks',
    ],
  },
  {
    name: 'Staff',
    description: 'General staff — leads, contacts, patients, appointments',
    permissions: [
      'dashboard','notifications',
      'leads','leads.create','leads.edit',
      'contacts','contacts.create','contacts.edit',
      'patients','patients.create',
      'appointments','appointments.create','appointments.edit',
      'tasks',
    ],
  },
]

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireAuth() {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  return user
}

// ─── GET /api/admin/roles?orgId=XXX ─────────────────────────────────────────
export async function GET(req) {
  const user = await requireAuth()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return json({ error: 'orgId required' }, 400)

  const client = adminClient()

  let { data: roles } = await client
    .from('roles')
    .select(`
      id, name, description,
      role_permissions ( permissions ( name ) )
    `)
    .eq('organization_id', orgId)
    .order('name')

  // Seed defaults if org has no roles yet
  if (!roles || roles.length === 0) {
    const { data: allPerms } = await client.from('permissions').select('id, name')
    const permMap = Object.fromEntries((allPerms || []).map(p => [p.name, p.id]))

    for (const roleDef of DEFAULT_ROLES) {
      const { data: newRole } = await client
        .from('roles')
        .insert({ organization_id: orgId, name: roleDef.name, description: roleDef.description })
        .select('id')
        .single()

      if (newRole) {
        const links = roleDef.permissions
          .filter(p => permMap[p])
          .map(p => ({ role_id: newRole.id, permission_id: permMap[p] }))
        if (links.length) await client.from('role_permissions').insert(links)
      }
    }

    const { data: seeded } = await client
      .from('roles')
      .select(`
        id, name, description,
        role_permissions ( permissions ( name ) )
      `)
      .eq('organization_id', orgId)
      .order('name')
    roles = seeded || []
  }

  // Flatten permissions into a simple string array per role
  const shaped = (roles || []).map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: (r.role_permissions || []).map(rp => rp.permissions?.name).filter(Boolean),
  }))

  // Also return the full permission catalog
  const { data: allPerms } = await client.from('permissions').select('id, name').order('name')

  return json({ roles: shaped, allPermissions: (allPerms || []).map(p => p.name) })
}

// ─── POST /api/admin/roles — create a new role ───────────────────────────────
export async function POST(req) {
  const user = await requireAuth()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { orgId, name, description = '', permissions = [] } = await req.json()
  if (!orgId || !name?.trim()) return json({ error: 'orgId and name are required' }, 400)

  const client = adminClient()

  const { data: newRole, error: insertError } = await client
    .from('roles')
    .insert({ organization_id: orgId, name: name.trim(), description: description.trim() })
    .select('id')
    .single()

  if (insertError) return json({ error: insertError.message }, 400)

  if (permissions.length > 0) {
    const { data: allPerms } = await client.from('permissions').select('id, name')
    const permMap = Object.fromEntries((allPerms || []).map(p => [p.name, p.id]))
    const links = permissions.filter(p => permMap[p]).map(p => ({ role_id: newRole.id, permission_id: permMap[p] }))
    if (links.length) await client.from('role_permissions').insert(links)
  }

  return json({ role: { id: newRole.id, name: name.trim(), description: description.trim(), permissions } })
}

// ─── PATCH /api/admin/roles — update name / description / permissions ────────
export async function PATCH(req) {
  const user = await requireAuth()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { roleId, name, description, permissions } = await req.json()
  if (!roleId) return json({ error: 'roleId is required' }, 400)

  const client = adminClient()

  // Update name/description
  if (name !== undefined || description !== undefined) {
    const updates = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description.trim()
    const { error } = await client.from('roles').update(updates).eq('id', roleId)
    if (error) return json({ error: error.message }, 400)
  }

  // Replace permissions
  if (permissions !== undefined) {
    await client.from('role_permissions').delete().eq('role_id', roleId)

    if (permissions.length > 0) {
      const { data: allPerms } = await client.from('permissions').select('id, name')
      const permMap = Object.fromEntries((allPerms || []).map(p => [p.name, p.id]))
      const links = permissions.filter(p => permMap[p]).map(p => ({ role_id: roleId, permission_id: permMap[p] }))
      if (links.length) await client.from('role_permissions').insert(links)
    }
  }

  return json({ ok: true })
}

// ─── DELETE /api/admin/roles — delete a role ─────────────────────────────────
export async function DELETE(req) {
  const user = await requireAuth()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { roleId, orgId } = await req.json()
  if (!roleId) return json({ error: 'roleId is required' }, 400)

  const client = adminClient()

  // Check if any users are currently assigned this role
  const { count } = await client
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId)

  if (count && count > 0) {
    return json({ error: `Cannot delete: ${count} team member(s) are assigned this role. Reassign them first.` }, 400)
  }

  await client.from('role_permissions').delete().eq('role_id', roleId)
  const { error } = await client.from('roles').delete().eq('id', roleId)
  if (error) return json({ error: error.message }, 400)

  return json({ ok: true })
}
