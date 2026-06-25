'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Pencil, MoreVertical, ExternalLink, Printer, Download, FileText, Search, ChevronDown, X, Check
} from 'lucide-react'
import { Button, Input, Textarea, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { createInvoice, updateInvoice, deleteInvoice, getPatients, getInvoices } from '@/lib/supabase/queries'
import { openInvoice, downloadInvoice } from '@/lib/invoiceDoc'
import { format } from 'date-fns'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import clsx from 'clsx'

const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2)
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const genInvNum = () => `INV-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 9000) + 1000}`

const calcAge = (dob) => {
  if (!dob) return null
  const b = new Date(dob)
  if (isNaN(b)) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 ? age : null
}

const STATUS_DOT = {
  Draft: '#9ca3af', Sent: '#3b82f6', 'Partially Paid': '#f59e0b',
  Paid: '#10b981', Overdue: '#ef4444', Cancelled: '#d1d5db',
}

// ── Service picker dropdown ───────────────────────────────────
function ServicePicker({ services, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!services.length) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors hover:bg-(--color-brand-50)"
        style={{ borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }}
      >
        <Plus size={12} /> Add from services
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-72 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-800 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Services</p>
          <div className="max-h-56 overflow-y-auto pb-1.5">
            {services.map(svc => (
              <button
                key={svc.id || svc.name}
                type="button"
                onClick={() => { onPick(svc); setOpen(false) }}
                className="w-full text-left flex items-center justify-between px-3 py-2.5 hover:bg-(--color-brand-50) transition-colors text-sm"
              >
                <div>
                  <p className="font-600" style={{ color: 'var(--color-text-primary)' }}>{svc.name}</p>
                  {svc.duration && <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{svc.duration} min</p>}
                </div>
                {svc.price != null && (
                  <span className="font-700 text-xs ml-4 shrink-0" style={{ color: 'var(--color-brand)' }}>{rupee(svc.price)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Searchable patient picker ─────────────────────────────────
function PatientPicker({ patients, value, onChange, loading }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
    else setQuery('')
  }, [open])

  const selected = patients.find(p => p.id === value)

  const filtered = patients.filter(p => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [
      p.first_name, p.last_name, `${p.first_name || ''} ${p.last_name || ''}`,
      p.email, p.phone, p.patient_code,
    ].some(v => (v || '').toLowerCase().includes(q))
  })

  const label = selected
    ? `${selected.first_name} ${selected.last_name || ''}`.trim()
    : (loading ? 'Loading patients…' : 'Select patient…')

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-(--color-brand)"
        style={{ borderColor: 'var(--color-border)', background: 'white', color: selected ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={15} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{ background: 'white', borderColor: 'var(--color-border)' }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search name, ID, phone, email…"
                className="w-full pl-8 pr-7 py-1.5 text-sm rounded-lg border outline-none focus:border-(--color-brand) transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-70">
                  <X size={13} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>No patients found</p>
            ) : (
              filtered.map(p => {
                const active = p.id === value
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onChange(p.id); setOpen(false) }}
                    className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 hover:bg-(--color-brand-50) transition-colors"
                    style={active ? { background: 'var(--color-brand-50)' } : {}}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {p.first_name} {p.last_name || ''}
                        {p.patient_code && <span className="ml-1.5 text-[10px] font-700" style={{ color: 'var(--color-text-muted)' }}>· {p.patient_code}</span>}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {[p.phone, p.email].filter(Boolean).join(' · ') || 'No contact info'}
                      </p>
                    </div>
                    {active && <Check size={15} className="shrink-0" style={{ color: 'var(--color-brand)' }} />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Line item row ─────────────────────────────────────────────
function LineItemRow({ item, onChange, onRemove, showRemove }) {
  const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)

  return (
    <tr className="group border-b" style={{ borderColor: 'var(--color-border)' }}>
      <td className="py-2 pr-3">
        <input
          value={item.description}
          onChange={e => onChange({ ...item, description: e.target.value })}
          placeholder="Item description…"
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:border-(--color-brand) transition-colors"
          style={{ borderColor: 'var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)' }}
        />
      </td>
      <td className="py-2 pr-3 w-24">
        <input
          type="number" min="0.01" step="any"
          value={item.quantity}
          onChange={e => {
            const qty = parseFloat(e.target.value) || 0
            onChange({ ...item, quantity: e.target.value, total: qty * (parseFloat(item.unit_price) || 0) })
          }}
          className="w-full px-3 py-2 text-sm rounded-lg border text-center outline-none focus:border-(--color-brand) transition-colors"
          style={{ borderColor: 'var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)' }}
          placeholder="1"
        />
      </td>
      <td className="py-2 pr-3 w-36">
        <input
          type="number" min="0" step="any"
          value={item.unit_price}
          onChange={e => {
            const price = parseFloat(e.target.value) || 0
            onChange({ ...item, unit_price: e.target.value, total: (parseFloat(item.quantity) || 1) * price })
          }}
          className="w-full px-3 py-2 text-sm rounded-lg border text-right outline-none focus:border-(--color-brand) transition-colors"
          style={{ borderColor: 'var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)' }}
          placeholder="0.00"
        />
      </td>
      <td className="py-2 w-32 text-right font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {rupee(total)}
      </td>
      <td className="py-2 w-10 text-center">
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            style={{ color: '#dc2626' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </td>
    </tr>
  )
}

// ── History item (left panel row) ─────────────────────────────
function HistoryItem({ inv, org, active, onEdit, onDelete, onReload }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isDraft = inv.status === 'Draft'
  const status = inv.effective_status || inv.status || 'Draft'
  const patient = `${inv.patients?.first_name || ''} ${inv.patients?.last_name || ''}`.trim()

  return (
    <div
      className={clsx('group relative px-3 py-2.5 rounded-xl border transition-colors', active ? '' : 'hover:bg-gray-50')}
      style={{
        borderColor: active ? 'var(--color-brand)' : 'var(--color-border)',
        background: active ? 'var(--color-brand-50)' : 'var(--color-surface)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[status] || '#9ca3af' }} />
            <p className="text-xs font-700 truncate" style={{ color: 'var(--color-text-primary)' }}>{inv.invoice_number}</p>
          </div>
          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{patient || 'No patient'}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-800" style={{ color: 'var(--color-text-primary)' }}>{rupee(inv.total)}</span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {format(new Date(inv.created_at), 'MMM d')}
            </span>
          </div>
        </div>

        {/* Action: draft → edit + badge; else → kebab */}
        <div className="shrink-0">
          {isDraft ? (
            <div className="flex flex-col items-end gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-800 uppercase tracking-wide" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                Draft
              </span>
              <button
                onClick={() => onEdit(inv)}
                className="p-1 rounded-md hover:bg-white transition-colors"
                style={{ color: 'var(--color-brand)' }}
                title="Edit draft"
              >
                <Pencil size={13} />
              </button>
            </div>
          ) : (
            <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false) }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1 rounded-md hover:bg-white transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                tabIndex={0}
              >
                <MoreVertical size={15} />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-7 z-50 min-w-[150px] rounded-xl border shadow-xl overflow-hidden"
                  style={{ background: 'white', borderColor: 'var(--color-border)' }}
                >
                  {[
                    { label: 'Open', icon: ExternalLink, fn: () => openInvoice(inv, org) },
                    { label: 'Print', icon: Printer, fn: () => openInvoice(inv, org, { print: true }) },
                    { label: 'Download', icon: Download, fn: () => downloadInvoice(inv, org) },
                  ].map(({ label, icon: Icon, fn }) => (
                    <button
                      key={label}
                      tabIndex={0}
                      onClick={() => { setMenuOpen(false); fn() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-600 hover:bg-gray-50 transition-colors text-left"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Icon size={13} style={{ color: 'var(--color-text-muted)' }} /> {label}
                    </button>
                  ))}
                  <div className="mx-2.5 my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
                  <button
                    tabIndex={0}
                    onClick={() => { setMenuOpen(false); onDelete(inv) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-600 hover:bg-red-50 transition-colors text-left text-red-600"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function NewInvoicePage() {
  const router = useRouter()
  const { org, orgId } = useOrg()

  const services = org?.settings?.services || []

  const [patients, setPatients] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [editingId, setEditingId] = useState(null)

  const blankItem = () => ({ id: uid(), description: '', quantity: '1', unit_price: '', total: 0 })

  const emptyForm = () => ({
    invoice_number: genInvNum(),
    patient_id: '',
    due_date: '',
    notes: '',
    discount: '',
    discount_type: 'flat',
    tax_rate: '',
    items: [blankItem()],
  })

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadInvoices = useCallback(() => {
    if (!orgId) return
    getInvoices({ orgId }).then(setInvoices).catch(() => {})
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    getPatients({ orgId }).then(p => {
      setPatients(p || [])
      setLoadingData(false)
    })
    loadInvoices()
  }, [orgId, loadInvoices])

  const subtotal = form.items.reduce((s, i) => s + (i.total || 0), 0)
  const discountAmt = form.discount_type === 'percent'
    ? subtotal * (parseFloat(form.discount) || 0) / 100
    : parseFloat(form.discount) || 0
  const taxable = subtotal - discountAmt
  const taxAmt = taxable * (parseFloat(form.tax_rate) || 0) / 100
  const total = taxable + taxAmt

  const updateItem = (idx, updated) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? updated : it) }))
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, blankItem()] }))

  const addService = (svc) => {
    const newItem = {
      id: uid(),
      description: svc.name,
      quantity: '1',
      unit_price: String(svc.price || ''),
      total: parseFloat(svc.price) || 0,
    }
    setForm(f => ({ ...f, items: [...f.items.filter(i => i.description || i.unit_price), newItem] }))
  }

  const resetForm = () => { setForm(emptyForm()); setEditingId(null) }

  const loadDraft = (inv) => {
    const items = (inv.invoice_items || []).map(it => ({
      id: uid(),
      description: it.description || '',
      quantity: String(it.quantity ?? 1),
      unit_price: String(it.unit_price ?? ''),
      total: Number(it.total) || 0,
    }))
    const sub = items.reduce((s, i) => s + (i.total || 0), 0)
    const disc = Number(inv.discount) || 0
    const taxableAmt = sub - disc
    const taxRate = taxableAmt > 0 && inv.tax ? +(Number(inv.tax) / taxableAmt * 100).toFixed(2) : ''
    setEditingId(inv.id)
    setForm({
      invoice_number: inv.invoice_number,
      patient_id: inv.patient_id || '',
      due_date: inv.due_date ? inv.due_date.slice(0, 10) : '',
      notes: inv.notes || '',
      discount: disc ? String(disc) : '',
      discount_type: 'flat',
      tax_rate: taxRate ? String(taxRate) : '',
      items: items.length ? items : [blankItem()],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (inv) => {
    const ok = await showConfirm({
      title: 'Delete invoice?',
      message: `${inv.invoice_number} will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete', variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteInvoice(inv.id)
      toast({ type: 'success', title: 'Invoice deleted' })
      if (editingId === inv.id) resetForm()
      loadInvoices()
    } catch (e) {
      toast({ type: 'error', title: 'Error', message: e.message })
    }
  }

  const submit = async (status) => {
    if (!form.patient_id) { toast({ type: 'error', title: 'Select a patient' }); return }
    const validItems = form.items.filter(i => i.description.trim() && (parseFloat(i.unit_price) || 0) > 0)
    if (!validItems.length) { toast({ type: 'error', title: 'Add at least one item with a price' }); return }
    setSaving(true)
    const payload = {
      patient_id: form.patient_id,
      invoice_number: form.invoice_number,
      subtotal,
      discount: discountAmt,
      discount_type: form.discount_type,
      amount: subtotal,
      tax: taxAmt,
      total,
      due_date: form.due_date || null,
      notes: form.notes || null,
      status,
      items: validItems.map(({ id: _id, ...i }) => ({
        description: i.description,
        quantity: parseFloat(i.quantity) || 1,
        unit_price: parseFloat(i.unit_price) || 0,
        total: i.total,
      })),
    }
    try {
      if (editingId) {
        await updateInvoice(editingId, payload)
        toast({ type: 'success', title: 'Invoice updated', message: form.invoice_number })
      } else {
        await createInvoice({ organization_id: orgId, ...payload })
        toast({ type: 'success', title: status === 'Draft' ? 'Draft saved' : 'Invoice created', message: form.invoice_number })
      }
      resetForm()
      loadInvoices()
    } catch (e) {
      toast({ type: 'error', title: 'Error', message: e.message })
    } finally {
      setSaving(false)
    }
  }

  const selectedPatient = patients.find(p => p.id === form.patient_id)
  const isEditing = !!editingId

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/billing')}
            className="flex items-center gap-1.5 text-sm font-600 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft size={16} /> Invoices
          </button>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>
            {isEditing ? 'Edit Draft' : 'New Invoice'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
              Cancel edit
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => submit('Draft')} disabled={saving}>
            {isEditing ? 'Save as Draft' : 'Save Draft'}
          </Button>
          <Button size="sm" onClick={() => submit('Sent')} disabled={saving} className="shadow-(--color-brand)/20 shadow-md">
            {saving ? <><Spinner size={14} /> Saving…</> : isEditing ? 'Update Invoice' : 'Generate Invoice'}
          </Button>
        </div>
      </div>

      {/* Body: history (left) + form (right) */}
      <div className="flex items-start" style={{ minHeight: 'calc(100vh - 57px)' }}>

        {/* ── Left: invoice history ── */}
        <aside
          className="w-[22%] min-w-[230px] max-w-[320px] shrink-0 border-r self-stretch overflow-y-auto"
          style={{ borderColor: 'var(--color-border)', background: 'white', maxHeight: 'calc(100vh - 57px)' }}
        >
          <div className="sticky top-0 px-4 py-3 border-b" style={{ background: 'white', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-800 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Recent Invoices</p>
          </div>
          <div className="p-3 space-y-2">
            {invoices.length === 0 ? (
              <div className="text-center py-10">
                <FileText size={22} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No invoices yet</p>
              </div>
            ) : (
              invoices.map(inv => (
                <HistoryItem
                  key={inv.id}
                  inv={inv}
                  org={org}
                  active={editingId === inv.id}
                  onEdit={loadDraft}
                  onDelete={handleDelete}
                  onReload={loadInvoices}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Right: invoice form ── */}
        <main className="flex-1 px-6 py-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

              {/* Bill To + meta */}
              <div className="px-8 py-5 border-b grid grid-cols-2 gap-6" style={{ borderColor: 'var(--color-border)' }}>
                {/* Bill To */}
                <div>
                  <p className="text-[10px] font-800 uppercase tracking-widest mb-2.5" style={{ color: 'var(--color-text-muted)' }}>Bill To</p>
                  <PatientPicker
                    patients={patients}
                    value={form.patient_id}
                    loading={loadingData}
                    onChange={id => setForm(f => ({ ...f, patient_id: id }))}
                  />
                  {selectedPatient && (() => {
                    const age = calcAge(selectedPatient.date_of_birth)
                    return (
                      <div className="mt-2 px-3 py-2.5 rounded-lg text-xs space-y-1" style={{ background: 'var(--color-surface-2)' }}>
                        <p className="font-700 truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {selectedPatient.first_name} {selectedPatient.last_name || ''}
                        </p>
                        {selectedPatient.patient_code && (
                          <p style={{ color: 'var(--color-text-muted)' }}>Patient ID: {selectedPatient.patient_code}</p>
                        )}
                        {age != null && (
                          <p style={{ color: 'var(--color-text-muted)' }}>Age: {age}</p>
                        )}
                        {selectedPatient.gender && (
                          <p className="capitalize" style={{ color: 'var(--color-text-muted)' }}>Gender: {selectedPatient.gender}</p>
                        )}
                        {selectedPatient.phone && (
                          <p style={{ color: 'var(--color-text-muted)' }}>Phone: {selectedPatient.phone}</p>
                        )}
                        {selectedPatient.email && (
                          <p className="truncate" style={{ color: 'var(--color-text-muted)' }}>Email: {selectedPatient.email}</p>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Meta fields */}
                <div className="space-y-3">
                  <p className="text-[10px] font-800 uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Details</p>
                  <div>
                    <p className="text-[10px] font-600 mb-1" style={{ color: 'var(--color-text-muted)' }}>Invoice Number</p>
                    <Input
                      value={form.invoice_number}
                      onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-600 mb-1" style={{ color: 'var(--color-text-muted)' }}>Due Date</p>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div className="px-8 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-800 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Items</p>
                  <ServicePicker services={services} onPick={addService} />
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                      {[['Description', ''], ['Qty', 'w-24'], ['Rate (₹)', 'w-36'], ['Amount', 'w-32 text-right'], ['', 'w-10']].map(([h, cls]) => (
                        <th key={h} className={clsx('pb-2.5 text-left text-[10px] font-800 uppercase tracking-widest', cls)} style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, idx) => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        onChange={updated => updateItem(idx, updated)}
                        onRemove={() => removeItem(idx)}
                        showRemove={form.items.length > 1}
                      />
                    ))}
                  </tbody>
                </table>

                <button
                  type="button"
                  onClick={addItem}
                  className="mt-3 flex items-center gap-1.5 text-xs font-700 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--color-brand)' }}
                >
                  <Plus size={13} /> Add item
                </button>
              </div>

              {/* Totals + discount + tax */}
              <div className="px-8 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex gap-10 justify-between flex-wrap">
                  {/* Discount & Tax inputs */}
                  <div className="flex gap-4 items-end">
                    <div className="w-44">
                      <p className="text-xs font-600 mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Discount</p>
                      <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                        <input
                          type="number" min="0"
                          value={form.discount}
                          onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                          placeholder="0"
                          className="flex-1 w-full px-3 py-2 text-sm outline-none bg-white"
                          style={{ color: 'var(--color-text-primary)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, discount_type: f.discount_type === 'flat' ? 'percent' : 'flat' }))}
                          className="px-3 text-xs font-800 border-l transition-colors"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }}
                        >
                          {form.discount_type === 'percent' ? '%' : '₹'}
                        </button>
                      </div>
                    </div>
                    <div className="w-32">
                      <p className="text-xs font-600 mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Tax (%)</p>
                      <input
                        type="number" min="0" max="100"
                        value={form.tax_rate}
                        onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:border-(--color-brand) transition-colors"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', background: 'white' }}
                      />
                    </div>
                  </div>

                  {/* Totals summary */}
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>Subtotal</span>
                      <span className="font-600">{rupee(subtotal)}</span>
                    </div>
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Discount {form.discount_type === 'percent' ? `(${form.discount}%)` : ''}</span>
                        <span className="font-600">−{rupee(discountAmt)}</span>
                      </div>
                    )}
                    {taxAmt > 0 && (
                      <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <span>Tax ({form.tax_rate}%)</span>
                        <span className="font-600">{rupee(taxAmt)}</span>
                      </div>
                    )}
                    <div
                      className="flex justify-between items-center pt-2.5 mt-1 border-t"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <span className="text-base font-700" style={{ color: 'var(--color-text-primary)' }}>Total</span>
                      <span className="text-2xl font-900" style={{ color: 'var(--color-brand)' }}>{rupee(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="px-8 py-5">
                <Textarea
                  label="Notes (optional)"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Terms, instructions, or any message to the patient…"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
