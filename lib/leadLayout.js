// Configurable canvas layout for detail pages (Lead now; more later).
// Stored in org.settings.lead_layout as a grid: [{ key, x, y, w, h }] on a
// 12-column grid. Custom modules use the key `module:<moduleId>`.

export const GRID_COLS = 12
export const GRID_ROW_H = 28

export const LEAD_BLOCKS = [
  { key: 'profile',      label: 'Lead Profile' },
  { key: 'info',         label: 'Lead Info' },
  { key: 'notes',        label: 'Notes' },
  { key: 'activity',     label: 'Tasks & Timeline' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'followups',    label: 'Follow-ups' },
]

// Sensible default size (in grid units) for each block when first placed.
export const BLOCK_SIZE = {
  profile:      { w: 4, h: 14, minW: 3, minH: 8 },
  info:         { w: 4, h: 9,  minW: 3, minH: 5 },
  notes:        { w: 4, h: 8,  minW: 3, minH: 4 },
  activity:     { w: 8, h: 18, minW: 4, minH: 8 },
  appointments: { w: 6, h: 16, minW: 4, minH: 8 },
  followups:    { w: 12, h: 16, minW: 4, minH: 8 },
}

export const blockSize = (key) => BLOCK_SIZE[key] || { w: 4, h: 10, minW: 3, minH: 5 }

export const isModuleKey = (key) => typeof key === 'string' && key.startsWith('module:')
export const moduleIdFromKey = (key) => key.slice(7)

// Build the list of placeable blocks for a given set of active lead modules.
export function availableBlocks(modules = []) {
  return [
    ...LEAD_BLOCKS,
    ...modules.map(m => ({ key: `module:${m.id}`, label: m.name })),
  ]
}

// True when a stored layout is the grid format (has x/y/w/h).
export function isGridLayout(layout) {
  return Array.isArray(layout) && layout.length > 0 &&
    layout.every(b => b && typeof b.x === 'number' && typeof b.w === 'number' && typeof b.h === 'number')
}

// A reasonable starting grid that mirrors the classic two-column lead page.
export function defaultGrid(modules = []) {
  const rows = [
    { key: 'profile',      x: 0, y: 0,  ...sz('profile') },
    { key: 'info',         x: 0, y: 14, ...sz('info') },
    { key: 'notes',        x: 0, y: 23, ...sz('notes') },
    { key: 'activity',     x: 4, y: 0,  ...sz('activity') },
    { key: 'appointments', x: 4, y: 18, ...sz('appointments') },
    { key: 'followups',    x: 0, y: 34, ...sz('followups') },
  ]
  let y = 50
  for (const m of modules) {
    rows.push({ key: `module:${m.id}`, x: 0, y, ...sz(`module:${m.id}`) })
    y += 10
  }
  return rows
}

function sz(key) {
  const { w, h } = blockSize(key)
  return { w, h }
}
