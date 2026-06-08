// Configurable automation rules (stored in org.settings.rules).
// A rule: { id, name, enabled, target, event, condition_match:'all'|'any', conditions:[{field,op,value}], condition_groups:[{id,match:'all'|'any',conditions:[]}], action:{type,value} }

export const RULE_TARGETS = [
  { value: "lead", label: "Lead" },
  { value: "patient", label: "Patient" },
];

export const RULE_EVENTS = {
  lead: [
    { value: "lead_created", label: "Lead created" },
    { value: "lead_updated", label: "Lead details updated" },
    { value: "lead_assigned", label: "Lead assigned" },
    { value: "lead_unassigned", label: "Lead unassigned" },
    { value: "stage_changed", label: "Stage changed" },
    { value: "priority_changed", label: "Priority changed" },
    { value: "source_changed", label: "Source changed" },
    { value: "tag_added", label: "Tag added" },
    { value: "tag_removed", label: "Tag removed" },
    { value: "followup_logged", label: "Follow-up logged" },
    { value: "followup_scheduled", label: "Follow-up scheduled" },
    { value: "followup_completed", label: "Follow-up completed" },
    { value: "followup_missed", label: "Follow-up missed" },
    { value: "followup_rescheduled", label: "Follow-up rescheduled" },
    { value: "call_logged", label: "Call logged" },
    { value: "whatsapp_logged", label: "WhatsApp logged" },
    { value: "email_logged", label: "Email logged" },
    { value: "appointment_booked", label: "Appointment booked" },
    { value: "appointment_rescheduled", label: "Appointment rescheduled" },
    { value: "appointment_cancelled", label: "Appointment cancelled" },
    { value: "appointment_completed", label: "Appointment completed" },
    { value: "task_added", label: "Task added" },
    { value: "task_completed", label: "Task completed" },
    { value: "note_updated", label: "Notes updated" },
    { value: "custom_field_updated", label: "Custom field updated" },
    { value: "converted_to_patient", label: "Converted to patient" },
  ],
  patient: [
    { value: "appointment_booked", label: "Appointment booked" },
    { value: "task_added", label: "Task added" },
    { value: "task_completed", label: "Task completed" },
    { value: "tag_added", label: "Tag added" },
    { value: "medical_record_added", label: "Medical record added" },
  ],
};

export const RULE_FIELDS = {
  lead: ["source", "priority", "stage", "value", "gender"],
  patient: ["status", "gender"],
};

// Known value options per condition field (for non-free-text fields).
// `stage` is resolved dynamically from the org's lead stages by the UI.
export const FIELD_OPTIONS = {
  priority: ["Low", "Medium", "High", "Urgent"],
  source: [
    "WhatsApp",
    "Meta Ads",
    "Website",
    "Referral",
    "Call",
    "Email",
    "Walk-in",
    "Event",
    "Other",
  ],
  gender: ["Male", "Female", "Other"],
  status: ["Active", "Inactive"],
};

export const RULE_OPS = [
  { value: "==", label: "is" },
  { value: "!=", label: "is not" },
  { value: ">", label: "greater than" },
  { value: "<", label: "less than" },
  { value: "contains", label: "contains" },
];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const FOLLOWUP_TYPES = ["Call", "WhatsApp", "Email"];

// Each action declares a `kind` so the UI knows what input(s) to render and the
// appliers know how to run it.
// kinds: stage | status | priority | source | tag | staff | number | text |
//        task | followup | notify | none
export const RULE_ACTIONS = {
  lead: [
    { value: "set_stage", label: "Set stage to", kind: "stage" },
    { value: "set_priority", label: "Set priority to", kind: "priority" },
    { value: "set_source", label: "Set source to", kind: "source" },
    { value: "set_value", label: "Set deal value to", kind: "number" },
    { value: "add_tag", label: "Add tag", kind: "tag" },
    { value: "remove_tag", label: "Remove tag", kind: "tag" },
    { value: "assign_to", label: "Assign to", kind: "staff" },
    { value: "add_note", label: "Add note", kind: "text" },
    { value: "create_task", label: "Create task", kind: "task" },
    { value: "schedule_followup", label: "Schedule follow-up", kind: "followup" },
    { value: "notify", label: "Send notification", kind: "notify" },
  ],
  patient: [
    { value: "set_status", label: "Set status to", kind: "status" },
    { value: "add_tag", label: "Add tag", kind: "tag" },
    { value: "remove_tag", label: "Remove tag", kind: "tag" },
    { value: "assign_to", label: "Assign to", kind: "staff" },
    { value: "add_note", label: "Add note", kind: "text" },
    { value: "create_task", label: "Create task", kind: "task" },
    { value: "schedule_followup", label: "Schedule follow-up", kind: "followup" },
    { value: "notify", label: "Send notification", kind: "notify" },
  ],
};

// action value -> kind (kinds are consistent across lead/patient)
export const ACTION_KIND = Object.fromEntries(
  [...RULE_ACTIONS.lead, ...RULE_ACTIONS.patient].map((a) => [a.value, a.kind]),
);

// Normalize a rule's actions to an array (supports legacy single `action`).
export function ruleActions(rule) {
  if (Array.isArray(rule?.actions)) return rule.actions;
  if (rule?.action) return [rule.action];
  return [];
}

export const eventLabel = (target, value) =>
  (RULE_EVENTS[target] || []).find((e) => e.value === value)?.label || value;

function evalCondition(entity, cond) {
  if (!cond.field) return true;
  const v = entity?.[cond.field];
  const t = cond.value;
  switch (cond.op) {
    case "==":
      return String(v ?? "") === String(t);
    case "!=":
      return String(v ?? "") !== String(t);
    case ">":
      return Number(v) > Number(t);
    case "<":
      return Number(v) < Number(t);
    case "contains":
      return String(v ?? "")
        .toLowerCase()
        .includes(String(t ?? "").toLowerCase());
    default:
      return true;
  }
}

function conditionsMatch(entity, conditions = [], matchMode = "all") {
  if (!conditions.length) return true;
  return matchMode === "any"
    ? conditions.some((c) => evalCondition(entity, c))
    : conditions.every((c) => evalCondition(entity, c));
}

function ruleConditionsMatch(entity, rule) {
  const looseConditions = rule.conditions || [];
  const groupedConditions = rule.condition_groups || [];

  const looseMatch = conditionsMatch(
    entity,
    looseConditions,
    rule.condition_match || "all",
  );

  if (!groupedConditions.length) return looseMatch;

  const groupResults = groupedConditions.map((group) =>
    conditionsMatch(entity, group.conditions || [], group.match || "all"),
  );

  return looseMatch && groupResults.every(Boolean);
}

// Return enabled rules for a target + event whose conditions match the entity
export function matchingRules(rules, { target, event, entity }) {
  return (rules || []).filter(
    (r) =>
      r.enabled &&
      r.target === target &&
      r.event === event &&
      ruleConditionsMatch(entity, r),
  );
}
