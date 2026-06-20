import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function getOrgByApiKey(apiKey) {
  const supabase = createAdminClient()

  // New multi-key format: settings.api_keys array
  const { data: d1 } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .filter('settings', 'cs', JSON.stringify({ api_keys: [{ key: apiKey }] }))
    .eq('status', 'Active')
    .maybeSingle()

  if (d1) {
    const keyObj = (d1.settings?.api_keys || []).find(k => k.key === apiKey)
    if (!keyObj || !keyObj.active) return null
    if (keyObj.expires_at && new Date(keyObj.expires_at) < new Date()) return null
    return { ...d1, api_key_entity: keyObj.entity || 'leads' }
  }

  // Legacy single-key fallback
  const { data: d2 } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .filter('settings->>public_api_key', 'eq', apiKey)
    .eq('status', 'Active')
    .maybeSingle()
  return d2 ? { ...d2, api_key_entity: 'leads' } : null
}

export function isSubscriptionAdmin(email) {
  return (process.env.SUBSCRIPTION_ADMIN_EMAILS || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
    .includes((email || '').toLowerCase())
}
