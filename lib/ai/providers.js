// SERVER-ONLY. One OpenAI-compatible chat-completions adapter for all three
// free BYO-key providers. Gemini, Groq, and OpenRouter each expose an
// OpenAI-shaped /chat/completions endpoint with tool-calling, so a single
// adapter + three base URLs covers everything. No SDKs — raw fetch.

const TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 45000

// provider -> { label, baseUrl, defaultModel, keyUrl }
// Model is deliberately free text elsewhere; these are just pre-fill defaults.
export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat-v3-0324:free',
    keyUrl: 'https://openrouter.ai/keys',
  },
}

export const PROVIDER_IDS = Object.keys(PROVIDERS)

// One typed error for every failure mode. `code` lets the UI/tests branch
// (invalid_key vs rate_limited vs timeout ...); `status` is the HTTP to surface.
export class AiError extends Error {
  constructor(message, { code = 'ai_error', status = 502 } = {}) {
    super(message)
    this.name = 'AiError'
    this.code = code
    this.status = status
  }
}

function mapHttpError(status, bodyText) {
  let providerMsg = ''
  try {
    const j = JSON.parse(bodyText)
    providerMsg = j?.error?.message || j?.message || ''
  } catch {
    providerMsg = (bodyText || '').slice(0, 300)
  }
  if (status === 401 || status === 403) {
    return new AiError(providerMsg || 'Invalid API key', { code: 'invalid_key', status: 401 })
  }
  if (status === 429) {
    return new AiError(providerMsg || 'Rate limited by provider', { code: 'rate_limited', status: 429 })
  }
  return new AiError(providerMsg || `Provider error (${status})`, { code: 'provider_error', status: 502 })
}

/**
 * Call the provider's chat-completions endpoint.
 * @returns the first choice's `message` object ({ role, content, tool_calls? }).
 */
export async function chatCompletion({ provider, model, apiKey, messages, tools }) {
  const cfg = PROVIDERS[provider]
  if (!cfg) throw new AiError(`Unknown provider: ${provider}`, { code: 'bad_provider', status: 400 })
  if (!apiKey) throw new AiError('Missing API key', { code: 'invalid_key', status: 401 })

  const body = {
    model: model || cfg.defaultModel,
    messages,
    temperature: 0.2,
  }
  if (tools && tools.length) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
  }
  // OpenRouter attribution headers (optional, harmless elsewhere).
  if (provider === 'openrouter') {
    headers['X-Title'] = 'Healthcare CRM — Zeo'
  }

  let res
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new AiError('The AI provider took too long to respond', { code: 'timeout', status: 504 })
    }
    throw new AiError('Could not reach the AI provider', { code: 'network_error', status: 502 })
  }

  const text = await res.text()
  if (!res.ok) throw mapHttpError(res.status, text)

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new AiError('AI provider returned an unreadable response', { code: 'provider_error', status: 502 })
  }

  // A 200 can still carry a top-level error (e.g. a free model's upstream is
  // down on OpenRouter). Check before assuming a valid choice.
  if (data?.error) {
    throw new AiError(data.error?.message || 'Provider returned an error', { code: 'provider_error', status: 502 })
  }

  const message = data?.choices?.[0]?.message
  if (!message) {
    throw new AiError('AI provider returned no message', { code: 'empty_response', status: 502 })
  }
  return message
}
