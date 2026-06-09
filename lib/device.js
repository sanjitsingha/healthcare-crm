// Pure helper (no imports) — safe to use from both client and server.
// Parses a user-agent string into a short "Browser · OS" label.
export function parseDevice(ua = '') {
  let browser = 'Unknown'
  if      (ua.includes('Edg'))                         browser = 'Edge'
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera'
  else if (ua.includes('Chrome'))                      browser = 'Chrome'
  else if (ua.includes('Firefox'))                     browser = 'Firefox'
  else if (ua.includes('Safari'))                      browser = 'Safari'

  let os = 'Unknown'
  if      (ua.includes('Windows'))  os = 'Windows'
  else if (ua.includes('Android'))  os = 'Android'
  else if (ua.includes('iPhone'))   os = 'iPhone'
  else if (ua.includes('iPad'))     os = 'iPad'
  else if (ua.includes('Mac'))      os = 'macOS'
  else if (ua.includes('Linux'))    os = 'Linux'

  return `${browser} · ${os}`
}
