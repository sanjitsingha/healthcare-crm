import { supabase } from './client'

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

// ── Contacts ───────────────────────────────────────────────────
export async function getContacts({ search = '', orgId = '' } = {}) {
  let q = supabase
    .from('contacts')
    .select('*, organizations(id, name)')
    .order('created_at', { ascending: false })
  if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  if (orgId) q = q.eq('organization_id', orgId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getContact(id) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, organizations(id, name, type), leads(*)')
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
export async function getLeads({ search = '', stage = '', priority = '' } = {}) {
  let q = supabase
    .from('leads')
    .select('*, contacts(id, first_name, last_name, email), organizations(id, name)')
    .order('created_at', { ascending: false })
  if (search) q = q.ilike('title', `%${search}%`)
  if (stage) q = q.eq('stage', stage)
  if (priority) q = q.eq('priority', priority)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getLead(id) {
  const { data, error } = await supabase
    .from('leads')
    .select('*, contacts(id, first_name, last_name, email, phone), organizations(id, name, type)')
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

// ── Activities ─────────────────────────────────────────────────
export async function getActivities(entityType, entityId) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
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
export async function getTasks({ entityType = '', entityId = '', status = '' } = {}) {
  let q = supabase.from('tasks').select('*').order('due_date', { ascending: true })
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
export async function getFollowups({ leadId = '', status = '' } = {}) {
  let q = supabase
    .from('followups')
    .select('*, leads(id, title), contacts(id, first_name, last_name)')
    .order('scheduled_at', { ascending: true })
  if (leadId) q = q.eq('lead_id', leadId)
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

// ── Dashboard Stats ────────────────────────────────────────────
export async function getDashboardStats() {
  const [
    { count: totalLeads },
    { count: wonLeads },
    { count: totalContacts },
    { count: totalOrgs },
    { count: pendingTasks },
    { count: upcomingFollowups },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('stage', 'Won'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('followups').select('*', { count: 'exact', head: true }).eq('status', 'Scheduled'),
  ])

  const { data: valueData } = await supabase
    .from('leads')
    .select('value')
    .eq('stage', 'Won')

  const totalValue = valueData?.reduce((sum, l) => sum + (l.value || 0), 0) || 0

  const { data: stageData } = await supabase
    .from('leads')
    .select('stage')

  const stageCounts = {}
  stageData?.forEach(l => {
    stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1
  })

  return {
    totalLeads: totalLeads || 0,
    wonLeads: wonLeads || 0,
    totalContacts: totalContacts || 0,
    totalOrgs: totalOrgs || 0,
    pendingTasks: pendingTasks || 0,
    upcomingFollowups: upcomingFollowups || 0,
    totalValue,
    stageCounts,
    conversionRate: totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0,
  }
}
