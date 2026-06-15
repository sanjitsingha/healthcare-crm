'use client'
import Link from 'next/link'
import { Receipt, ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import { INVOICE_LAYOUTS } from '@/components/pharmacy/InvoiceDocument'

// Catalog of designable document types. Only the pharmacy invoice exists today;
// new document types (prescriptions, lab reports…) slot in here later.
const TEMPLATE_TYPES = [
  {
    key: 'medicine_invoice',
    href: '/settings/templates/medicine-invoice',
    icon: Receipt,
    name: 'Medicine Invoice',
    desc: 'The printable PDF bill generated for every pharmacy sale.',
    settingsKey: 'medicine_invoice',
  },
]

export default function TemplatesPage() {
  const { org } = useOrg()
  const templates = org?.settings?.invoice_templates || {}

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Templates</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Design the documents your workspace prints — pick a layout, set your header &amp; footer, and activate.
        </p>
      </div>

      <div className="grid gap-3">
        {TEMPLATE_TYPES.map(t => {
          const cfg = templates[t.settingsKey]
          const active = !!cfg?.active
          const layoutName = INVOICE_LAYOUTS.find(l => l.id === cfg?.layout)?.name
          return (
            <Link key={t.key} href={t.href}
              className="group flex items-center gap-4 p-4 rounded-2xl border border-(--color-border) transition-all hover:border-(--color-brand) hover:shadow-sm"
              style={{ background: 'var(--color-surface)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                <t.icon size={20} style={{ color: 'var(--color-brand)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{t.name}</p>
                  {active ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
                      <CheckCircle2 size={10} /> Active{layoutName ? ` · ${layoutName}` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                      <Circle size={10} /> Not set up
                    </span>
                  )}
                </div>
                <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{t.desc}</p>
              </div>
              <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
