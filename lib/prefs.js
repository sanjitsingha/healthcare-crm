const CONSENT_KEY = 'cookie_consent'

export function getConsent() {
  if (typeof window === 'undefined') return false
  try { return !!JSON.parse(localStorage.getItem(CONSENT_KEY))?.accepted } catch { return false }
}

export function setConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, at: new Date().toISOString() }))
  } catch {}
}

// Read a preference. Returns fallback if consent not given or key missing.
export function getPref(key, fallback = null) {
  if (typeof window === 'undefined') return fallback
  if (!getConsent()) return fallback
  try {
    const v = localStorage.getItem(key)
    return v !== null ? JSON.parse(v) : fallback
  } catch { return fallback }
}

// Write a preference. No-op if consent not given.
export function setPref(key, value) {
  if (typeof window === 'undefined') return
  if (!getConsent()) return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
