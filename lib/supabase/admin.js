import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function getOrgByApiKey(apiKey) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .filter('settings->>public_api_key', 'eq', apiKey)
    .eq('status', 'Active')
    .maybeSingle()
  return data || null
}

export function isSubscriptionAdmin(email) {
  return (process.env.SUBSCRIPTION_ADMIN_EMAILS || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
    .includes((email || '').toLowerCase())
}
