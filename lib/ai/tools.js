// SERVER-ONLY. Read-only tool registry for the Zeo agent (v1).
//
// Two halves:
//   - TOOL_SCHEMAS: JSON-schema tool definitions sent to the model.
//   - runTool(name, args, { db, orgId }): executes a tool server-side.
//
// Every executor is HARD-SCOPED with .eq('organization_id', orgId). The orgId
// is resolved from the authenticated session by the route — never taken from
// the model's arguments — so the agent can only ever read the caller's tenant.
//
// v1 is read-only: there are no create/update/delete tools here by design.

const MAX_ROWS = 25

// Strip characters that would break a PostgREST .or() / .ilike() filter.
function sanitize(q) {
  return String(q || '').replace(/[,()%]/g, ' ').trim()
}

const fullName = (r) => [r.first_name, r.last_name].filter(Boolean).join(' ').trim()

// ── Executors ───────────────────────────────────────────────────────────────

async function searchPatients(args, { db, orgId }) {
  const q = sanitize(args.query)
  let query = db
    .from('patients')
    .select('id, patient_code, first_name, last_name, phone, email, status, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS)
  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,patient_code.ilike.%${q}%,email.ilike.%${q}%`
    )
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return {
    count: data.length,
    patients: data.map((r) => ({
      id: r.id,
      patient_code: r.patient_code,
      name: fullName(r),
      phone: r.phone,
      email: r.email,
      status: r.status,
    })),
  }
}

async function getPatient(args, { db, orgId }) {
  const id = sanitize(args.identifier)
  if (!id) return { error: 'identifier is required' }
  // Accept either a patient_code or a UUID id.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  let query = db
    .from('patients')
    .select('*, leads(id, title, stage, priority, value), appointments(id, appointment_code, scheduled_at, status), invoices(id, status, total)')
    .eq('organization_id', orgId)
    .limit(1)
  query = isUuid ? query.eq('id', id) : query.eq('patient_code', id)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return { found: false }
  return {
    found: true,
    patient: {
      id: data.id,
      patient_code: data.patient_code,
      name: fullName(data),
      phone: data.phone,
      email: data.email,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      address: data.address,
      status: data.status,
      medical_history: data.medical_history,
      leads: data.leads || [],
      appointments: data.appointments || [],
      invoices: data.invoices || [],
    },
  }
}

async function searchLeads(args, { db, orgId }) {
  const q = sanitize(args.query)
  let query = db
    .from('leads')
    .select('id, title, stage, priority, value, currency, source, first_name, last_name, phone, email, expected_close_date, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS)
  if (args.stage) query = query.eq('stage', args.stage)
  if (args.priority) query = query.eq('priority', args.priority)
  if (q) {
    query = query.or(
      `title.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`
    )
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return {
    count: data.length,
    leads: data.map((r) => ({
      id: r.id,
      title: r.title,
      contact: fullName(r) || null,
      phone: r.phone,
      stage: r.stage,
      priority: r.priority,
      value: r.value,
      currency: r.currency,
      source: r.source,
      expected_close_date: r.expected_close_date,
    })),
  }
}

async function listAppointments(args, { db, orgId }) {
  let query = db
    .from('appointments')
    .select('id, appointment_code, scheduled_at, duration_minutes, status, notes, patients(first_name, last_name, patient_code)')
    .eq('organization_id', orgId)
    .order('scheduled_at', { ascending: true })
    .limit(MAX_ROWS)
  if (args.status) query = query.eq('status', args.status)
  if (args.from) query = query.gte('scheduled_at', args.from)
  if (args.to) query = query.lte('scheduled_at', args.to)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return {
    count: data.length,
    appointments: data.map((r) => ({
      id: r.id,
      appointment_code: r.appointment_code,
      scheduled_at: r.scheduled_at,
      duration_minutes: r.duration_minutes,
      status: r.status,
      patient: r.patients ? fullName(r.patients) : null,
      patient_code: r.patients?.patient_code || null,
    })),
  }
}

async function listTasks(args, { db, orgId }) {
  let query = db
    .from('tasks')
    .select('id, title, description, entity_type, due_date, priority, status, created_at')
    .eq('organization_id', orgId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(MAX_ROWS)
  if (args.status) query = query.eq('status', args.status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return { count: data.length, tasks: data }
}

async function listFollowups(args, { db, orgId }) {
  let query = db
    .from('followups')
    .select('id, type, scheduled_at, caller_name, notes, outcome, status, leads(title), patients(first_name, last_name)')
    .eq('organization_id', orgId)
    .order('scheduled_at', { ascending: true })
    .limit(MAX_ROWS)
  if (args.status) query = query.eq('status', args.status)
  if (args.overdue) {
    query = query.lt('scheduled_at', new Date().toISOString()).eq('status', 'Scheduled')
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return {
    count: data.length,
    followups: data.map((r) => ({
      id: r.id,
      type: r.type,
      scheduled_at: r.scheduled_at,
      status: r.status,
      caller_name: r.caller_name,
      notes: r.notes,
      outcome: r.outcome,
      lead: r.leads?.title || null,
      patient: r.patients ? fullName(r.patients) : null,
    })),
  }
}

async function getDashboardStats(args, { db, orgId }) {
  const from = args.from || null
  const to = args.to || null
  const scoped = (table) => {
    let q = db.from(table).select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    return q
  }
  // Total patients & leads (all-time).
  const [{ count: totalPatients }, { count: totalLeads }] = await Promise.all([
    scoped('patients'),
    scoped('leads'),
  ])

  // Leads grouped by stage (fetch stages, tally in JS — small per-org volumes).
  let leadStageQ = db.from('leads').select('stage, created_at').eq('organization_id', orgId)
  if (from) leadStageQ = leadStageQ.gte('created_at', from)
  if (to) leadStageQ = leadStageQ.lte('created_at', to)
  const { data: leadRows, error: leadErr } = await leadStageQ
  if (leadErr) throw new Error(leadErr.message)
  const byStage = {}
  for (const r of leadRows) byStage[r.stage] = (byStage[r.stage] || 0) + 1

  // Overdue follow-ups.
  const { count: overdueFollowups } = await db
    .from('followups')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'Scheduled')
    .lt('scheduled_at', new Date().toISOString())

  // Upcoming appointments (next, from now).
  const { count: upcomingAppointments } = await db
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('scheduled_at', new Date().toISOString())
    .in('status', ['booked', 'confirmed'])

  return {
    range: { from, to },
    total_patients: totalPatients ?? 0,
    total_leads: totalLeads ?? 0,
    leads_in_range: leadRows.length,
    leads_by_stage: byStage,
    converted_in_range: byStage['Converted'] || 0,
    overdue_followups: overdueFollowups ?? 0,
    upcoming_appointments: upcomingAppointments ?? 0,
  }
}

// ── Registry ─────────────────────────────────────────────────────────────────

const EXECUTORS = {
  search_patients: searchPatients,
  get_patient: getPatient,
  search_leads: searchLeads,
  list_appointments: listAppointments,
  list_tasks: listTasks,
  list_followups: listFollowups,
  get_dashboard_stats: getDashboardStats,
}

export const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'search_patients',
      description: 'Search patients by name, phone, email, or patient code. Returns a list of matching patients. Leave query empty to list recent patients.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Name, phone, email, or patient code to search for.' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient',
      description: 'Get full details for one patient (including their leads, appointments, and invoices) by patient code (e.g. PT1) or id.',
      parameters: {
        type: 'object',
        properties: { identifier: { type: 'string', description: 'The patient code (e.g. PT1) or UUID id.' } },
        required: ['identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_leads',
      description: 'Search/list leads, optionally filtered by stage and priority.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text to match in title, contact name, phone, or email.' },
          stage: { type: 'string', enum: ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost'] },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_appointments',
      description: 'List appointments, optionally filtered by status and a scheduled_at date range (ISO 8601).',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['booked', 'confirmed', 'completed', 'cancelled'] },
          from: { type: 'string', description: 'ISO datetime lower bound for scheduled_at.' },
          to: { type: 'string', description: 'ISO datetime upper bound for scheduled_at.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List tasks, optionally filtered by status.',
      parameters: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'] } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_followups',
      description: 'List follow-ups. Set overdue=true to get only scheduled follow-ups whose time has passed.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['Scheduled', 'Completed', 'Missed', 'Rescheduled'] },
          overdue: { type: 'boolean', description: 'If true, only overdue (past-due & still Scheduled) follow-ups.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_stats',
      description: 'Get aggregate CRM stats: total patients/leads, leads by stage, conversions, overdue follow-ups, upcoming appointments. Optional ISO date range applies to lead counts.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'ISO date lower bound for the range.' },
          to: { type: 'string', description: 'ISO date upper bound for the range.' },
        },
      },
    },
  },
]

export async function runTool(name, args, ctx) {
  const fn = EXECUTORS[name]
  if (!fn) return { error: `Unknown tool: ${name}` }
  try {
    return await fn(args || {}, ctx)
  } catch (err) {
    // Return the error to the model as a tool result rather than throwing —
    // it can explain the failure or try a different approach.
    return { error: err?.message || 'Tool execution failed' }
  }
}
