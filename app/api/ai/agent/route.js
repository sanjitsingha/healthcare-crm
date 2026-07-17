// The Zeo chat endpoint. Runs the read-only tool-calling loop against the org's
// configured provider. Staff access is gated by the per-user zeo_access flag
// (owner always allowed).
export const runtime = 'nodejs' // node:crypto is used to decrypt the key

import { requireAgentContext, canUseZeo } from '@/lib/ai/context'
import { loadAiConfig, ConfigKeyError } from '@/lib/ai/config'
import { runAgent } from '@/lib/ai/agent'
import { AiError } from '@/lib/ai/providers'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

// Minimal best-effort per-user rate limit. In-memory, so it's per-instance only
// (not shared across serverless workers) — enough to blunt accidental loops.
const RL_WINDOW_MS = 60_000
const RL_MAX = 20
const hits = new Map() // userId -> number[] (timestamps)
function rateLimited(userId) {
  const now = Date.now()
  const arr = (hits.get(userId) || []).filter((t) => now - t < RL_WINDOW_MS)
  arr.push(now)
  hits.set(userId, arr)
  return arr.length > RL_MAX
}

function validateMessages(raw) {
  if (!Array.isArray(raw)) return null
  const cleaned = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-20)
  if (!cleaned.length || cleaned[cleaned.length - 1].role !== 'user') return null
  return cleaned
}

export async function POST(req) {
  const ctx = await requireAgentContext()
  if (ctx.error) return json({ error: ctx.error }, ctx.status)
  if (!canUseZeo(ctx)) return json({ error: "You don't have access to Zeo. Ask an admin to enable it." }, 403)

  if (rateLimited(ctx.user.id)) {
    return json({ error: 'Too many requests — please slow down a moment.' }, 429)
  }

  let body = {}
  try { body = await req.json() } catch {}
  const messages = validateMessages(body.messages)
  if (!messages) return json({ error: 'Invalid messages' }, 400)

  let config
  try {
    config = await loadAiConfig(ctx.db, ctx.orgId, { requireActive: true })
  } catch (err) {
    if (err instanceof ConfigKeyError) {
      return json({ error: 'Zeo’s API key needs to be re-entered in settings.' }, 400)
    }
    throw err
  }
  if (!config) {
    return json({ error: "Zeo isn’t set up yet. An admin can configure it in Settings → Zeo." }, 400)
  }

  try {
    const { reply } = await runAgent({
      config,
      orgId: ctx.orgId,
      orgName: ctx.orgName,
      db: ctx.db,
      messages,
    })
    return json({ reply })
  } catch (err) {
    const status = err instanceof AiError ? err.status : 500
    const message = err instanceof AiError
      ? err.message
      : 'Zeo ran into a problem answering that. Please try again.'
    return json({ error: message, code: err.code }, status)
  }
}
