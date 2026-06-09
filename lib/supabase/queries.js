import { supabase } from './client'
import { buildPatientCode } from '../patientId'
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
    .select('*, contacts(id, first_name, last_name, email, phone), patients(id, first_name, last_name, phone, email, gender, address), tags:lead_tags(tags(*))')
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
export async function getAuditLogs({ orgId = getOrgId(), action = '', entityType = '', search = '', limit = 500 } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('audit_logs')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)
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
