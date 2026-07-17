'use client'
import SubscriptionPanel from '@/components/crm/SubscriptionPanel'

export default function SubscriptionPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-800">Subscription</h1>
        <p className="text-sm text-(--color-text-muted)">Manage your clinic workspace plan and access.</p>
      </div>
      <SubscriptionPanel />
    </div>
  )
}
