// SERVER-ONLY. Load/save the per-org AI agent config, handling encryption.
// The api key is stored AES-256-GCM encrypted in ai_agent_configs and decrypted
// only here, at call time. It is never returned to the client.
import { encrypt, decrypt } from './crypto'
import { PROVIDERS } from './providers'

const TABLE = 'ai_agent_configs'

// Custom error so the route can tell "key set but undecryptable" (usually a
// changed AI_ENCRYPTION_KEY) apart from "not configured".
export class ConfigKeyError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConfigKeyError'
  }
}

/**
 * Load a ready-to-use config for the org, or null if none exists.
 * @param {object}  db      service-role client
 * @param {string}  orgId
 * @param {object}  opts    { requireActive?: boolean }
 * @returns decrypted config { provider, model, apiKey, systemPrompt, isActive } | null
 */
export async function loadAiConfig(db, orgId, { requireActive = false } = {}) {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  if (requireActive && !data.is_active) return null

  let apiKey = null
  if (data.api_key_encrypted) {
    try {
      apiKey = decrypt(data.api_key_encrypted)
    } catch {
      throw new ConfigKeyError('Stored API key could not be decrypted — please re-enter it.')
    }
  }

  return {
    provider: data.provider,
    model: data.model || PROVIDERS[data.provider]?.defaultModel || '',
    apiKey,
    systemPrompt: data.system_prompt || null,
    isActive: data.is_active,
  }
}

/** Return the raw row (no decryption) — used by GET to build has_key flags. */
export async function getConfigRow(db, orgId) {
  const { data, error } = await db.from(TABLE).select('*').eq('organization_id', orgId).maybeSingle()
  if (error) throw new Error(error.message)
  return data || null
}

/**
 * Upsert the org config. `apiKey` semantics: a non-empty string sets/replaces
 * (encrypted); undefined/null leaves the stored key unchanged.
 */
export async function saveAiConfig(db, orgId, { provider, model, systemPrompt, isActive, apiKey, createdBy }) {
  const row = {
    organization_id: orgId,
    provider,
    model,
    system_prompt: systemPrompt ?? null,
    is_active: isActive ?? true,
    updated_at: new Date().toISOString(),
  }
  if (createdBy) row.created_by = createdBy
  if (typeof apiKey === 'string' && apiKey.trim()) {
    row.api_key_encrypted = encrypt(apiKey.trim())
  }

  const { data, error } = await db
    .from(TABLE)
    .upsert(row, { onConflict: 'organization_id' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteAiConfig(db, orgId) {
  const { error } = await db.from(TABLE).delete().eq('organization_id', orgId)
  if (error) throw new Error(error.message)
}
