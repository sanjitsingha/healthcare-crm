// Per-org Zeo config: GET (flags only), POST (validate + encrypt + upsert),
// DELETE. Admin (owner or settings permission) only for writes.
export const runtime = 'nodejs' // node:crypto is used downstream

import { requireAgentContext, canManageConfig } from '@/lib/ai/context'
import { getConfigRow, saveAiConfig, deleteAiConfig, loadAiConfig } from '@/lib/ai/config'
import { PROVIDERS, PROVIDER_IDS, chatCompletion, AiError } from '@/lib/ai/providers'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function GET() {
  const ctx = await requireAgentContext()
  if (ctx.error) return json({ error: ctx.error }, ctx.status)
  if (!canManageConfig(ctx)) return json({ error: 'Forbidden' }, 403)

  const row = await getConfigRow(ctx.db, ctx.orgId)
  return json({
    configured: !!row,
    provider: row?.provider || null,
    model: row?.model || null,
    system_prompt: row?.system_prompt || null,
    is_active: row?.is_active ?? false,
    has_key: !!row?.api_key_encrypted,
    providers: PROVIDER_IDS.map((id) => ({
      id,
      label: PROVIDERS[id].label,
      default_model: PROVIDERS[id].defaultModel,
      key_url: PROVIDERS[id].keyUrl,
    })),
  })
}

export async function POST(req) {
  const ctx = await requireAgentContext()
  if (ctx.error) return json({ error: ctx.error }, ctx.status)
  if (!canManageConfig(ctx)) return json({ error: 'Forbidden' }, 403)

  let body = {}
  try { body = await req.json() } catch {}
  const { provider, model, system_prompt, is_active, api_key, test } = body

  if (!PROVIDER_IDS.includes(provider)) {
    return json({ error: 'Invalid provider' }, 400)
  }
  const finalModel = (model || '').trim() || PROVIDERS[provider].defaultModel
  if (!finalModel) return json({ error: 'Model is required' }, 400)

  // Resolve the effective key: use the freshly-entered one, else the stored one.
  const existing = await getConfigRow(ctx.db, ctx.orgId)
  let effectiveKey = typeof api_key === 'string' && api_key.trim() ? api_key.trim() : null
  const providerOrModelChanged = existing && (existing.provider !== provider || existing.model !== finalModel)
  if (!effectiveKey) {
    // No new key sent — reuse stored key by decrypting via loadAiConfig.
    try {
      const loaded = await loadAiConfig(ctx.db, ctx.orgId)
      effectiveKey = loaded?.apiKey || null
    } catch {
      effectiveKey = null
    }
  }
  if (!effectiveKey) {
    return json({ error: 'An API key is required' }, 400)
  }

  // Validate against the provider only when reachability-affecting fields changed
  // (new key, or changed provider/model), or when the caller explicitly tests.
  const keyIsNew = typeof api_key === 'string' && !!api_key.trim()
  if (test || keyIsNew || providerOrModelChanged) {
    try {
      await chatCompletion({
        provider,
        model: finalModel,
        apiKey: effectiveKey,
        messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
      })
    } catch (err) {
      const status = err instanceof AiError ? err.status : 502
      return json({ error: err.message || 'Could not validate the key', code: err.code }, status)
    }
    if (test) {
      // Test-only: don't persist, just confirm reachability.
      return json({ ok: true, tested: true })
    }
  }

  const saved = await saveAiConfig(ctx.db, ctx.orgId, {
    provider,
    model: finalModel,
    systemPrompt: system_prompt ?? null,
    isActive: is_active ?? true,
    apiKey: keyIsNew ? api_key.trim() : undefined, // undefined = keep stored key
    createdBy: existing ? undefined : ctx.user.id,
  })

  return json({ ok: true, provider: saved.provider, model: saved.model, is_active: saved.is_active, has_key: !!saved.api_key_encrypted })
}

export async function DELETE() {
  const ctx = await requireAgentContext()
  if (ctx.error) return json({ error: ctx.error }, ctx.status)
  if (!canManageConfig(ctx)) return json({ error: 'Forbidden' }, 403)

  await deleteAiConfig(ctx.db, ctx.orgId)
  return json({ ok: true })
}
