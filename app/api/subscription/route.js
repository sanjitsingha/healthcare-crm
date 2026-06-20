import { createClient } from '@/lib/supabase/server'
import { subscriptionAccess } from '@/lib/subscriptions'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id) return Response.json({ error: 'No workspace' }, { status: 404 })
  const { data: subscription, error } = await supabase.from('subscriptions').select('*, subscription_plans(*)').eq('organization_id', profile.organization_id).maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id)
  return Response.json({ subscription, access: subscriptionAccess(subscription), seatsUsed: count || 0, isContact: subscription?.subscription_contact_user_id === user.id })
}
