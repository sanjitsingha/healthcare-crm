// App color themes. Each sets the brand CSS variables used across the app.
export const THEMES = {
  green: {
    key: 'green',
    name: 'Emerald',
    brand: '#0f6e56',
    light: '#1d9e75',
    tint:  '#e1f5ee',
  },
  indigo: {
    key: 'indigo',
    name: 'Indigo',
    brand: '#21297E',
    light: '#3a43b5',
    tint:  '#e8eaf6',
  },
}

export const DEFAULT_THEME = 'green'

// Apply a theme by setting the brand CSS variables on :root
export function applyTheme(key) {
  if (typeof document === 'undefined') return
  const t = THEMES[key] || THEMES[DEFAULT_THEME]
  const r = document.documentElement
  r.style.setProperty('--color-brand', t.brand)
  r.style.setProperty('--color-brand-light', t.light)
  r.style.setProperty('--color-brand-50', t.tint)
}
