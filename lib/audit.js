import { supabase } from './supabase/client'
import { parseDevice } from './device'
import { getPreciseLocation } from './location'

// ── Canonical audit action keys ─────────────────────────────────
// Surfaced in Settings → Logs. Keep these stable — they're stored in the DB.
export const AUDIT = {
  // Auth
  LOGIN:             'login',
  LOGOUT:            'logout',
  // Navigation (auto-logged by PageViewLogger)
  PAGE_VIEW:         'page_view',
  // Patients
  PATIENT_VIEW:      'patient_view',
  PATIENT_EDIT:      'patient_edit',
  // Leads
  LEAD_VIEW:         'lead_view',
  LEAD_EDIT:         'lead_edit',
  LEAD_CREATE:       'lead_create',
  // Records
  RECORD_DELETE:     'record_delete',
  // Appointments
  APPOINTMENT_VIEW:  'appointment_view',
  // Users & permissions
  USER_CREATE:       'user_create',
  PERMISSION_CHANGE: 'permission_change',
  // Settings
  SETTINGS_CHANGE:   'settings_change',
  MODULE_CHANGE:     'module_change',
  // Data
  DATA_EXPORT:       'data_export',
}

// Device + IP are stable for the session — cache them.
// Location is NOT cached here so that granting geo permission mid-session takes effect.
let _stable = null
async function getStableCtx() {
  if (typeof window === 'undefined') return {}
  if (_stable) return _stable

  const device = parseDevice(navigator.userAgent || '')
  let ip = null, ipLocation = null
  try {
    const r = await fetch('https://ipwho.is/')
    const d = await r.json()
    if (d?.success !== false) {
      ip = d.ip || null
      ipLocation = [d.city, d.region, d.country].filter(Boolean).join(', ') || null
    }
  } catch {}

  _stable = { device, ip, ipLocation }
  return _stable
}

// Builds the full context for an audit event.
// Precise geo location is preferred; falls back to IP-derived city.
async function getClientContext() {
  const [stable, preciseLocation] = await Promise.all([
    getStableCtx(),
    getPreciseLocation(),
  ])
  return {
    device:   stable.device,
    ip:       stable.ip,
    location: preciseLocation || stable.ipLocation || null,
  }
}

// Resolve the acting user + their org.
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

// Best-effort audit writer. NEVER throws.
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
    /* swallow — never block the caller */
  }
}
