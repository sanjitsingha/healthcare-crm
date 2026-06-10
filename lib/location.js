// Precise geolocation utility — browser GPS/WiFi, reverse-geocoded via Nominatim.
// Falls back gracefully at every step; never throws.

const GEO_CACHE_KEY = 'geo_precise'
const GEO_TTL = 30 * 60 * 1000 // 30 min

function readCache() {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY)
    if (!raw) return null
    const { location, ts } = JSON.parse(raw)
    if (Date.now() - ts < GEO_TTL) return location
  } catch {}
  return null
}

function writeCache(location) {
  try { sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ location, ts: Date.now() })) } catch {}
}

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const d = await r.json()
    const a = d.address || {}
    return [
      a.suburb || a.neighbourhood || a.road,
      a.city || a.town || a.village || a.county,
      a.state,
      a.country_code?.toUpperCase(),
    ].filter(Boolean).join(', ') || null
  } catch {
    return null
  }
}

// Returns a human-readable location string or null.
// Resolves immediately from cache if available; otherwise requests position.
export function getPreciseLocation() {
  if (typeof window === 'undefined' || !navigator.geolocation) return Promise.resolve(null)

  const cached = readCache()
  if (cached) return Promise.resolve(cached)

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        const label = await reverseGeocode(latitude, longitude)
        const result = label || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        writeCache(result)
        resolve(result)
      },
      () => resolve(null),
      { timeout: 6000, maximumAge: GEO_TTL }
    )
  })
}

// Returns 'granted' | 'denied' | 'prompt' | 'unavailable'
export async function getGeoPermissionState() {
  if (typeof window === 'undefined' || !navigator.geolocation) return 'unavailable'
  try {
    const p = await navigator.permissions.query({ name: 'geolocation' })
    return p.state
  } catch {
    return 'unknown'
  }
}

// Invalidates the cache so the next logAudit call fetches a fresh location.
export function clearGeoCache() {
  try { sessionStorage.removeItem(GEO_CACHE_KEY) } catch {}
}
