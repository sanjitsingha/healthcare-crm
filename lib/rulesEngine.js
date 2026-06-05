// Configurable automation rules (stored in org.settings.rules).
// A rule: { id, name, enabled, target, event, conditions:[{field,op,value}], action:{type,value} }

export const RULE_TARGETS = [
  { value: 'lead',    label: 'Lead' },
  { value: 'patient', label: 'Patient' },
]

export const RULE_EVENTS = {
  lead: [
    { value: 'followup_logged',    label: 'Follow-up logged' },
    { value: 'appointment_booked', label: 'Appointment booked' },
    { value: 'task_added',         label: 'Task added' },
    { value: 'task_completed',     label: 'Task completed' },
    { value: 'tag_added',          label: 'Tag added' },
    { value: 'stage_changed',      label: 'Stage changed (manually)' },
  ],
  patient: [
    { value: 'appointment_booked',   label: 'Appointment booked' },
    { value: 'task_added',           label: 'Task added' },
    { value: 'task_completed',       label: 'Task completed' },
    { value: 'tag_added',            label: 'Tag added' },
    { value: 'medical_record_added', label: 'Medical record added' },
  ],
}

export const RULE_FIELDS = {
  lead:    ['source', 'priority', 'stage', 'value', 'gender'],
  patient: ['status', 'gender'],
}

// Known value options per condition field (for non-free-text fields).
// `stage` is resolved dynamically from the org's lead stages by the UI.
export const FIELD_OPTIONS = {
  priority: ['Low', 'Medium', 'High', 'Urgent'],
  source:   ['WhatsApp', 'Meta Ads', 'Website', 'Referral', 'Call', 'Email', 'Walk-in', 'Event', 'Other'],
  gender:   ['Male', 'Female', 'Other'],
  status:   ['Active', 'Inactive'],
}

export const RULE_OPS = [
  { value: '==',       label: 'is' },
  { value: '!=',       label: 'is not' },
  { value: '>',        label: 'greater than' },
  { value: '<',        label: 'less than' },
  { value: 'contains', label: 'contains' },
]

export const RULE_ACTIONS = {
  lead: [
    { value: 'set_stage', label: 'Set stage to' },
    { value: 'add_tag',   label: 'Add tag' },
  ],
  patient: [
    { value: 'set_status', label: 'Set status to' },
    { value: 'add_tag',    label: 'Add tag' },
  ],
}

export const eventLabel = (target, value) =>
  (RULE_EVENTS[target] || []).find(e => e.value === value)?.label || value

function evalCondition(entity, cond) {
  if (!cond.field) return true
  const v = entity?.[cond.field]
  const t = cond.value
  switch (cond.op) {
    case '==':       return String(v ?? '') === String(t)
    case '!=':       return String(v ?? '') !== String(t)
    case '>':        return Number(v) > Number(t)
    case '<':        return Number(v) < Number(t)
    case 'contains': return String(v ?? '').toLowerCase().includes(String(t ?? '').toLowerCase())
    default:         return true
  }
}

// Return enabled rules for a target + event whose conditions all match the entity
export function matchingRules(rules, { target, event, entity }) {
  return (rules || []).filter(r =>
    r.enabled && r.target === target && r.event === event &&
    (r.conditions || []).every(c => evalCondition(entity, c))
  )
}
