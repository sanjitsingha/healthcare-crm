// SERVER-ONLY. Shared auth + tenant resolution for /api/ai/* route handlers.
// Resolves the org from profiles.organization_id server-side (never from the
// request body) and loads the caller's permission set the same way the
// dashboard layout does.
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * @returns {Promise<{ user, orgId, orgName, isOwner, permissions, zeoAccess, db } | { error: string, status: number }>}
 */
export async function requireAgentContext() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.', status: 500 }
  }

  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: profile } = await serverClient
    .from('profiles')
    .select('organization_id, organizations(name)')
    .eq('id', user.id)
    .maybeSingle()

  const orgId = profile?.organization_id
  if (!orgId) return { error: 'No organization for this user', status: 400 }

  // Permission set: null (no user_roles row) === org owner === full access,
  // mirroring app/(dashboard)/layout.js.
  const { data: userRoleRow } = await serverClient
    .from('user_roles')
    .select('roles(name, role_permissions(permissions(name)))')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  const permissions = userRoleRow
    ? (userRoleRow.roles?.role_permissions || []).map((rp) => rp.permissions?.name).filter(Boolean)
    : null
  const isOwner = permissions === null

  return {
    user,
    orgId,
    orgName: profile?.organizations?.name || null,
    isOwner,
    permissions,
    zeoAccess: user.user_metadata?.zeo_access === true,
    db: createAdminClient(),
  }
}

// Admins (config screen) = org owner or anyone holding a settings-scoped permission.
export function canManageConfig(ctx) {
  if (ctx.isOwner) return true
  return (ctx.permissions || []).some((p) => p.startsWith('settings'))
}

// Zeo chat access = org owner, or a staff member explicitly granted zeo_access.
export function canUseZeo(ctx) {
  return ctx.isOwner || ctx.zeoAccess
}
