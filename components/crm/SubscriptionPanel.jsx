'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, Button, Input } from '@/components/ui'

// Subscription plan details + activation-code redemption. Shared by the
// standalone Settings → Subscription page and the Account page's Subscription tab.
export default function SubscriptionPanel() {
  const [data, setData]       = useState(null)
  const [code, setCode]       = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy]       = useState(false)

  const load = () => fetch('/api/subscription').then(r => r.json()).then(setData)
  useEffect(() => { load() }, [])

  const redeem = async (e) => {
    e.preventDefault()
    setBusy(true); setMessage('')
    const r = await fetch('/api/subscription/redeem', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const d = await r.json()
    setMessage(d.ok ? 'Activation code applied. Your plan is active.' : d.error || 'Unable to redeem code.')
    if (d.ok) { setCode(''); load() }
    setBusy(false)
  }

  if (!data) return <div className="text-sm text-(--color-text-muted)">Loading subscription…</div>
  if (!data.access) {
    return (
      <Card className="p-5">
        <p className="text-sm text-(--color-text-muted)">
          Subscription data is not available yet. Apply the subscription migration in Supabase, then refresh this page.
        </p>
      </Card>
    )
  }

  const { subscription, access, seatsUsed, isContact } = data
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="text-xs font-700 uppercase text-(--color-text-muted)">Current plan</p>
        <p className="mt-1 text-2xl font-800">
          {access.plan.name} <span className="text-sm font-600 text-(--color-text-muted)">· {access.status}</span>
        </p>
        <p className="mt-3 text-sm">
          Seats used: {seatsUsed}{access.seatLimit ? ` of ${access.seatLimit}` : ' (unlimited)'}
        </p>
        {subscription?.current_period_ends_at && (
          <p className="mt-1 text-sm">Current access ends {new Date(subscription.current_period_ends_at).toLocaleDateString()}</p>
        )}
        {access.status === 'grace' && (
          <p className="mt-3 text-sm text-amber-700">Your trial has ended. Contact sales before your grace period ends to avoid read-only access.</p>
        )}
        {!access.writable && (
          <p className="mt-3 text-sm text-red-700">This workspace is read-only. Activate or renew to continue editing.</p>
        )}
        <Link href="/contact?topic=billing" className="mt-5 inline-block text-sm font-700 text-(--color-brand)">Contact sales →</Link>
      </Card>

      {isContact && (
        <Card className="p-5">
          <h2 className="font-700">Have an activation code?</h2>
          <p className="mt-1 text-sm text-(--color-text-muted)">Enter the code supplied by Flowra. Each code may be redeemed once.</p>
          <form onSubmit={redeem} className="mt-4 flex gap-2">
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="FLOW-XXXX" />
            <Button disabled={busy || !code.trim()}>{busy ? 'Applying…' : 'Activate'}</Button>
          </form>
          {message && <p className="mt-3 text-sm">{message}</p>}
        </Card>
      )}
    </div>
  )
}
