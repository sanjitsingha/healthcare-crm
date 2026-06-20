// ════════════════════════════════════════════════════════════════
// Shared automation engine — single source of truth for evaluating
// rule conditions and executing rule actions.
//
// Isomorphic: pass in ANY supabase-js client (anon on the client, or
// service-role admin on the server). All DB access goes through that
// client, so the same logic runs no matter who triggers an event.
//
// A rule (stored in org.settings.rules):
//   { id, name, enabled, target, event,
//     condition_match:'all'|'any', conditions:[{field,op,value}],
//     condition_groups:[{id,match:'all'|'any',conditions:[]}],
//     actions:[{type, value, ...extra}] }   // legacy single `action` supported
// ════════════════════════════════════════════════════════════════

// ── Field access ────────────────────────────────────────────────
// `field` may be a real column, or `custom:<api_name>` → custom_data.
function getFieldValue(entity, field) {
  if (!entity || !field) return undefined
  if (field.startsWith('custom:')) return entity.custom_data?.[field.slice(7)]
  return entity[field]
}

// ── Date helpers (support relative tokens: today, +3d, -7d, +2w/m/y) ─
function toDate(raw) {
  if (raw == null || raw === '') return null
  if (raw instanceof Date) return isNaN(raw) ? null : raw
  const s = String(raw).trim()
  const lower = s.toLowerCase()
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
  if (lower === 'today') return startOfToday()
  if (lower === 'tomorrow') { const d = startOfToday(); d.setDate(d.getDate() + 1); return d }
  if (lower === 'yesterday') { const d = startOfToday(); d.setDate(d.getDate() - 1); return d }
  const rel = lower.match(/^([+-]?\d+)\s*([dwmy])$/)
  if (rel) {
    const n = Number(rel[1]); const unit = rel[2]; const d = startOfToday()
    if (unit === 'd') d.setDate(d.getDate() + n)
    else if (unit === 'w') d.setDate(d.getDate() + n * 7)
    else if (unit === 'm') d.setMonth(d.getMonth() + n)
    else if (unit === 'y') d.setFullYear(d.getFullYear() + n)
    return d
  }
  // Only treat as a date if it actually looks date-ish (avoid "5" → 1970).
  if (!/[-/:]/.test(s) && !/^\d{4}$/.test(s)) return null
  const d = new Date(s)
  return isNaN(d) ? null : d
}

// Comparator that is date-aware, then numeric-aware, then string.
function cmp(a, b) {
  const da = toDate(a), db = toDate(b)
  if (da && db) return da.getTime() - db.getTime()
  const na = Number(a), nb = Number(b)
  if (a !== '' && b !== '' && !isNaN(na) && !isNaN(nb)) return na - nb
  return String(a ?? '').localeCompare(String(b ?? ''))
}

const looseEq = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
const isEmpty = (v) => v == null || String(v).trim() === ''

// ── Single condition ────────────────────────────────────────────
function evalCondition(entity, cond, prev) {
  if (!cond || !cond.field) return true
  const cur = getFieldValue(entity, cond.field)
  const target = cond.value
  switch (cond.op) {
    case 'is_empty':   return isEmpty(cur)
    case 'not_empty':  return !isEmpty(cur)
    case 'contains':   return String(cur ?? '').toLowerCase().includes(String(target ?? '').toLowerCase())
    case 'starts_with':return String(cur ?? '').toLowerCase().startsWith(String(target ?? '').toLowerCase())
    case 'in': {
      const list = String(target ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      return list.includes(String(cur ?? '').toLowerCase())
    }
    case 'between': {
      const [a, b] = String(target ?? '').split(/\.\.|,/).map(s => s.trim())
      if (a == null || b == null) return false
      return cmp(cur, a) >= 0 && cmp(cur, b) <= 0
    }
    case 'changed_to': {
      const was = prev ? getFieldValue(prev, cond.field) : undefined
      return looseEq(cur, target) && !looseEq(was, target)
    }
    case 'changed_from': {
      const was = prev ? getFieldValue(prev, cond.field) : undefined
      return looseEq(was, target) && !looseEq(cur, target)
    }
    case '>':  return cmp(cur, target) > 0
    case '<':  return cmp(cur, target) < 0
    case '!=': return !looseEq(cur, target)
    case '==':
    default:   return looseEq(cur, target)
  }
}

function conditionsMatch(entity, conditions = [], mode = 'all', prev) {
  if (!conditions.length) return true
  return mode === 'any'
    ? conditions.some(c => evalCondition(entity, c, prev))
    : conditions.every(c => evalCondition(entity, c, prev))
}

// Loose conditions AND every group (each group is internally all/any).
export function evaluateConditions(entity, rule, prev) {
  const looseMatch = conditionsMatch(entity, rule.conditions || [], rule.condition_match || 'all', prev)
  const groups = rule.condition_groups || []
  if (!groups.length) return looseMatch
  return looseMatch && groups.every(g => conditionsMatch(entity, g.conditions || [], g.match || 'all', prev))
}

export function ruleActions(rule) {
  if (Array.isArray(rule?.actions)) return rule.actions
  if (rule?.action) return [rule.action]
  return []
}

export function selectMatchingRules(rules, { target, event, entity, prev }) {
  return (rules || []).filter(
    r => r.enabled && r.target === target && r.event === event && evaluateConditions(entity, r, prev),
  )
}

// ── Entity linkage ──────────────────────────────────────────────
// Resolves the table to mutate + the lead/patient an activity/task hangs off.
function entityLinks(target, entity) {
  switch (target) {
    case 'lead':
      return { table: 'leads', leadId: entity.id, patientId: entity.patient_id || null }
    case 'patient':
      return { table: 'patients', leadId: null, patientId: entity.id }
    case 'appointment':
      return { table: 'appointments', leadId: entity.lead_id || null, patientId: entity.patient_id || null }
    case 'consultation':
      return { table: 'consultations', leadId: entity.lead_id || null, patientId: entity.patient_id || null }
    case 'task':
      return {
        table: 'tasks',
        leadId: entity.entity_type === 'lead' ? entity.entity_id : null,
        patientId: entity.entity_type === 'patient' ? entity.entity_id : null,
      }
    default:
      return { table: null, leadId: null, patientId: null }
  }
}

// Pick the best lead/patient anchor for activities & tasks (must be one of
// the two — the DB CHECK only allows 'lead' | 'patient').
function noteAnchor(links) {
  if (links.patientId) return { entity_type: 'patient', entity_id: links.patientId, source_page: 'patient' }
  if (links.leadId) return { entity_type: 'lead', entity_id: links.leadId, source_page: 'lead' }
  return null
}

const addDaysIso = (days) => {
  const d = new Date(); d.setDate(d.getDate() + Number(days || 0)); return d.toISOString()
}

// ── Action execution ────────────────────────────────────────────
// Returns { type, status:'success'|'skipped'|'failed', error?, detail? }.
async function executeAction(supabase, { rule, act, target, entity, links, orgId }) {
  const result = { type: act.type, status: 'skipped' }
  const onlyFor = (...targets) => targets.includes(target)
  const updateEntity = async (patch) => {
    const { error } = await supabase.from(links.table).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', entity.id)
    if (error) throw new Error(error.message)
  }

  try {
    switch (act.type) {
      case 'set_stage': {
        if (!onlyFor('lead') || !act.value) return result
        if (['Converted', 'Lost'].includes(entity.stage)) { result.detail = 'lead is in a terminal stage'; return result }
        if (looseEq(entity.stage, act.value)) { result.detail = 'already set'; return result }
        await updateEntity({ stage: act.value }); result.status = 'success'; result.detail = act.value; return result
      }
      case 'set_priority': {
        if (!onlyFor('lead') || !act.value || looseEq(entity.priority, act.value)) { result.detail = 'no change'; return result }
        await updateEntity({ priority: act.value }); result.status = 'success'; result.detail = act.value; return result
      }
      case 'set_source': {
        if (!onlyFor('lead') || !act.value || looseEq(entity.source, act.value)) { result.detail = 'no change'; return result }
        await updateEntity({ source: act.value }); result.status = 'success'; result.detail = act.value; return result
      }
      case 'set_value': {
        if (!onlyFor('lead') || act.value === '' || act.value == null) return result
        const n = Number(act.value)
        if (Number.isNaN(n) || n === Number(entity.value)) { result.detail = 'no change'; return result }
        await updateEntity({ value: n }); result.status = 'success'; result.detail = String(n); return result
      }
      case 'set_status': {
        if (!onlyFor('patient', 'appointment', 'consultation', 'task') || !act.value) return result
        if (looseEq(entity.status, act.value)) { result.detail = 'already set'; return result }
        await updateEntity({ status: act.value }); result.status = 'success'; result.detail = act.value; return result
      }
      case 'assign_to': {
        if (!onlyFor('lead', 'patient', 'task') || !act.value || entity.assigned_to === act.value) { result.detail = 'no change'; return result }
        await updateEntity({ assigned_to: act.value }); result.status = 'success'; return result
      }
      case 'add_tag':
      case 'remove_tag': {
        const isLead = !!links.leadId && (target === 'lead')
        const joinTable = isLead ? 'lead_tags' : 'patient_tags'
        const fk = isLead ? 'lead_id' : 'patient_id'
        const ownerId = isLead ? links.leadId : links.patientId
        if (!ownerId || !act.value) { result.detail = 'no lead/patient to tag'; return result }
        if (act.type === 'add_tag') {
          const { data: existing } = await supabase.from(joinTable).select('id').eq(fk, ownerId).eq('tag_id', act.value).maybeSingle()
          if (existing) { result.detail = 'already tagged'; return result }
          const { error } = await supabase.from(joinTable).insert({ [fk]: ownerId, tag_id: act.value })
          if (error) throw new Error(error.message)
        } else {
          const { error } = await supabase.from(joinTable).delete().eq(fk, ownerId).eq('tag_id', act.value)
          if (error) throw new Error(error.message)
        }
        result.status = 'success'; return result
      }
      case 'add_note': {
        if (!act.value) return result
        const anchor = noteAnchor(links)
        if (!anchor) { result.detail = 'no lead/patient to attach note'; return result }
        const { error } = await supabase.from('activities').insert({
          organization_id: orgId, entity_type: anchor.entity_type, entity_id: anchor.entity_id,
          type: 'note', content: act.value, source_page: anchor.source_page,
        })
        if (error) throw new Error(error.message)
        result.status = 'success'; return result
      }
      case 'create_task': {
        if (!act.title) { result.detail = 'no task title'; return result }
        const anchor = noteAnchor(links)
        const { error } = await supabase.from('tasks').insert({
          organization_id: orgId,
          title: act.title,
          priority: act.priority || 'Medium',
          due_date: act.dueInDays ? addDaysIso(act.dueInDays) : null,
          status: 'Pending',
          entity_type: anchor?.entity_type || null,
          entity_id: anchor?.entity_id || null,
        })
        if (error) throw new Error(error.message)
        result.status = 'success'; result.detail = act.title; return result
      }
      case 'schedule_followup': {
        if (!links.leadId && !links.patientId) { result.detail = 'no lead/patient'; return result }
        const { error } = await supabase.from('followups').insert({
          organization_id: orgId,
          lead_id: links.leadId, patient_id: links.patientId,
          type: act.fuType || 'Call',
          scheduled_at: addDaysIso(act.inDays || 0),
          status: 'Scheduled',
        })
        if (error) throw new Error(error.message)
        result.status = 'success'; result.detail = act.fuType || 'Call'; return result
      }
      case 'notify': {
        const { error } = await supabase.from('notifications').insert({
          organization_id: orgId,
          type: 'automation',
          title: act.title || `Automation: ${rule.name || 'rule'}`,
          message: act.message || '',
        })
        if (error) throw new Error(error.message)
        result.status = 'success'; return result
      }
      default:
        result.detail = `unknown action "${act.type}"`; return result
    }
  } catch (err) {
    result.status = 'failed'; result.error = err.message
    return result
  }
}

// Persist a per-rule report to automation_runs. Never throws (the table may
// not be migrated yet, and logging must not break the triggering action).
export async function logAutomationRuns(supabase, { orgId, entityType, entityId, outcome }) {
  if (!outcome?.ran?.length) return
  const rows = outcome.ran.map(r => ({
    organization_id: orgId,
    rule_id: r.rule_id, rule_name: r.rule_name,
    target: r.target, event: r.event,
    entity_type: entityType, entity_id: entityId,
    status: r.status, actions: r.actions, error: r.error,
  }))
  try {
    const { error } = await supabase.from('automation_runs').insert(rows)
    if (error) console.error('[automations] log insert failed:', error.message)
  } catch (err) {
    console.error('[automations] log insert threw:', err.message)
  }
}

// ── Public entry point ──────────────────────────────────────────
// Runs all matching rules for an event and returns a per-rule report.
// Caller decides whether to persist the report to automation_runs.
export async function runAutomations({ supabase, org, target, event, entity, prev, dryRun = false }) {
  const orgId = org?.id || entity?.organization_id
  const rules = selectMatchingRules(org?.settings?.rules || [], { target, event, entity, prev })
  const links = entityLinks(target, entity || {})
  const report = []

  for (const rule of rules) {
    const acts = ruleActions(rule)
    const actionResults = []
    for (const act of acts) {
      if (dryRun) {
        actionResults.push({ type: act.type, status: 'would-run', detail: act.value ?? act.title ?? null })
      } else {
        actionResults.push(await executeAction(supabase, { rule, act, target, entity, links, orgId }))
      }
    }
    const failed = actionResults.filter(a => a.status === 'failed').length
    const ok = actionResults.filter(a => a.status === 'success').length
    const status = dryRun ? 'skipped'
      : failed && ok ? 'partial'
      : failed ? 'failed'
      : ok ? 'success'
      : 'skipped'
    report.push({
      rule_id: rule.id, rule_name: rule.name || null,
      target, event, actions: actionResults, status,
      error: actionResults.find(a => a.error)?.error || null,
    })
  }
  return { orgId, target, event, matched: rules.length, ran: report }
}
