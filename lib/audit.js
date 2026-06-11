import { supabase } from './supabase/client'
import { parseDevice } from './device'
import { getPreciseLocation } from './location'

// ── Canonical audit action keys ─────────────────────────────────
// Surfaced in Settings → Logs. Keep these stable — they're stored in the DB.
export const AUDIT = {
  // Auth
  LOGIN:               'login',
  LOGOUT:              'logout',
  // Navigation (auto-logged by PageViewLogger)
  PAGE_VIEW:           'page_view',
  // Patients
  PATIENT_VIEW:        'patient_view',
  PATIENT_CREATE:      'patient_create',
  PATIENT_EDIT:        'patient_edit',
  // Leads
  LEAD_VIEW:           'lead_view',
  LEAD_CREATE:         'lead_create',
  LEAD_EDIT:           'lead_edit',
  LEAD_STAGE_CHANGE:   'lead_stage_change',
  LEAD_ASSIGN:         'lead_assign',
  LEAD_CONVERT:        'lead_convert',
  // Tags
  TAG_ADD:             'tag_add',
  TAG_REMOVE:          'tag_remove',
  // Tasks
  TASK_CREATE:         'task_create',
  TASK_UPDATE:         'task_update',
  // Follow-ups
  FOLLOWUP_CREATE:     'followup_create',
  FOLLOWUP_UPDATE:     'followup_update',
  // Appointments
  APPOINTMENT_CREATE:  'appointment_create',
  APPOINTMENT_UPDATE:  'appointment_update',
  // Consultations
  CONSULTATION_VIEW:   'consultation_view',
  CONSULTATION_CREATE: 'consultation_create',
  // Notes / comments
  NOTE_ADD:            'note_add',
  // Records
  RECORD_DELETE:       'record_delete',
  // Users & permissions
  USER_CREATE:         'user_create',
  PERMISSION_CHANGE:   'permission_change',
  // Settings
  SETTINGS_CHANGE:     'settings_change',
  MODULE_CHANGE:       'module_change',
  // Data
  DATA_EXPORT:         'data_export',
}

// Device + IP are stable for the session — cache them.
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
// `before` / `after` capture the relevant field values before and after an edit,
// stored in metadata so the Logs page can render a diff.
export async function logAudit({
  action,
  entityType  = null,
  entityId    = null,
  entityName  = null,   // human-readable name shown in the log row
  description = '',
  status      = 'success',
  before      = null,   // { field: oldValue, ... } — snapshot before change
  after       = null,   // { field: newValue, ... } — snapshot after change
  metadata    = {},
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
      actor_name:      actor.name   || null,
      actor_email:     actor.email  || null,
      action,
      entity_type:     entityType,
      entity_id:       entityId,
      description:     description || null,
      status,
      metadata: {
        ...ctx,
        ...(entityName ? { entity_name: entityName } : {}),
        ...(before     ? { before }                  : {}),
        ...(after      ? { after }                   : {}),
        ...metadata,
      },
    })
  } catch {
    /* swallow — never block the caller */
  }
}
