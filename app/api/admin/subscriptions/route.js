import { randomBytes, createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isSubscriptionAdmin } from '@/lib/supabase/admin'
import { periodEnd, PLANS } from '@/lib/subscriptions'

async function adminForRequest() {
  const server = await createClient(); const { data: { user } } = await server.auth.getUser()
  if (!user || !isSubscriptionAdmin(user.email)) return null
  return { user, db: createAdminClient() }
}
const bad = () => Response.json({ error: 'Unauthorized' }, { status: 401 })

export async function GET(request) {
  const ctx = await adminForRequest(); if (!ctx) return bad()
  const search = new URL(request.url).searchParams.get('q')?.trim() || ''
  let query = ctx.db.from('subscriptions').select('*, organizations(id,name,email), subscription_plans(*), subscription_events(*)').order('updated_at', { ascending: false }).limit(100)
  if (search) query = query.ilike('organizations.name', `%${search}%`)
  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ subscriptions: data || [] })
}

export async function POST(request) {
  const ctx = await adminForRequest(); if (!ctx) return bad()
  const body = await request.json(); const { action, subscriptionId } = body
  if (action === 'generate_code') {
    if (!PLANS[body.planId] || !['month', 'year'].includes(body.interval)) return Response.json({ error: 'Invalid plan.' }, { status: 400 })
    const code = `FLOW-${randomBytes(6).toString('hex').toUpperCase()}`
    const code_hash = createHash('sha256').update(code).digest('hex')
    const { error } = await ctx.db.from('activation_codes').insert({ code_hash, plan_id: body.planId, interval: body.interval, note: body.note?.slice(0, 500) || null, expires_at: body.expiresAt || null, created_by: ctx.user.id })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ code }) // Returned once; only its hash is persisted.
  }
  if (action === 'record_payment') {
    if (!subscriptionId || !Number.isFinite(Number(body.amount))) return Response.json({ error: 'Invalid payment.' }, { status: 400 })
    const { error } = await ctx.db.from('subscription_payments').insert({ subscription_id: subscriptionId, amount: Number(body.amount), gst_amount: Number(body.gstAmount || 0), reference: body.reference?.slice(0, 200) || null, recorded_by: ctx.user.id })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    await ctx.db.from('subscription_events').insert({ subscription_id: subscriptionId, event_type: 'offline_payment_recorded', actor_user_id: ctx.user.id, metadata: { amount: Number(body.amount), gst: Number(body.gstAmount || 0) } })
    return Response.json({ ok: true })
  }
  return Response.json({ error: 'Unsupported action.' }, { status: 400 })
}

export async function PATCH(request) {
  const ctx = await adminForRequest(); if (!ctx) return bad()
  const body = await request.json(); const { action, subscriptionId } = body
  if (action === 'revoke_code') {
    const { error } = await ctx.db.from('activation_codes').update({ revoked_at: new Date().toISOString() }).eq('id', body.codeId).is('redeemed_at', null).is('revoked_at', null)
    return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true })
  }
  if (!subscriptionId) return Response.json({ error: 'Subscription required.' }, { status: 400 })
  const { data: current } = await ctx.db.from('subscriptions').select('*').eq('id', subscriptionId).single()
  if (!current) return Response.json({ error: 'Subscription not found.' }, { status: 404 })
  if (action === 'activate' || action === 'renew' || action === 'change_plan') {
    const planId = body.planId || current.plan_id; const interval = body.interval || current.interval
    if (!PLANS[planId] || !['month', 'year'].includes(interval)) return Response.json({ error: 'Invalid plan.' }, { status: 400 })
    const now = new Date(); const patch = { plan_id: planId, interval, status: 'active', current_period_starts_at: now.toISOString(), current_period_ends_at: periodEnd(interval, now), cancel_at_period_end: false, cancelled_at: null, updated_at: now.toISOString() }
    const { error } = await ctx.db.from('subscriptions').update(patch).eq('id', subscriptionId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    await ctx.db.from('subscription_events').insert({ subscription_id: subscriptionId, event_type: action, actor_user_id: ctx.user.id, metadata: { planId, interval } })
    return Response.json({ ok: true })
  }
  if (action === 'cancel') {
    const { error } = await ctx.db.from('subscriptions').update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq('id', subscriptionId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    await ctx.db.from('subscription_events').insert({ subscription_id: subscriptionId, event_type: 'cancel_scheduled', actor_user_id: ctx.user.id })
    return Response.json({ ok: true })
  }
  return Response.json({ error: 'Unsupported action.' }, { status: 400 })
}
