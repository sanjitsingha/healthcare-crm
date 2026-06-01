import { supabase } from './client'

const getOrgId = () => null

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
    .select('*')
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
  const { data, error } = await supabase.from('patients').insert(patient).select().single()
  if (error) throw error
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
  return data
}

export async function deletePatient(id) {
  const { error } = await supabase.from('patients').delete().eq('id', id)
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
  if (error) throw error
}

// ── Leads ──────────────────────────────────────────────────────
export async function getLeads({ search = '', stage = '', priority = '', orgId = getOrgId() } = {}) {
  if (!orgId) return []
  let q = supabase
    .from('leads')
    .select('*, contacts(id, first_name, last_name, email, phone), patients(id, first_name, last_name, phone, email, gender, address)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getLead(id) {
  const { data, error } = await supabase
    .from('leads')
    .select('*, contacts(id, first_name, last_name, email, phone), patients(id, first_name, last_name, phone, email, gender, date_of_birth, address)')
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

export async function deleteAutomationRule(id) {
  const { error } = await supabase.from('automation_rules').delete().eq('id', id)
  if (error) throw error
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
