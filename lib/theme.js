// App color themes. Each sets the brand CSS variables used across the app.
export const THEMES = {
  blue: {
    key: 'blue',
    name: 'Blue',
    brand: '#135BFB',
    light: '#3d78fc',
    tint:  '#e8effe',
  },
  indigo: {
    key: 'indigo',
    name: 'Indigo',
    brand: '#21297E',
    light: '#3a43b5',
    tint:  '#e8eaf6',
  },
}

export const DEFAULT_THEME = 'blue'

// Apply a theme by setting the brand CSS variables on :root
export function applyTheme(key) {
  if (typeof document === 'undefined') return
  const t = THEMES[key] || THEMES[DEFAULT_THEME]
  const r = document.documentElement
  r.style.setProperty('--color-brand', t.brand)
  r.style.setProperty('--color-brand-light', t.light)
  r.style.setProperty('--color-brand-50', t.tint)
}
