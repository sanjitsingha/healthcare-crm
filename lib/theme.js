// Single app primary color. #393E9A is the one brand color used across the app.
export const PRIMARY = {
  brand: '#393E9A',
  light: '#5A60BE',
  tint:  '#ECECF6',
}

export const DEFAULT_THEME = 'primary'

// Applies the single primary color to the brand CSS variables on :root.
// Ignores any argument so a previously-saved theme preference can't override it.
export function applyTheme() {
  if (typeof document === 'undefined') return
  const r = document.documentElement
  r.style.setProperty('--color-brand', PRIMARY.brand)
  r.style.setProperty('--color-brand-light', PRIMARY.light)
  r.style.setProperty('--color-brand-50', PRIMARY.tint)
}
