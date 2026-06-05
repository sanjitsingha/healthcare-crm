// Events that can auto-change a lead's stage. Used by Settings (to configure)
// and the lead detail page (to apply). Rules are stored in org.settings.stage_rules
// as: [{ id, event, stage }]
export const STAGE_EVENTS = [
  { value: 'followup_logged',    label: 'When a follow-up is logged' },
  { value: 'appointment_booked', label: 'When an appointment is booked' },
  { value: 'task_completed',     label: 'When a task is completed' },
]

export function eventLabel(value) {
  return STAGE_EVENTS.find(e => e.value === value)?.label || value
}
