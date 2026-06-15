import { supabase } from './client'
import { buildPatientCode, DEFAULT_PHARMACY_ID_FORMAT, DEFAULT_PHARMACY_INVOICE_FORMAT } from '../patientId'
import { logAudit, AUDIT } from '../audit'

const getOrgId = () => null

// Audit a deletion attempt (success or failure) for any entity type.
const logDelete = (entityType, id, error) =>
  logAudit({
    action: AUDIT.RECORD_DELETE,
    entityType,
    entityId: id,
    description: error ? `${entityType} deletion failed: ${error.message}` : `Deleted ${entityType} record`,
    status: error ? 'failed' : 'success',
  })

// ── Organizations ──────────────────────────────────────────────
export async function getOrganizations({ search = '', status = '' } = {}) {
  let q = supabase.from('organizations').select('*').order('created_at', { ascending: false })
  if (search) q = q.ilike('name', `%${search}%`)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getOrganization(id) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*, contacts(*), leads(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createOrganization(org) {
  const { data, error } = await supabase.from('organizations').insert(org).select().single()
  if (error) throw error
  return data
}

export async function updateOrganization(id, updates) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteOrganization(id) {
  const { error } = await supabase.from('organizations').delete().eq('id', id)
  await logDelete('organization', id, error)
  if (error) throw error
}

// ── Branches ───────────────────────────────────────────────────
export async function getBranches(orgId = getOrgId()) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')
  if (error) throw error
  return data
}

export async function createBranch(branch) {
  const { data, error } = await supabase.from('branches').insert(branch).select().single()
  if (error) throw error
  return data
}

// ── RBAC ───────────────────────────────────────────────────────
export async function getRoles(orgId = getOrgId()) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('roles')
    .select('*, permissions:role_permissions(permissions(*))')
    .eq('organization_id', orgId)
  if (error) throw error
  return data
}

export async function getPermissions() {
  const { data, error } = await supabase.from('permissions').select('*')
  if (error) throw error
  return data
}

// ── Patients ───────────────────────────────────────────────────
export async function getPatients({ search = '', orgId = getOrgId() } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('patients')
    .select('*, tags:patient_tags(tags(*))')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getPatient(id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*, leads(*), appointments(*), invoices(*), tags:patient_tags(tags(*))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createPatient(patient) {
  let code = patient.patient_code || null
  let nextSettings = null

  // Auto-generate a patient code from the org's configured ID format.
  // Runs for every create path (manual entry + lead→patient conversion).
  if (!code && patient.organization_id) {
    try {
      const { data: orgRow } = await supabase
        .from('organizations').select('settings').eq('id', patient.organization_id).single()
      const cfg = orgRow?.settings?.patient_id_format
      if (cfg?.enabled) {
        const seq = Number(cfg.next_seq) || 1
        code = buildPatientCode(cfg, seq)
        if (code) nextSettings = { ...orgRow.settings, patient_id_format: { ...cfg, next_seq: seq + 1 } }
      }
    } catch { /* ignore — fall back to no code */ }
  }

  const payload = { ...patient, patient_code: code }
  let { data, error } = await supabase.from('patients').insert(payload).select().single()

  // If the patient_code column doesn't exist yet on the DB, don't block the
  // patient from being created — retry without it. (Apply the migration to
  // enable auto IDs: alter table patients add column if not exists patient_code text;)
  if (error && /patient_code/i.test(error.message || '')) {
    const { patient_code, ...rest } = payload
    ;({ data, error } = await supabase.from('patients').insert(rest).select().single())
    nextSettings = null // don't burn a sequence number we couldn't store
  }
  if (error) throw error

  // Bump the sequence counter for next time
  if (nextSettings) {
    try { await supabase.from('organizations').update({ settings: nextSettings }).eq('id', patient.organization_id) } catch {}
  }
  return data
}

export async function updatePatient(id, updates) {
  const { data, error } = await supabase
    .from('patients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  logAudit({
    action: AUDIT.PATIENT_EDIT,
    entityType: 'patient',
    entityId: id,
    description: 'Edited patient record',
    metadata: { fields: Object.keys(updates || {}) },
  })
  return data
}

export async function deletePatient(id) {
  const { error } = await supabase.from('patients').delete().eq('id', id)
  await logAudit({
    action: AUDIT.RECORD_DELETE,
    entityType: 'patient',
    entityId: id,
    description: error ? `Patient deletion failed: ${error.message}` : 'Deleted patient record',
    status: error ? 'failed' : 'success',
  })
  if (error) throw error
}

// ── Contacts ───────────────────────────────────────────────────
export async function getContacts({ search = '', orgId = getOrgId() } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('contacts')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getContact(id) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, leads(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createContact(contact) {
  const { data, error } = await supabase.from('contacts').insert(contact).select().single()
  if (error) throw error
  return data
}

export async function updateContact(id, updates) {
  const { data, error } = await supabase
    .from('contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContact(id) {
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  await logDelete('contact', id, error)
  if (error) throw error
}

// ── Leads ──────────────────────────────────────────────────────
export async function getLeads({ search = '', stage = '', priority = '', orgId = getOrgId() } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('leads')
    .select('*, contacts(id, first_name, last_name, email, phone), patients(id, first_name, last_name, phone, email, gender, address, patient_code), tags:lead_tags(tags(*))')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getLead(id) {
  const { data, error } = await supabase
    .from('leads')
    .select('*, contacts(id, first_name, last_name, email, phone), patients(id, first_name, last_name, phone, email, gender, date_of_birth, address), tags:lead_tags(tags(*))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createLead(lead) {
  const { data, error } = await supabase.from('leads').insert(lead).select().single()
  if (error) throw error
  return data
}

export async function updateLead(id, updates) {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  await logDelete('lead', id, error)
  if (error) throw error
}

// ── Tags ───────────────────────────────────────────────────────
export async function getTags(orgId = getOrgId(), page = '') {
  if (!orgId) return []
  let q = supabase
    .from('tags')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')

  if (page) q = q.eq('page', page)

  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createTag(tag) {
  const { data, error } = await supabase.from('tags').insert(tag).select().single()
  if (error) throw error
  return data
}

export async function deleteTag(id) {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw error
}

export async function assignTagToPatient(patientId, tagId) {
  const { data, error } = await supabase.from('patient_tags').insert({ patient_id: patientId, tag_id: tagId }).select().single()
  if (error) throw error
  return data
}

export async function removeTagFromPatient(patientId, tagId) {
  const { error } = await supabase
    .from('patient_tags')
    .delete()
    .eq('patient_id', patientId)
    .eq('tag_id', tagId)
  if (error) throw error
}

export async function assignTagToLead(leadId, tagId) {
  const { data, error } = await supabase.from('lead_tags').insert({ lead_id: leadId, tag_id: tagId }).select().single()
  if (error) throw error
  return data
}

export async function removeTagFromLead(leadId, tagId) {
  const { error } = await supabase
    .from('lead_tags')
    .delete()
    .eq('lead_id', leadId)
    .eq('tag_id', tagId)
  if (error) throw error
}

// ── Activities ─────────────────────────────────────────────────
export async function getActivities(entityType, entityId, orgId = getOrgId()) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('organization_id', orgId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createActivity(activity) {
  const { data, error } = await supabase.from('activities').insert(activity).select().single()
  if (error) throw error
  return data
}

// Unified person timeline: every activity for a patient + its linked leads
// (or a standalone lead), newest first. Used identically by the Lead, Patient,
// and Consultation pages so the timeline stays in sync everywhere. Each row
// keeps its `source_page`, so the UI can tag it [Lead Page] / [Patient Page] /
// [Consultation Page].
export async function getPersonTimeline({ patientId = null, leadIds = [], orgId = getOrgId() } = {}) {
  if (!orgId) return []
  const sources = []
  if (patientId) sources.push(getActivities('patient', patientId, orgId))
  for (const lid of leadIds) sources.push(getActivities('lead', lid, orgId))
  const lists = await Promise.all(sources)
  // Drop the redundant lead-side "converted to patient" line — the patient
  // carries its own "Converted from lead" entry, so the journey reads once.
  const allActs = lists.flat()
    .filter(a => !(patientId && /converted to patient/i.test(a.content || '')))

  // Inject a synthetic "Patient Created" entry when the patient was created
  // directly (no lead journey) and has no logged creation activity.
  if (patientId) {
    const alreadyLogged = allActs.some(
      a => a.entity_id === patientId && /patient created/i.test(a.content || '')
    )
    if (!alreadyLogged) {
      const { data: patRow } = await supabase
        .from('patients')
        .select('created_at')
        .eq('id', patientId)
        .single()
      if (patRow) {
        allActs.push({
          id: `synthetic-patient-${patientId}`,
          type: 'note',
          content: 'Patient Created',
          created_at: patRow.created_at,
          entity_type: 'patient',
          entity_id: patientId,
          source_page: 'patient',
        })
      }
    }
  }

  // Inject a synthetic "Lead Created" entry for every lead that has no
  // logged creation activity. This ensures the creation moment is always
  // the last entry on the timeline on every page (Lead, Patient, Consultation).
  if (leadIds.length) {
    const { data: leadRows } = await supabase
      .from('leads')
      .select('id, created_at')
      .in('id', leadIds)
    for (const lead of (leadRows || [])) {
      const alreadyLogged = allActs.some(
        a => a.entity_id === lead.id && /lead created/i.test(a.content || '')
      )
      if (!alreadyLogged) {
        allActs.push({
          id: `synthetic-lead-${lead.id}`,
          type: 'note',
          content: 'Lead Created',
          created_at: lead.created_at,
          entity_type: 'lead',
          entity_id: lead.id,
          source_page: 'lead',
        })
      }
    }
  }

  return allActs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// ── Tasks ──────────────────────────────────────────────────────
export async function getTasks({ entityType = '', entityId = '', status = '', orgId = getOrgId() } = {}) {
  if (!orgId) return []
  let q = supabase.from('tasks').select('*').eq('organization_id', orgId).order('due_date', { ascending: true })
  if (entityType) q = q.eq('entity_type', entityType)
  if (entityId) q = q.eq('entity_id', entityId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createTask(task) {
  const { data, error } = await supabase.from('tasks').insert(task).select().single()
  if (error) throw error
  return data
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  await logDelete('task', id, error)
  if (error) throw error
}

// ── Follow-ups ─────────────────────────────────────────────────
export async function getFollowups({ leadId = '', patientId = '', status = '', orgId = getOrgId() } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('followups')
    .select('*, leads(id, title), patients(id, first_name, last_name)')
    .eq('organization_id', orgId)
    .order('scheduled_at', { ascending: true })
  if (leadId) q = q.eq('lead_id', leadId)
  if (patientId) q = q.eq('patient_id', patientId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createFollowup(followup) {
  const { data, error } = await supabase.from('followups').insert(followup).select().single()
  if (error) throw error
  return data
}

export async function updateFollowup(id, updates) {
  const { data, error } = await supabase
    .from('followups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFollowup(id) {
  const { error } = await supabase.from('followups').delete().eq('id', id)
  if (error) throw error
}

// ── Appointments ───────────────────────────────────────────────
export async function getAppointments({ orgId = getOrgId(), status = '' } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('appointments')
    .select('*, patients(id, first_name, last_name), leads(id, title)')
    .eq('organization_id', orgId)
    .order('scheduled_at', { ascending: true })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createAppointment(appointment) {
  const { data, error } = await supabase.from('appointments').insert(appointment).select().single()
  if (error) throw error
  return data
}

export async function updateAppointment(id, updates) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAppointment(id) {
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  await logDelete('appointment', id, error)
  if (error) throw error
}

// ── Tickets ────────────────────────────────────────────────────
export async function getTickets({ orgId = getOrgId(), status = '' } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('tickets')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createTicket(ticket) {
  const { data, error } = await supabase.from('tickets').insert(ticket).select().single()
  if (error) throw error
  return data
}

export async function updateTicket(id, updates) {
  const { data, error } = await supabase
    .from('tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function deleteTicket(id) {
  const { error } = await supabase.from('tickets').delete().eq('id', id)
  await logDelete('ticket', id, error)
  if (error) throw error
}

// ── Consultations ──────────────────────────────────────────────
export async function getConsultations({ orgId = getOrgId(), patientId = '', leadId = '', status = '' } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('consultations')
    .select('*, patients(id, first_name, last_name), leads(id, title, first_name, last_name)')
    .eq('organization_id', orgId)
    .order('consulted_at', { ascending: false })
  if (patientId) q = q.eq('patient_id', patientId)
  if (leadId)    q = q.eq('lead_id', leadId)
  if (status)    q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createConsultation(consultation) {
  const { data, error } = await supabase.from('consultations').insert(consultation).select().single()
  if (error) throw error
  return data
}

export async function updateConsultation(id, updates) {
  const { data, error } = await supabase
    .from('consultations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function deleteConsultation(id) {
  const { error } = await supabase.from('consultations').delete().eq('id', id)
  await logDelete('consultation', id, error)
  if (error) throw error
}

// ── Billing ────────────────────────────────────────────────────
export async function getInvoices({ orgId = getOrgId() } = {}) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('invoices')
    .select('*, patients(id, first_name, last_name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createInvoice(invoice) {
  const { data, error } = await supabase.from('invoices').insert(invoice).select().single()
  if (error) throw error
  return data
}

export async function getPayments({ orgId = getOrgId() } = {}) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('payments')
    .select('*, invoices(*)')
    .eq('organization_id', orgId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createPayment(payment) {
  const { data, error } = await supabase.from('payments').insert(payment).select().single()
  if (error) throw error
  return data
}

// ── Notifications ──────────────────────────────────────────────
export async function getNotifications({ orgId = getOrgId(), limit = 200 } = {}) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function createNotification(n) {
  const { data, error } = await supabase.from('notifications').insert(n).select().single()
  if (error) throw error
  return data
}

// ── Org Members (requires teammate-visibility RLS policy in schema) ──
export async function getOrgMembers({ orgId = getOrgId() } = {}) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Automation ─────────────────────────────────────────────────
export async function getAutomationRules(orgId = getOrgId()) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('organization_id', orgId)
  if (error) throw error
  return data
}

export async function createAutomationRule(rule) {
  const { data, error } = await supabase.from('automation_rules').insert(rule).select().single()
  if (error) throw error
  return data
}

export async function updateAutomationRule(id, updates) {
  const { data, error } = await supabase
    .from('automation_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function deleteAutomationRule(id) {
  const { error } = await supabase.from('automation_rules').delete().eq('id', id)
  if (error) throw error
}

// ── Audit Logs ─────────────────────────────────────────────────
export async function getAuditLogs({ orgId = getOrgId(), action = '', entityType = '', search = '', limit = 100, offset = 0 } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('audit_logs')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (action)     q = q.eq('action', action)
  if (entityType) q = q.eq('entity_type', entityType)
  const { data, error } = await q
  if (error) throw error
  let rows = data || []
  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter(r =>
      [r.actor_name, r.actor_email, r.description, r.action, r.entity_type]
        .some(v => (v || '').toLowerCase().includes(s)))
  }
  return rows
}

// ── Dashboard Stats ────────────────────────────────────────────
export async function getDashboardStats(orgId = getOrgId()) {
  if (!orgId) return { totalLeads: 0, wonLeads: 0, totalContacts: 0, totalPatients: 0, pendingTasks: 0, upcomingFollowups: 0, totalValue: 0, stageCounts: {}, conversionRate: 0 }

  const [
    { count: totalLeads },
    { count: wonLeads },
    { count: totalContacts },
    { count: totalPatients },
    { count: pendingTasks },
    { count: upcomingFollowups },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('stage', 'Converted'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'Pending'),
    supabase.from('followups').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'Scheduled'),
  ])

  const { data: valueData } = await supabase
    .from('leads')
    .select('value')
    .eq('organization_id', orgId)
    .eq('stage', 'Converted')

  const totalValue = valueData?.reduce((sum, l) => sum + (l.value || 0), 0) || 0

  const { data: stageData } = await supabase
    .from('leads')
    .select('stage')
    .eq('organization_id', orgId)

  const stageCounts = {}
  stageData?.forEach(l => {
    stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1
  })

  return {
    totalLeads: totalLeads || 0,
    wonLeads: wonLeads || 0,
    totalContacts: totalContacts || 0,
    totalPatients: totalPatients || 0,
    pendingTasks: pendingTasks || 0,
    upcomingFollowups: upcomingFollowups || 0,
    totalValue,
    stageCounts,
    conversionRate: totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0,
  }
}

// ── Pharmacy inventory ─────────────────────────────────────────
export async function getPharmacyItems({ orgId = getOrgId() } = {}) {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('pharmacy_items')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getPharmacyItem(id) {
  const { data, error } = await supabase
    .from('pharmacy_items')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Preview the next auto Item ID without burning the sequence.
export async function peekPharmacyItemCode(orgId) {
  if (!orgId) return null
  const { data: orgRow } = await supabase
    .from('organizations').select('settings').eq('id', orgId).single()
  const cfg = orgRow?.settings?.pharmacy_item_id_format || DEFAULT_PHARMACY_ID_FORMAT
  if (!cfg?.enabled) return null
  return buildPatientCode(cfg, Number(cfg.next_seq) || 1)
}

export async function createPharmacyItem(item) {
  let code = item.item_code || null
  let nextSettings = null

  // Auto-generate an item code from the org's configured pharmacy ID format.
  if (!code && item.organization_id) {
    try {
      const { data: orgRow } = await supabase
        .from('organizations').select('settings').eq('id', item.organization_id).single()
      const cfg = orgRow?.settings?.pharmacy_item_id_format || DEFAULT_PHARMACY_ID_FORMAT
      if (cfg?.enabled) {
        const seq = Number(cfg.next_seq) || 1
        code = buildPatientCode(cfg, seq)
        if (code) nextSettings = { ...(orgRow?.settings || {}), pharmacy_item_id_format: { ...cfg, next_seq: seq + 1 } }
      }
    } catch { /* ignore — fall back to no code */ }
  }

  const { data, error } = await supabase
    .from('pharmacy_items')
    .insert({ ...item, item_code: code })
    .select()
    .single()
  if (error) throw error

  if (nextSettings) {
    try { await supabase.from('organizations').update({ settings: nextSettings }).eq('id', item.organization_id) } catch {}
  }
  return data
}

export async function updatePharmacyItem(id, updates) {
  const { data, error } = await supabase
    .from('pharmacy_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePharmacyItem(id) {
  const { error } = await supabase.from('pharmacy_items').delete().eq('id', id)
  await logDelete('pharmacy_item', id, error)
  if (error) throw error
}

// ── Pharmacy sales (POS) ───────────────────────────────────────
export async function getPharmacySales({ orgId = getOrgId(), status = '', limit = 100 } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('pharmacy_sales')
    .select('*, patients(id, first_name, last_name), pharmacy_sale_items(*)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getPharmacySale(id) {
  const { data, error } = await supabase
    .from('pharmacy_sales')
    .select('*, patients(id, first_name, last_name, patient_code, gender, date_of_birth, address, phone), pharmacy_sale_items(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function deletePharmacySale(id) {
  const { error } = await supabase.from('pharmacy_sales').delete().eq('id', id)
  await logDelete('pharmacy_sale', id, error)
  if (error) throw error
}

// Replace the line items for a sale (delete-then-insert)
async function writePharmacySaleItems(saleId, orgId, items = []) {
  await supabase.from('pharmacy_sale_items').delete().eq('sale_id', saleId)
  if (!items.length) return
  const rows = items.map(it => ({
    sale_id: saleId,
    organization_id: orgId,
    item_id: it.item_id || null,
    item_code: it.item_code || null,
    name: it.name || null,
    quantity: Number(it.quantity) || 0,
    unit_price: Number(it.unit_price) || 0,
    discount_percent: Number(it.discount_percent) || 0,
    tax_percent: Number(it.tax_percent) || 0,
    line_total: Number(it.line_total) || 0,
  }))
  const { error } = await supabase.from('pharmacy_sale_items').insert(rows)
  if (error) throw error
}

async function decrementPharmacyStock(items = []) {
  const withIds = items.filter(it => it.item_id)
  if (!withIds.length) return
  try {
    const ids = withIds.map(it => it.item_id)
    const { data: current } = await supabase.from('pharmacy_items').select('id, quantity').in('id', ids)
    const qtyMap = Object.fromEntries((current || []).map(r => [r.id, Number(r.quantity) || 0]))
    await Promise.all(withIds.map(it => {
      const next = Math.max(0, (qtyMap[it.item_id] ?? 0) - (Number(it.quantity) || 0))
      return supabase.from('pharmacy_items')
        .update({ quantity: next, updated_at: new Date().toISOString() })
        .eq('id', it.item_id)
    }))
  } catch { /* best-effort; sale already recorded */ }
}

// Save a sale as a draft or a completed bill.
//  - draft:     persists sale + items, no invoice number, no stock change
//  - completed: assigns an invoice number, decrements stock, bumps the sequence
// Pass `id` to update an existing draft (e.g. completing a saved draft).
export async function savePharmacySale({ id = null, sale, items = [], complete = false }) {
  const orgId = sale.organization_id
  const status = complete ? 'completed' : 'draft'
  let code = sale.sale_code || null
  let nextSettings = null

  // Assign an invoice number the first time a sale is completed
  if (complete && !code) {
    try {
      const { data: orgRow } = await supabase
        .from('organizations').select('settings').eq('id', orgId).single()
      const cfg = orgRow?.settings?.pharmacy_invoice_id_format || DEFAULT_PHARMACY_INVOICE_FORMAT
      if (cfg?.enabled) {
        const seq = Number(cfg.next_seq) || 1
        code = buildPatientCode(cfg, seq)
        if (code) nextSettings = { ...(orgRow?.settings || {}), pharmacy_invoice_id_format: { ...cfg, next_seq: seq + 1 } }
      }
    } catch { /* ignore — fall back to no code */ }
  }

  const payload = { ...sale, status }
  if (code) payload.sale_code = code

  let saleRow
  if (id) {
    const { data, error } = await supabase.from('pharmacy_sales').update(payload).eq('id', id).select().single()
    if (error) throw error
    saleRow = data
  } else {
    const { data, error } = await supabase.from('pharmacy_sales').insert(payload).select().single()
    if (error) throw error
    saleRow = data
  }

  await writePharmacySaleItems(saleRow.id, orgId, items)
  if (complete) await decrementPharmacyStock(items)
  if (nextSettings) {
    try { await supabase.from('organizations').update({ settings: nextSettings }).eq('id', orgId) } catch {}
  }
  return saleRow
}
