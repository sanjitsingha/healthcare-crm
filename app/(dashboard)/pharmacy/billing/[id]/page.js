'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { getPharmacySale } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import InvoiceDocument, { InvoiceSheet, defaultInvoiceTemplate } from '@/components/pharmacy/InvoiceDocument'

export default function InvoicePage({ params }) {
  const { id } = use(params)
  const { org } = useOrg()
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [accent, setAccent] = useState('#2563eb')

  useEffect(() => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim()
    if (c) setAccent(c)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    getPharmacySale(id)
      .then(d => { if (active) setSale(d) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  if (loading) return <div className="flex justify-center py-32"><Spinner size={32} /></div>
  if (error || !sale) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Invoice not found.</p>
        <Link href="/pharmacy/billing" className="mt-2 inline-block text-xs font-600" style={{ color: 'var(--color-brand)' }}>← Back to billing</Link>
      </div>
    )
  }

  const template = org?.settings?.invoice_templates?.medicine_invoice || defaultInvoiceTemplate()

  return (
    <>
      {/* Print isolation: hide everything except the A4 sheet, keep its background */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #invoice-sheet, #invoice-sheet * { visibility: visible !important; }
          #invoice-sheet {
            position: absolute; left: 0; top: 0;
            margin: 0 !important; box-shadow: none !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print flex items-center justify-between gap-3 mb-5">
        <Link href="/pharmacy/billing" className="btn btn-secondary btn-md">
          <ArrowLeft size={15} /> Back
        </Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary btn-md">
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {/* A4 sheet — centred on screen, exact A4 footprint */}
      <div className="flex justify-center pb-10">
        <div style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
          <InvoiceSheet template={template} idAttr="invoice-sheet">
            <InvoiceDocument sale={sale} template={template} accent={accent} />
          </InvoiceSheet>
        </div>
      </div>
    </>
  )
}
