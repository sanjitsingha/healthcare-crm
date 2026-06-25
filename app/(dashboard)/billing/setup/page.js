'use client'
import { Landmark } from 'lucide-react'
import PaymentAccountsManager from '@/components/crm/PaymentAccountsManager'

export default function BillingSetupPage() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
          <Landmark size={18} style={{ color: 'var(--color-brand)' }} />
        </div>
        <div>
          <h1 className="text-xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Payment Setup</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Bank details &amp; UPI QR codes to show or print on invoices</p>
        </div>
      </div>
      <PaymentAccountsManager />
    </div>
  )
}
