import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Resolve an org from a public API key. Only the multi-key format
// (settings.api_keys[]) is honored — a key authenticates ONLY if it exists in
// the array, is active, and is not past its expiry. (The legacy single
// settings.public_api_key field is intentionally no longer accepted.)
export async function getOrgByApiKey(apiKey) {
  if (!apiKey) return null
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .filter('settings', 'cs', JSON.stringify({ api_keys: [{ key: apiKey }] }))
    .eq('status', 'Active')
    .maybeSingle()

  if (!data) return null
  const keyObj = (data.settings?.api_keys || []).find(k => k.key === apiKey)
  if (!keyObj || !keyObj.active) return null
  if (keyObj.expires_at) {
    const exp = new Date(keyObj.expires_at)
    exp.setHours(23, 59, 59, 999) // valid through the end of the chosen day
    if (exp.getTime() < Date.now()) return null
  }
  return { ...data, api_key_entity: keyObj.entity || 'leads' }
}

export function isSubscriptionAdmin(email) {
  return (process.env.SUBSCRIPTION_ADMIN_EMAILS || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
    .includes((email || '').toLowerCase())
}
