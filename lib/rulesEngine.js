// Configurable automation rules (stored in org.settings.rules).
// This module holds the UI-facing METADATA (targets, events, fields, operators,
// actions). The actual condition evaluation + action execution lives in the
// shared engine at lib/automations/engine.js — imported here so there is a
// single source of truth.
//
// A rule: { id, name, enabled, target, event, condition_match:'all'|'any',
//   conditions:[{field,op,value}], condition_groups:[{id,match,conditions:[]}],
//   actions:[{type,value,...}] }

import { selectMatchingRules, evaluateConditions, ruleActions as _ruleActions } from '@/lib/automations/engine'

export const RULE_TARGETS = [
  { value: 'lead', label: 'Lead' },
  { value: 'patient', label: 'Patient' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'task', label: 'Task' },
  { value: 'consultation', label: 'Consultation' },
]

export const RULE_EVENTS = {
  lead: [
    { value: 'lead_created', label: 'Lead created' },
    { value: 'lead_updated', label: 'Lead details updated' },
    { value: 'field_updated', label: 'Field updated' },
    { value: 'field_entered', label: 'Field entered (was empty)' },
    { value: 'lead_assigned', label: 'Lead assigned' },
    { value: 'lead_unassigned', label: 'Lead unassigned' },
    { value: 'stage_changed', label: 'Stage changed' },
    { value: 'priority_changed', label: 'Priority changed' },
    { value: 'source_changed', label: 'Source changed' },
    { value: 'tag_added', label: 'Tag added' },
    { value: 'tag_removed', label: 'Tag removed' },
    { value: 'followup_logged', label: 'Follow-up logged' },
    { value: 'followup_scheduled', label: 'Follow-up scheduled' },
    { value: 'followup_completed', label: 'Follow-up completed' },
    { value: 'followup_missed', label: 'Follow-up missed' },
    { value: 'followup_rescheduled', label: 'Follow-up rescheduled' },
    { value: 'call_logged', label: 'Call logged' },
    { value: 'whatsapp_logged', label: 'WhatsApp logged' },
    { value: 'email_logged', label: 'Email logged' },
    { value: 'appointment_booked', label: 'Appointment booked' },
    { value: 'appointment_rescheduled', label: 'Appointment rescheduled' },
    { value: 'appointment_cancelled', label: 'Appointment cancelled' },
    { value: 'appointment_completed', label: 'Appointment completed' },
    { value: 'task_added', label: 'Task added' },
    { value: 'task_completed', label: 'Task completed' },
    { value: 'note_updated', label: 'Notes updated' },
    { value: 'converted_to_patient', label: 'Converted to patient' },
  ],
  patient: [
    { value: 'patient_created', label: 'Patient created' },
    { value: 'patient_updated', label: 'Patient details updated' },
    { value: 'field_updated', label: 'Field updated' },
    { value: 'field_entered', label: 'Field entered (was empty)' },
    { value: 'status_changed', label: 'Status changed' },
    { value: 'tag_added', label: 'Tag added' },
    { value: 'tag_removed', label: 'Tag removed' },
    { value: 'appointment_booked', label: 'Appointment booked' },
    { value: 'task_added', label: 'Task added' },
    { value: 'task_completed', label: 'Task completed' },
    { value: 'followup_logged', label: 'Follow-up logged' },
    { value: 'followup_completed', label: 'Follow-up completed' },
    { value: 'medical_record_added', label: 'Medical record added' },
    { value: 'note_updated', label: 'Notes updated' },
  ],
  appointment: [
    { value: 'appointment_booked', label: 'Appointment booked' },
    { value: 'appointment_rescheduled', label: 'Appointment rescheduled' },
    { value: 'appointment_cancelled', label: 'Appointment cancelled' },
    { value: 'appointment_completed', label: 'Appointment completed' },
    { value: 'status_changed', label: 'Status changed' },
  ],
  task: [
    { value: 'task_created', label: 'Task created' },
    { value: 'task_completed', label: 'Task completed' },
    { value: 'task_overdue', label: 'Task overdue' },
    { value: 'status_changed', label: 'Status changed' },
    { value: 'priority_changed', label: 'Priority changed' },
  ],
  consultation: [
    { value: 'consultation_created', label: 'Consultation created' },
    { value: 'consultation_completed', label: 'Consultation completed' },
    { value: 'status_changed', label: 'Status changed' },
    { value: 'follow_up_required', label: 'Follow-up flagged' },
  ],
}

// Condition fields per target (real columns; `custom:<api_name>` added by the UI).
export const RULE_FIELDS = {
  lead: ['source', 'priority', 'stage', 'value', 'gender', 'assigned_to', 'email', 'phone', 'address'],
  patient: ['status', 'gender', 'assigned_to', 'email', 'phone', 'address'],
  appointment: ['status', 'doctor_id', 'scheduled_at'],
  task: ['status', 'priority', 'title', 'due_date'],
  consultation: ['status', 'consultation_type', 'amount', 'doctor_id', 'consulted_at', 'follow_up_required'],
}

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
export const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email']
export const GENDERS = ['Male', 'Female', 'Other']
export const SOURCES = ['WhatsApp', 'Meta Ads', 'Website', 'Referral', 'Call', 'Email', 'Walk-in', 'Event', 'Other']

// status option sets differ per target.
export const STATUS_OPTIONS = {
  patient: ['Active', 'Inactive'],
  appointment: ['booked', 'confirmed', 'completed', 'cancelled'],
  task: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
  consultation: ['Scheduled', 'Completed', 'Cancelled', 'No-Show'],
}

const CONSULTATION_TYPES = ['Initial', 'Follow-up', 'Urgent', 'Routine', 'Teleconsultation', 'Walk-in']

// Kept for backward-compatible imports (flat option map).
export const FIELD_OPTIONS = {
  priority: PRIORITIES,
  source: SOURCES,
  gender: GENDERS,
  status: STATUS_OPTIONS.patient,
}

// Target-aware option resolver used by the rules UI for a condition value.
// Returns an array of options, or null for free text / number / date inputs.
export function fieldOptions(target, field, { stages = [] } = {}) {
  if (field === 'stage') return stages
  if (field === 'status') return STATUS_OPTIONS[target] || []
  if (field === 'priority') return PRIORITIES
  if (field === 'gender') return GENDERS
  if (field === 'source') return SOURCES
  if (field === 'consultation_type') return CONSULTATION_TYPES
  if (field === 'follow_up_required') return ['true', 'false']
  return null
}

// Operators. `needsValue:false` ops (is empty / is not empty) hide the value input.
export const RULE_OPS = [
  { value: '==', label: 'is' },
  { value: '!=', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'in', label: 'is any of (comma list)' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'greater or equal' },
  { value: '<=', label: 'less or equal' },
  { value: 'between', label: 'between (a,b)' },
  { value: 'is_empty', label: 'is empty', needsValue: false },
  { value: 'not_empty', label: 'is not empty', needsValue: false },
  { value: 'changed', label: 'changed (any value)', needsValue: false },
  { value: 'changed_to', label: 'changed to' },
  { value: 'changed_from', label: 'changed from' },
]

export const OP_NEEDS_VALUE = Object.fromEntries(RULE_OPS.map(o => [o.value, o.needsValue !== false]))
// Ops that should render a plain text/number input even when the field has options.
export const FREEFORM_OPS = new Set(['>', '<', '>=', '<=', 'between', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in'])

// Actions per target. Each declares a `kind` so the UI knows what input to show
// and the engine knows how to run it.
// kinds: stage | status | priority | source | tag | staff | number | text |
//        task | followup | notify | field | custom | convert
export const RULE_ACTIONS = {
  lead: [
    { value: 'set_stage', label: 'Set stage to', kind: 'stage' },
    { value: 'set_priority', label: 'Set priority to', kind: 'priority' },
    { value: 'set_source', label: 'Set source to', kind: 'source' },
    { value: 'set_value', label: 'Set deal value to', kind: 'number' },
    { value: 'set_field', label: 'Set a field', kind: 'field' },
    { value: 'set_custom', label: 'Set custom field', kind: 'custom' },
    { value: 'add_tag', label: 'Add tag', kind: 'tag' },
    { value: 'remove_tag', label: 'Remove tag', kind: 'tag' },
    { value: 'assign_to', label: 'Assign to', kind: 'staff' },
    { value: 'add_note', label: 'Add note', kind: 'text' },
    { value: 'create_task', label: 'Create task', kind: 'task' },
    { value: 'schedule_followup', label: 'Schedule follow-up', kind: 'followup' },
    { value: 'convert_to_patient', label: 'Convert to patient', kind: 'convert' },
    { value: 'notify', label: 'Send notification', kind: 'notify' },
  ],
  patient: [
    { value: 'set_status', label: 'Set status to', kind: 'status' },
    { value: 'set_field', label: 'Set a field', kind: 'field' },
    { value: 'set_custom', label: 'Set custom field', kind: 'custom' },
    { value: 'add_tag', label: 'Add tag', kind: 'tag' },
    { value: 'remove_tag', label: 'Remove tag', kind: 'tag' },
    { value: 'assign_to', label: 'Assign to', kind: 'staff' },
    { value: 'add_note', label: 'Add note', kind: 'text' },
    { value: 'create_task', label: 'Create task', kind: 'task' },
    { value: 'schedule_followup', label: 'Schedule follow-up', kind: 'followup' },
    { value: 'notify', label: 'Send notification', kind: 'notify' },
  ],
  appointment: [
    { value: 'set_status', label: 'Set status to', kind: 'status' },
    { value: 'set_field', label: 'Set a field', kind: 'field' },
    { value: 'add_note', label: 'Add note', kind: 'text' },
    { value: 'create_task', label: 'Create task', kind: 'task' },
    { value: 'schedule_followup', label: 'Schedule follow-up', kind: 'followup' },
    { value: 'notify', label: 'Send notification', kind: 'notify' },
  ],
  task: [
    { value: 'set_status', label: 'Set status to', kind: 'status' },
    { value: 'set_field', label: 'Set a field', kind: 'field' },
    { value: 'add_note', label: 'Add note', kind: 'text' },
    { value: 'notify', label: 'Send notification', kind: 'notify' },
  ],
  consultation: [
    { value: 'set_status', label: 'Set status to', kind: 'status' },
    { value: 'set_field', label: 'Set a field', kind: 'field' },
    { value: 'add_note', label: 'Add note', kind: 'text' },
    { value: 'create_task', label: 'Create task', kind: 'task' },
    { value: 'schedule_followup', label: 'Schedule follow-up', kind: 'followup' },
    { value: 'notify', label: 'Send notification', kind: 'notify' },
  ],
}

// Fields that can be written by the generic "Set a field" action, per target.
// Curated from RULE_FIELDS minus identifiers that shouldn't be free-set here.
export const SETTABLE_FIELDS = {
  lead: ['stage', 'priority', 'source', 'value', 'gender', 'email', 'phone', 'address'],
  patient: ['status', 'gender', 'email', 'phone', 'address'],
  appointment: ['status'],
  task: ['status', 'priority', 'title'],
  consultation: ['status', 'consultation_type', 'amount'],
}

// action value -> kind (kinds are consistent across targets)
export const ACTION_KIND = Object.fromEntries(
  Object.values(RULE_ACTIONS).flat().map(a => [a.value, a.kind]),
)

export const eventLabel = (target, value) =>
  (RULE_EVENTS[target] || []).find(e => e.value === value)?.label || value

// ── Delegate evaluation to the shared engine (single source of truth) ──
export const ruleActions = _ruleActions
export { evaluateConditions }

// Back-compat signature used by client pages' legacy applyRules.
export function matchingRules(rules, { target, event, entity, prev }) {
  return selectMatchingRules(rules, { target, event, entity, prev })
}
