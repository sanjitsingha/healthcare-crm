'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, CheckCircle, Clock, TrendingUp, ReceiptText, Banknote, Printer, X, Filter, Check } from 'lucide-react'
import { Button, Card, Modal, Input, Select, Textarea, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { getInvoices, recordPayment, updateInvoiceStatus } from '@/lib/supabase/queries'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import clsx from 'clsx'

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const STATUS_STYLE = {
  Draft:            'bg-gray-50 text-gray-600 border-gray-200',
  Sent:             'bg-blue-50 text-blue-700 border-blue-200',
  'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200',
  Paid:             'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue:          'bg-red-50 text-red-700 border-red-200',
  Cancelled:        'bg-gray-50 text-gray-400 border-gray-100',
}

function StatusBadge({ status }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-600 border', STATUS_STYLE[status] || STATUS_STYLE.Draft)}>
      {status}
    </span>
  )
}

// ── Print invoice ─────────────────────────────────────────────
function printInvoice(inv, org) {
  const orgName = org?.name || 'Clinic'
  const orgAddr = [org?.address, org?.city, org?.state, org?.pincode].filter(Boolean).join(', ')
  const patient = `${inv.patients?.first_name || ''} ${inv.patients?.last_name || ''}`.trim()
  const items = inv.invoice_items || []
  const subtotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0) || Number(inv.subtotal) || Number(inv.amount) || 0
  const discount = Number(inv.discount) || 0
  const tax = Number(inv.tax) || 0
  const total = Number(inv.total) || 0
  const paid = Number(inv.paid_amount) || 0
  const balance = total - paid
  const isPaid = balance <= 0

  const itemRows = items.length
    ? items.map(i => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${i.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${rupee(i.unit_price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${rupee(i.total)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:12px;color:#9ca3af;text-align:center">No items</td></tr>`

  const watermark = isPaid
    ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-40deg);font-size:96px;font-weight:900;color:rgba(16,185,129,0.08);pointer-events:none;letter-spacing:8px;white-space:nowrap">PAID</div>`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${inv.invoice_number}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:800px;margin:auto}@media print{body{padding:20px}}</style>
  </head><body>
  ${watermark}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #e5e7eb;margin-bottom:28px">
    <div>
      <div style="font-size:22px;font-weight:800;color:#111">${orgName}</div>
      ${orgAddr ? `<div style="margin-top:4px;font-size:12px;color:#6b7280">${orgAddr}</div>` : ''}
      ${org?.phone ? `<div style="font-size:12px;color:#6b7280">${org.phone}${org?.email ? ' · ' + org.email : ''}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:30px;font-weight:900;letter-spacing:3px;color:#6366f1">INVOICE</div>
      <div style="font-size:13px;color:#374151;margin-top:2px">${inv.invoice_number}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:28px">
    <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Bill To</div><div style="font-weight:600">${patient || '—'}</div></div>
    ${inv.doctor_name ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Doctor</div><div style="font-weight:600">${inv.doctor_name}</div></div>` : '<div></div>'}
    <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Invoice Date</div><div style="font-weight:600">${format(new Date(inv.created_at), 'dd MMM yyyy')}</div></div>
    ${inv.due_date ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Due Date</div><div style="font-weight:600">${format(new Date(inv.due_date), 'dd MMM yyyy')}</div></div>` : '<div></div>'}
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <thead><tr style="background:#f9fafb">
      <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb">Description</th>
      <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;width:70px">Qty</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;width:110px">Rate</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;width:120px">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end">
    <div style="width:260px">
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#374151"><span>Subtotal</span><span>${rupee(subtotal)}</span></div>
      ${discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#374151"><span>Discount</span><span style="color:#10b981">-${rupee(discount)}</span></div>` : ''}
      ${tax > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#374151"><span>Tax</span><span>${rupee(tax)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:10px 0 5px;font-size:16px;font-weight:800;border-top:2px solid #e5e7eb;margin-top:6px"><span>Total</span><span>${rupee(total)}</span></div>
      ${paid > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#10b981"><span>Amount Paid</span><span>-${rupee(paid)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:8px 12px;margin-top:6px;border-radius:8px;font-size:14px;font-weight:700;background:${isPaid ? '#f0fdf4' : '#fff7ed'};color:${isPaid ? '#059669' : '#b45309'}"><span>Balance Due</span><span>${isPaid ? rupee(0) : rupee(balance)}</span></div>
    </div>
  </div>
  ${inv.notes ? `<div style="margin-top:24px;padding:12px 16px;background:#f9fafb;border-radius:8px;font-size:12px;color:#374151"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">Thank you for choosing ${orgName}. Please retain this invoice for your records.</div>
  <script>window.onload=()=>{window.print()}</script>
  </body></html>`

  const w = window.open('', '_blank', 'width=860,height=960')
  w.document.write(html)
  w.document.close()
}

// ── Record Payment Modal ──────────────────────────────────────
function RecordPaymentModal({ invoice, open, onClose, onRecorded, orgId }) {
  const balance = (invoice?.total || 0) - (invoice?.paid_amount || 0)
  const [form, setForm] = useState({ amount: '', method: 'Cash', date: format(new Date(), 'yyyy-MM-dd'), reference: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && invoice) setForm(f => ({ ...f, amount: balance > 0 ? String(balance) : '' }))
  }, [open, invoice?.id])

  if (!invoice) return null

  const save = async () => {
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { toast({ type: 'error', title: 'Enter a valid amount' }); return }
    if (amt > balance + 0.01) { toast({ type: 'error', title: `Maximum payable is ${rupee(balance)}` }); return }
    setSaving(true)
    try {
      await recordPayment({
        organization_id: orgId,
        invoice_id: invoice.id,
        amount: amt,
        payment_method: form.method,
        payment_date: new Date(form.date).toISOString(),
        notes: [form.reference && `Ref: ${form.reference}`, form.notes].filter(Boolean).join(' · ') || null,
      })
      toast({ type: 'success', title: 'Payment recorded', message: `${rupee(amt)} via ${form.method}` })
      onRecorded()
      onClose()
    } catch (e) {
      toast({ type: 'error', title: 'Error', message: e.message })
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" size="sm">
      <div className="space-y-4">
        <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--color-surface-2)' }}>
          <div className="flex justify-between text-sm">
            <span className="font-600" style={{ color: 'var(--color-text-primary)' }}>{invoice.invoice_number}</span>
            <span className="font-700" style={{ color: 'var(--color-text-primary)' }}>{rupee(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>{invoice.patients?.first_name} {invoice.patients?.last_name || ''}</span>
            <span>Paid {rupee(invoice.paid_amount)} · Balance <span className="font-700 text-amber-600">{rupee(balance)}</span></span>
          </div>
        </div>

        <Input label="Amount (₹) *" type="number" min="0.01" step="0.01" value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder={`Max ${rupee(balance)}`} />

        <Select label="Payment Method" value={form.method}
          onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
          options={['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'].map(m => ({ value: m, label: m }))} />

        <Input label="Payment Date" type="date" value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />

        <Input label="Reference / Transaction ID (optional)" value={form.reference}
          onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
          placeholder="UPI ref, cheque no., TXN ID…" />

        <Textarea label="Notes (optional)" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />

        <div className="flex justify-end gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.amount}>
            {saving ? 'Saving…' : 'Record Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────
const FILTERS = ['All', 'Unpaid', 'Overdue', 'Paid', 'Cancelled']

export default function BillingPage() {
  const router = useRouter()
  const { org, orgId } = useOrg()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const [payInvoice, setPayInvoice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setInvoices(await getInvoices()) }
    catch { setInvoices([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = invoices
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.invoice_number?.toLowerCase().includes(q) ||
        `${i.patients?.first_name} ${i.patients?.last_name || ''}`.toLowerCase().includes(q) ||
        i.doctor_name?.toLowerCase().includes(q)
      )
    }
    if (filter === 'Unpaid') list = list.filter(i => !['Paid', 'Cancelled', 'Overdue'].includes(i.effective_status))
    else if (filter === 'Overdue') list = list.filter(i => i.effective_status === 'Overdue')
    else if (filter === 'Paid') list = list.filter(i => i.effective_status === 'Paid')
    else if (filter === 'Cancelled') list = list.filter(i => i.effective_status === 'Cancelled')
    return list
  }, [invoices, search, filter])

  const stats = useMemo(() => {
    const billed = invoices.reduce((s, i) => s + (i.total || 0), 0)
    const collected = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0)
    const rate = billed > 0 ? Math.round((collected / billed) * 100) : 0
    const overdue = invoices.filter(i => i.effective_status === 'Overdue').length
    return { billed, collected, outstanding: billed - collected, rate, overdue }
  }, [invoices])

  const cancelInvoice = async (inv) => {
    const ok = await showConfirm({ title: 'Cancel invoice?', message: `${inv.invoice_number} will be marked Cancelled.`, confirmLabel: 'Cancel Invoice', variant: 'danger' })
    if (!ok) return
    try {
      await updateInvoiceStatus(inv.id, 'Cancelled')
      toast({ type: 'success', title: 'Invoice cancelled' })
      load()
    } catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Billing & Finance</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Invoices, payments and financial overview</p>
        </div>
        <Button onClick={() => router.push('/billing/new')} style={{ boxShadow: '0 4px 14px -2px color-mix(in srgb, var(--color-brand) 30%, transparent)' }}>
          <Plus size={16} /> Create Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4" style={{ borderLeftColor: 'var(--color-brand)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--color-brand-50)' }}>
              <ReceiptText size={18} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Total Billed</p>
              <p className="text-xl font-900" style={{ color: 'var(--color-text-primary)' }}>{rupee(stats.billed)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50"><CheckCircle size={18} className="text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Collected</p>
              <p className="text-xl font-900 text-emerald-600">{rupee(stats.collected)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50"><Clock size={18} className="text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Outstanding</p>
              <p className="text-xl font-900 text-amber-600">{rupee(stats.outstanding)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50"><TrendingUp size={18} className="text-indigo-600" /></div>
            <div>
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Collection Rate</p>
              <p className="text-xl font-900 text-indigo-600">{stats.rate}%</p>
              {stats.overdue > 0 && <p className="text-[10px] text-red-500 font-600">{stats.overdue} overdue</p>}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice #, patient or doctor…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none focus:ring-2 transition-all"
            style={{ borderColor: 'var(--color-border)', background: 'white' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:opacity-70">
              <X size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>
        <div className="relative shrink-0"
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFilterOpen(false) }}>
          <button onClick={() => setFilterOpen(o => !o)}
            className="relative flex items-center gap-1.5 p-2 text-sm font-600 transition-opacity hover:opacity-70"
            style={{ color: filter !== 'All' ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>
            <Filter size={18} />
            {filter === 'All' ? 'Filter' : filter}
          </button>
          {filterOpen && (
            <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-xl border shadow-lg overflow-hidden"
              style={{ borderColor: 'var(--color-border)', background: 'white' }}>
              {FILTERS.map(f => (
                <button key={f} tabIndex={0}
                  onClick={() => { setFilter(f); setFilterOpen(false) }}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-600 text-left transition-colors hover:bg-gray-50"
                  style={{ color: filter === f ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}>
                  {f}
                  {filter === f && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                  {['Invoice #', 'Patient', 'Items', 'Date', 'Due Date', 'Total', 'Paid', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-800 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filtered.map(inv => {
                  const itemCount = inv.invoice_items?.length || 0
                  const canPay = !['Paid', 'Cancelled'].includes(inv.effective_status)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-700" style={{ color: 'var(--color-brand)' }}>
                        <button onClick={() => printInvoice(inv, org)} className="hover:underline">{inv.invoice_number}</button>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-600" style={{ color: 'var(--color-text-primary)' }}>
                          {inv.patients?.first_name} {inv.patients?.last_name || ''}
                        </p>
                        {inv.doctor_name && <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{inv.doctor_name}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {itemCount > 0 ? (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inv.invoice_items[0].description}</p>
                            {itemCount > 1 && <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>+{itemCount - 1} more</p>}
                          </div>
                        ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {format(new Date(inv.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: inv.effective_status === 'Overdue' ? '#dc2626' : 'var(--color-text-secondary)' }}>
                        {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-800" style={{ color: 'var(--color-text-primary)' }}>{rupee(inv.total)}</td>
                      <td className="px-4 py-3.5 text-xs font-600 text-emerald-600">
                        {inv.paid_amount > 0 ? rupee(inv.paid_amount) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={inv.effective_status} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {canPay && (
                            <button onClick={() => setPayInvoice(inv)}
                              className="btn btn-primary btn-sm">
                              <Banknote size={12} /> Pay
                            </button>
                          )}
                          <button onClick={() => printInvoice(inv, org)}
                            className="btn btn-secondary btn-icon">
                            <Printer size={13} />
                          </button>
                          {!['Cancelled', 'Paid'].includes(inv.effective_status) && (
                            <button onClick={() => cancelInvoice(inv)}
                              className="btn btn-secondary btn-icon">
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <ReceiptText size={28} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-600" style={{ color: 'var(--color-text-muted)' }}>
                {search || filter !== 'All' ? 'No invoices match your filter.' : 'No invoices yet.'}
              </p>
              {!search && filter === 'All' && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push('/billing/new')}>
                  Create your first invoice
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      <RecordPaymentModal
        invoice={payInvoice}
        open={!!payInvoice}
        onClose={() => setPayInvoice(null)}
        onRecorded={load}
        orgId={orgId}
      />
    </div>
  )
}
