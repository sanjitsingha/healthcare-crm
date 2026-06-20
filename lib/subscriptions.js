export const PLANS = {
  starter: { id: 'starter', name: 'Starter', monthly: 1499, annual: 14990, seats: 3, capabilities: ['core'] },
  growth: { id: 'growth', name: 'Growth', monthly: 3499, annual: 34990, seats: 10, capabilities: ['core', 'reports', 'automation', 'pharmacy', 'roles'] },
  enterprise: { id: 'enterprise', name: 'Enterprise', monthly: 7999, annual: 79990, seats: null, capabilities: ['core', 'reports', 'automation', 'pharmacy', 'roles', 'custom_modules', 'integrations'] },
}

export function effectiveStatus(subscription, now = new Date()) {
  if (!subscription) return 'expired'
  const at = now.getTime()
  if (subscription.status === 'cancelled') return 'cancelled'
  if (subscription.status === 'active' && (!subscription.current_period_ends_at || new Date(subscription.current_period_ends_at).getTime() >= at)) return 'active'
  if (subscription.trial_ends_at && new Date(subscription.trial_ends_at).getTime() >= at) return 'trialing'
  if (subscription.grace_ends_at && new Date(subscription.grace_ends_at).getTime() >= at) return 'grace'
  return 'expired'
}

export function subscriptionAccess(subscription) {
  const status = effectiveStatus(subscription)
  const plan = PLANS[subscription?.plan_id] || PLANS.enterprise
  const active = ['active', 'trialing', 'grace'].includes(status)
  const trial = status === 'trialing' || status === 'grace'
  const capabilities = trial ? PLANS.enterprise.capabilities : plan.capabilities
  return { status, writable: active, capabilities, seatLimit: trial ? null : plan.seats, plan }
}

export function periodEnd(interval, from = new Date()) {
  const end = new Date(from)
  if (interval === 'year') end.setFullYear(end.getFullYear() + 1)
  else end.setMonth(end.getMonth() + 1)
  return end.toISOString()
}
