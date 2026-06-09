import { supabase } from './supabase/client'
import { parseDevice } from './device'

// ── Canonical audit action keys ─────────────────────────────────
// Surfaced in Settings → Logs. Keep these stable — they're stored in the DB.
export const AUDIT = {
  LOGIN:             'login',
  LOGOUT:            'logout',
  PATIENT_VIEW:      'patient_view',
  PATIENT_EDIT:      'patient_edit',
  RECORD_DELETE:     'record_delete',
  USER_CREATE:       'user_create',
  PERMISSION_CHANGE: 'permission_change',
  DATA_EXPORT:       'data_export',
}

// Resolve device + IP + approximate location for the current client.
// Cached for the session so we don't hit the IP API on every event.
let _ctx = null
async function getClientContext() {
  if (typeof window === 'undefined') return {}
  if (_ctx) return _ctx
  try {
    const cached = sessionStorage.getItem('audit_ctx')
    if (cached) { _ctx = JSON.parse(cached); return _ctx }
  } catch { /* ignore */ }

  const device = parseDevice(navigator.userAgent || '')
  let ip = null, location = null
  try {
    const r = await fetch('https://ipwho.is/')
    const d = await r.json()
    if (d && d.success !== false) {
      ip = d.ip || null
      location = [d.city, d.region, d.country].filter(Boolean).join(', ') || null
    }
  } catch { /* offline / blocked — leave null */ }

  _ctx = { device, ip, location }
  try { sessionStorage.setItem('audit_ctx', JSON.stringify(_ctx)) } catch { /* ignore */ }
  return _ctx
}

// Resolve the acting user + their org. Reads the live session, so it works
// from anywhere (no need to thread orgId/user through props).
async function resolveActor() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single()
    return {
      userId: user.id,
      email:  user.email || null,
      name:   profile?.full_name || user.user_metadata?.full_name || user.email || null,
      orgId:  profile?.organization_id || null,
    }
  } catch {
    return null
  }
}

// Best-effort audit writer. NEVER throws — logging must not break the app.
// Captures device/IP/location into metadata. Pass `actor` to skip the session
// lookup (e.g. right before sign-out).
export async function logAudit({
  action,
  entityType = null,
  entityId = null,
  description = '',
  status = 'success',
  metadata = {},
  actor: actorOverride = null,
} = {}) {
  try {
    if (!action) return
    const [actor, ctx] = await Promise.all([
      actorOverride ? Promise.resolve(actorOverride) : resolveActor(),
      getClientContext(),
    ])
    if (!actor?.orgId) return
    await supabase.from('audit_logs').insert({
      organization_id: actor.orgId,
      user_id:         actor.userId || null,
      actor_name:      actor.name || null,
      actor_email:     actor.email || null,
      action,
      entity_type:     entityType,
      entity_id:       entityId,
      description:     description || null,
      status,
      metadata:        { ...ctx, ...metadata },
    })
  } catch {
    /* swallow — never block the caller on an audit write */
  }
}
