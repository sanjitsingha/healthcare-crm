// Outbound WhatsApp adapters. SERVER-ONLY (called from /api/whatsapp/send).
// Each adapter builds the provider's documented request and returns a uniform
// result { ok, status, response, error } with the provider's raw response so the
// UI can show exactly what happened. Exact template/payload shapes vary per
// account — the `custom` adapter is the guaranteed escape hatch.

const digits = (s) => String(s || '').replace(/[^\d]/g, '')

// Split an E.164-ish number into { cc, number } (last 10 digits = local part).
function splitNumber(to) {
  const d = digits(to)
  if (d.length > 10) return { cc: d.slice(0, d.length - 10), number: d.slice(-10) }
  return { cc: '91', number: d } // default India when only a 10-digit number is given
}

async function doFetch(url, opts) {
  try {
    const res = await fetch(url, opts)
    const txt = await res.text()
    let body
    try { body = JSON.parse(txt) } catch { body = txt }
    return { ok: res.ok, status: res.status, response: body }
  } catch (e) {
    return { ok: false, status: 0, error: e.message }
  }
}

// ── WATI ──────────────────────────────────────────────────────
async function sendWati({ config, to, templateName, params, text }) {
  const base = (config.endpoint || '').replace(/\/+$/, '')
  if (!base || !config.access_token) return { ok: false, error: 'WATI endpoint or access token is missing.' }
  const num = digits(to)
  const headers = { Authorization: `Bearer ${config.access_token}`, 'Content-Type': 'application/json' }
  if (templateName) {
    const parameters = (params || []).map((v, i) => ({ name: String(i + 1), value: String(v) }))
    return doFetch(`${base}/api/v1/sendTemplateMessage?whatsappNumber=${num}`, {
      method: 'POST', headers,
      body: JSON.stringify({ template_name: templateName, broadcast_name: templateName, parameters }),
    })
  }
  // Session (free-form) message — only delivers inside the 24h window.
  return doFetch(`${base}/api/v1/sendSessionMessage/${num}?messageText=${encodeURIComponent(text || '')}`, {
    method: 'POST', headers,
  })
}

// ── Interakt ──────────────────────────────────────────────────
async function sendInterakt({ config, to, templateName, params, languageCode = 'en' }) {
  if (!config.api_key) return { ok: false, error: 'Interakt API key is missing.' }
  if (!templateName) return { ok: false, error: 'Interakt requires a template name for proactive messages.' }
  const { cc, number } = splitNumber(to)
  return doFetch('https://api.interakt.ai/v1/public/message/', {
    method: 'POST',
    headers: { Authorization: `Basic ${config.api_key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countryCode: '+' + cc,
      phoneNumber: number,
      type: 'Template',
      template: { name: templateName, languageCode, bodyValues: (params || []).map(String) },
    }),
  })
}

// ── MSG91 ─────────────────────────────────────────────────────
async function sendMsg91({ config, to, templateName, params, languageCode = 'en' }) {
  if (!config.authkey || !config.integrated_number) return { ok: false, error: 'MSG91 authkey or integrated number is missing.' }
  if (!templateName) return { ok: false, error: 'MSG91 requires a template name.' }
  const num = digits(to)
  const template = {
    name: templateName,
    language: { code: languageCode, policy: 'deterministic' },
  }
  if (params && params.length) {
    template.components = [{ type: 'body', parameters: params.map((v) => ({ type: 'text', text: String(v) })) }]
  }
  return doFetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
    method: 'POST',
    headers: { authkey: config.authkey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      integrated_number: config.integrated_number,
      content_type: 'template',
      payload: { to: num, type: 'template', template },
    }),
  })
}

// ── Nebkern WABA ──────────────────────────────────────────────
async function sendNebkern({ config, to, templateName, params, languageCode = 'en_US' }) {
  if (!config.api_key) return { ok: false, error: 'Nebkern API key is missing.' }
  if (!templateName) return { ok: false, error: 'Nebkern requires a template name.' }
  const num = to.startsWith('+') ? to : '+' + digits(to)
  return doFetch('https://waba.nebkern.com/api/integrations/send-message', {
    method: 'POST',
    headers: { 'x-api-key': config.api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: num,
      template: { name: templateName, language: languageCode },
      params: (params || []).map(String),
    }),
  })
}

// ── Generic / custom REST ─────────────────────────────────────
async function sendCustom({ config, to, templateName, params, text }) {
  if (!config.url) return { ok: false, error: 'Custom endpoint URL is missing.' }
  const headers = { 'Content-Type': 'application/json' }
  if (config.auth_header && config.auth_value) headers[config.auth_header] = config.auth_value
  const repl = { to: digits(to), text: text || '', template: templateName || '', params: (params || []).join(',') }
  // JSON-escape substituted values so the body stays valid JSON.
  const body = (config.body_template || '{"to":"{{to}}","text":"{{text}}"}')
    .replace(/\{\{(\w+)\}\}/g, (_, k) => JSON.stringify(repl[k] ?? '').slice(1, -1))
  return doFetch(config.url, { method: 'POST', headers, body })
}

export async function sendWhatsApp({ provider, config = {}, to, templateName, params, text, languageCode }) {
  if (!to) return { ok: false, error: 'Recipient number is required.' }
  switch (provider) {
    case 'wati':     return sendWati({ config, to, templateName, params, text })
    case 'interakt': return sendInterakt({ config, to, templateName, params, languageCode })
    case 'msg91':    return sendMsg91({ config, to, templateName, params, languageCode })
    case 'nebkern':  return sendNebkern({ config, to, templateName, params, languageCode })
    case 'custom':   return sendCustom({ config, to, templateName, params, text })
    default:         return { ok: false, error: `Unknown WhatsApp provider "${provider}".` }
  }
}
