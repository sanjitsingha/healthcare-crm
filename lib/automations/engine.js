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

import { buildPatientCode } from '@/lib/patientId'

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
    case 'not_contains':return !String(cur ?? '').toLowerCase().includes(String(target ?? '').toLowerCase())
    case 'starts_with':return String(cur ?? '').toLowerCase().startsWith(String(target ?? '').toLowerCase())
    case 'ends_with':  return String(cur ?? '').toLowerCase().endsWith(String(target ?? '').toLowerCase())
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
    case 'changed': {
      // "changed to anything" — needs a previous snapshot to compare against.
      if (!prev) return false
      return !looseEq(cur, getFieldValue(prev, cond.field))
    }
    case '>':  return cmp(cur, target) > 0
    case '<':  return cmp(cur, target) < 0
    case '>=': return cmp(cur, target) >= 0
    case '<=': return cmp(cur, target) <= 0
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

// ── Field-update triggers ───────────────────────────────────────
// "Field updated" / "Field entered" are first-class triggers that compare the
// fresh entity against `prev` (the pre-edit snapshot threaded from the UI).
//
// They listen to the set of edit events below — chosen so they NEVER co-fire
// for a single change (otherwise the action would run twice). lead_updated is
// the umbrella for profile/info edits (which also emit source_changed etc., so
// those are intentionally excluded); stage/assignment have their own one-shot
// events. For patients, patient_updated already fires on every profile save.
const FIELD_TRIGGER_SOURCE_EVENTS = {
  lead: new Set(['lead_updated', 'stage_changed', 'lead_assigned', 'lead_unassigned']),
  patient: new Set(['patient_updated']),
}
const NOISE_KEYS = new Set(['id', 'organization_id', 'created_at', 'updated_at', 'patient_code'])

// Keys (incl. custom:<api>) whose scalar value differs between entity and prev.
function changedKeys(entity, prev) {
  if (!prev) return []
  const out = []
  const keys = new Set([...Object.keys(entity || {}), ...Object.keys(prev || {})])
  for (const k of keys) {
    if (NOISE_KEYS.has(k)) continue
    const a = entity?.[k], b = prev?.[k]
    if (k === 'custom_data') {
      const ck = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])
      for (const c of ck) if (!looseEq(a?.[c], b?.[c])) out.push('custom:' + c)
      continue
    }
    // Only compare scalars — skip joined arrays/objects to avoid false positives.
    if (a !== null && typeof a === 'object') continue
    if (b !== null && typeof b === 'object') continue
    if (!looseEq(a, b)) out.push(k)
  }
  return out
}

function fieldChanged(entity, prev, field, entered) {
  const cur = getFieldValue(entity, field)
  const was = getFieldValue(prev, field)
  return entered ? (isEmpty(was) && !isEmpty(cur)) : !looseEq(cur, was)
}

// Does a field_updated / field_entered rule match this change?
function fieldTriggerMatches(rule, entity, prev) {
  if (!prev) return false
  const entered = rule.event === 'field_entered'
  if ((rule.trigger_field_mode || 'any') === 'specific') {
    const fields = rule.trigger_fields || []
    return fields.length ? fields.some(f => fieldChanged(entity, prev, f, entered)) : false
  }
  const changed = changedKeys(entity, prev)
  if (!entered) return changed.length > 0
  return changed.some(k => isEmpty(getFieldValue(prev, k)) && !isEmpty(getFieldValue(entity, k)))
}

const isFieldTrigger = (ev) => ev === 'field_updated' || ev === 'field_entered'

// True if a rule's trigger applies to the incoming event for this entity.
function ruleEventApplies(rule, event, entity, prev) {
  if (isFieldTrigger(rule.event)) {
    const sources = FIELD_TRIGGER_SOURCE_EVENTS[rule.target]
    if (event !== rule.event && !(sources && sources.has(event))) return false
    return fieldTriggerMatches(rule, entity, prev)
  }
  return rule.event === event
}

export function selectMatchingRules(rules, { target, event, entity, prev }) {
  return (rules || []).filter(
    r => r.enabled && r.target === target && ruleEventApplies(r, event, entity, prev) && evaluateConditions(entity, r, prev),
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
async function executeAction(ctx, act) {
  const { supabase, rule, target, entity, links, orgId } = ctx
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
      case 'set_field': {
        // Generic setter for any standard column on the triggering record.
        // (custom: fields are routed to custom_data, same as set_custom.)
        if (!act.field) { result.detail = 'no field selected'; return result }
        if (act.field.startsWith('custom:')) {
          const key = act.field.slice(7)
          const next = { ...(entity.custom_data || {}), [key]: act.value === '' ? null : act.value }
          await updateEntity({ custom_data: next }); result.status = 'success'; result.detail = `${key} = ${act.value}`; return result
        }
        const newVal = act.value === '' ? null : act.value
        if (looseEq(getFieldValue(entity, act.field), newVal)) { result.detail = 'no change'; return result }
        await updateEntity({ [act.field]: newVal }); result.status = 'success'; result.detail = `${act.field} = ${newVal ?? '∅'}`; return result
      }
      case 'set_custom': {
        // Write a single key into the record's custom_data JSONB.
        if (!onlyFor('lead', 'patient')) return result
        const key = (act.field || '').startsWith('custom:') ? act.field.slice(7) : act.field
        if (!key) { result.detail = 'no custom field'; return result }
        const next = { ...(entity.custom_data || {}), [key]: act.value === '' ? null : act.value }
        await updateEntity({ custom_data: next }); result.status = 'success'; result.detail = `${key} = ${act.value}`; return result
      }
      case 'convert_to_patient': {
        if (!onlyFor('lead')) return result
        if (entity.patient_id) { result.detail = 'already converted'; return result }
        // Generate a patient code from the org's configured format (parity with
        // the manual conversion path in createPatient).
        let code = null
        try {
          const { data: orgRow } = await supabase.from('organizations').select('settings').eq('id', orgId).single()
          const cfg = orgRow?.settings?.patient_id_format
          if (cfg?.enabled) {
            const seq = Number(cfg.next_seq) || 1
            code = buildPatientCode(cfg, seq)
            if (code) await supabase.from('organizations')
              .update({ settings: { ...orgRow.settings, patient_id_format: { ...cfg, next_seq: seq + 1 } } })
              .eq('id', orgId)
          }
        } catch { /* no code — proceed without one */ }
        const { data: pat, error: insErr } = await supabase.from('patients').insert({
          first_name: entity.first_name || entity.title || null,
          last_name: entity.last_name || null,
          phone: entity.phone || null,
          email: entity.email || null,
          gender: entity.gender || null,
          date_of_birth: entity.date_of_birth || null,
          address: entity.address || null,
          organization_id: orgId,
          assigned_to: entity.assigned_to || null,
          patient_code: code,
        }).select().single()
        if (insErr) throw new Error(insErr.message)
        await updateEntity({ patient_id: pat.id, stage: 'Converted' })
        await supabase.from('activities').insert({
          organization_id: orgId, entity_type: 'patient', entity_id: pat.id,
          type: 'status_change', source_page: 'lead',
          content: `Converted from lead${entity.title ? `: ${entity.title}` : ''}`,
        })
        result.status = 'success'; result.detail = pat.patient_code || 'patient created'; return result
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
        let due_date = null
        if (act.dueMode === 'before' || act.dueMode === 'after') {
          // Relative to a date field on the triggering record (e.g. scheduled_at).
          const base = getFieldValue(entity, act.dueField || 'scheduled_at')
          const d = base ? new Date(base) : null
          if (d && !isNaN(d)) {
            d.setDate(d.getDate() + Number(act.dueDays || 0) * (act.dueMode === 'before' ? -1 : 1))
            due_date = d.toISOString()
          }
        } else if (act.dueDays !== '' && act.dueDays != null) {
          due_date = addDaysIso(act.dueDays)               // N days from now
        } else if (act.dueInDays) {
          due_date = addDaysIso(act.dueInDays)             // legacy field
        }
        const { error } = await supabase.from('tasks').insert({
          organization_id: orgId,
          title: act.title,
          priority: act.priority || 'Medium',
          due_date,
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

// Run a list of actions in order (used for top-level DO and for If/Else branches).
async function runActionList(ctx, actions) {
  const out = []
  for (const act of (actions || [])) {
    out.push(act?.type === 'if' ? await executeIf(ctx, act) : await executeAction(ctx, act))
  }
  return out
}

// If / Else control flow: evaluate the block's own conditions against the entity,
// then run the THEN or ELSE action branch (supports nesting).
async function executeIf(ctx, act) {
  const matched = evaluateConditions(
    ctx.entity,
    { conditions: act.conditions || [], condition_match: act.match || 'all', condition_groups: [] },
    ctx.prev,
  )
  const children = await runActionList(ctx, matched ? (act.then || []) : (act.else || []))
  const anyFailed = children.some((c) => c.status === 'failed')
  const anyOk = children.some((c) => c.status === 'success' || c.status === 'partial')
  return {
    type: 'if',
    status: !children.length ? 'skipped' : anyFailed ? (anyOk ? 'partial' : 'failed') : 'success',
    detail: matched ? 'then' : 'else',
    children,
  }
}

// Dry-run preview of an action (and nested If/Else) without executing.
function previewAction(act) {
  if (act?.type === 'if') {
    return {
      type: 'if', status: 'would-run', detail: `${(act.conditions || []).length} condition(s)`,
      children: [...(act.then || []), ...(act.else || [])].map(previewAction),
    }
  }
  return { type: act.type, status: 'would-run', detail: act.value ?? act.title ?? null }
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
    const ctx = { supabase, rule, target, entity, links, orgId, prev }
    const actionResults = dryRun
      ? acts.map(previewAction)
      : await runActionList(ctx, acts)
    const failed = actionResults.filter(a => a.status === 'failed').length
    const ok = actionResults.filter(a => a.status === 'success' || a.status === 'partial').length
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
