// Configurable layout for the Lead detail page.
// Stored in org.settings.lead_layout as [{ key, width }] where width is
// 'full' | 'half' | 'third'. Custom modules use the key `module:<moduleId>`.

export const LEAD_BLOCKS = [
  { key: 'profile',      label: 'Lead Profile' },
  { key: 'info',         label: 'Lead Info' },
  { key: 'notes',        label: 'Notes' },
  { key: 'activity',     label: 'Tasks & Timeline' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'followups',    label: 'Follow-ups' },
]

export const WIDTH_OPTIONS = [
  { value: 'full',  label: 'Full' },
  { value: 'half',  label: 'Half' },
  { value: 'third', label: 'Third' },
]

// Map a width to a span on a 6-column grid (stacks to full width on mobile).
export function widthClass(width) {
  if (width === 'third') return 'col-span-6 sm:col-span-2'
  if (width === 'half')  return 'col-span-6 sm:col-span-3'
  return 'col-span-6'
}

export const isModuleKey = (key) => typeof key === 'string' && key.startsWith('module:')
export const moduleIdFromKey = (key) => key.slice(7)

// Build the list of placeable blocks for a given set of active lead modules.
export function availableBlocks(modules = []) {
  return [
    ...LEAD_BLOCKS,
    ...modules.map(m => ({ key: `module:${m.id}`, label: m.name })),
  ]
}
