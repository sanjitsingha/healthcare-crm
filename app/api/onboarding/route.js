import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request) {
  const server = await createClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.name?.trim() || !body.phone?.trim() || !body.city?.trim()) return Response.json({ error: 'Organization name, phone, and city are required.' }, { status: 400 })
  try {
    const admin = createAdminClient()
    const { data: org, error } = await admin.from('organizations').insert({
      name: body.name.trim(), type: body.type || 'Clinic', email: body.email || user.email, phone: body.phone.trim(),
      website: body.website?.trim() || null, address: body.address?.trim() || null, city: body.city.trim(), state: body.state || null,
      pincode: body.pincode?.trim() || null, country: body.country || 'India', status: 'Active',
      settings: { specialty: body.specialty || null, registration_number: body.registration_number?.trim() || null, staff_count: body.staff_count ? Number(body.staff_count) : null },
    }).select().single()
    if (error) throw error
    const now = new Date(); const trialEnd = new Date(now); trialEnd.setDate(trialEnd.getDate() + 14); const graceEnd = new Date(now); graceEnd.setDate(graceEnd.getDate() + 21)
    const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, organization_id: org.id, full_name: user.user_metadata?.full_name || user.email, avatar_url: user.user_metadata?.avatar_url || null })
    if (profileError) throw profileError
    const { error: subscriptionError } = await admin.from('subscriptions').insert({ organization_id: org.id, plan_id: 'enterprise', interval: 'month', status: 'trialing', trial_ends_at: trialEnd.toISOString(), grace_ends_at: graceEnd.toISOString(), subscription_contact_user_id: user.id })
    if (subscriptionError) throw subscriptionError
    return Response.json({ organization: org })
  } catch (error) { return Response.json({ error: error.message || 'Unable to create workspace.' }, { status: 500 }) }
}
