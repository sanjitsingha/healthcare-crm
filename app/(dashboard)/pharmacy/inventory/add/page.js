'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Pill, Hash, Boxes, CalendarClock, IndianRupee, Warehouse, Loader2,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import {
  createPharmacyItem, updatePharmacyItem, getPharmacyItem, peekPharmacyItemCode,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'

const CATEGORIES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Cream', 'Drops', 'Inhaler', 'Powder', 'Sachet', 'Suppository', 'Other']
const UNITS = ['Strip', 'Tablet', 'Capsule', 'Bottle', 'Vial', 'Ampoule', 'Tube', 'Box', 'Piece', 'Sachet', 'ml', 'gm']

const EMPTY = {
  name: '', generic_name: '', manufacturer: '', category: '', unit: '',
  quantity: '', reorder_level: '',
  batch_number: '', manufacture_date: '', expiry_date: '',
  purchase_price: '', mrp: '', tax_percent: '', discount_percent: '', hsn_code: '',
  rack_location: '', supplier: '', barcode: '', prescription_required: false, notes: '',
}

const numFields = ['quantity', 'reorder_level', 'purchase_price', 'mrp', 'tax_percent', 'discount_percent']

function InventoryFormInner() {
  const router = useRouter()
  const params = useSearchParams()
  const editId = params.get('id')
  const { orgId } = useOrg()

  const [form, setForm] = useState(EMPTY)
  const [code, setCode] = useState(null)        // existing or previewed item code
  const [loading, setLoading] = useState(!!editId)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load existing item (edit) or preview the next auto ID (new)
  useEffect(() => {
    if (!orgId) return
    let active = true
    if (editId) {
      setLoading(true)
      getPharmacyItem(editId)
        .then(it => {
          if (!active || !it) return
          setForm({
            name: it.name || '', generic_name: it.generic_name || '', manufacturer: it.manufacturer || '',
            category: it.category || '', unit: it.unit || '',
            quantity: it.quantity ?? '', reorder_level: it.reorder_level ?? '',
            batch_number: it.batch_number || '',
            manufacture_date: it.manufacture_date || '', expiry_date: it.expiry_date || '',
            purchase_price: it.purchase_price ?? '', mrp: it.mrp ?? '',
            tax_percent: it.tax_percent ?? '', discount_percent: it.discount_percent ?? '',
            hsn_code: it.hsn_code || '', rack_location: it.rack_location || '',
            supplier: it.supplier || '', barcode: it.barcode || '',
            prescription_required: !!it.prescription_required, notes: it.notes || '',
          })
          setCode(it.item_code || null)
        })
        .catch(() => toast({ type: 'error', title: 'Could not load item' }))
        .finally(() => { if (active) setLoading(false) })
    } else {
      peekPharmacyItemCode(orgId).then(c => { if (active) setCode(c) }).catch(() => {})
    }
    return () => { active = false }
  }, [editId, orgId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast({ type: 'error', title: 'Name is required' }); return }
    setSaving(true)

    // Normalize: empty strings → null, numeric strings → numbers
    const payload = {}
    for (const [k, v] of Object.entries(form)) {
      if (k === 'prescription_required') { payload[k] = !!v; continue }
      if (v === '' || v == null) { payload[k] = null; continue }
      payload[k] = numFields.includes(k) ? Number(v) : v
    }

    try {
      if (editId) {
        await updatePharmacyItem(editId, payload)
        toast({ type: 'success', title: 'Item updated', message: form.name })
      } else {
        await createPharmacyItem({ ...payload, organization_id: orgId })
        toast({ type: 'success', title: 'Item added', message: form.name })
      }
      router.push('/pharmacy/inventory')
    } catch (err) {
      toast({ type: 'error', title: 'Save failed', message: err.message })
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-32"><Spinner size={32} /></div>

  return (
    <div className="w-full space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/pharmacy/inventory" className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>
            {editId ? 'Edit Item' : 'Add Inventory Item'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {editId ? 'Update medicine / product details' : 'Register a new medicine or product'}
          </p>
        </div>
      </div>

      {/* Auto ID banner */}
      {code && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'transparent' }}>
          <Hash size={15} style={{ color: 'var(--color-brand)' }} />
          <span className="text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>
            {editId ? 'Item ID' : 'This item will be assigned ID'}
          </span>
          <span className="text-sm font-800 tracking-tight px-2 py-0.5 rounded-md" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }}>
            {code}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core stock */}
        <Section icon={Pill} title="Core details">
          <Field label="Name" required className="md:col-span-2">
            <Input value={form.name} onChange={v => set('name', v)} placeholder="e.g. Paracetamol 500mg" autoFocus />
          </Field>
          <Field label="Generic / Salt name">
            <Input value={form.generic_name} onChange={v => set('generic_name', v)} placeholder="e.g. Acetaminophen" />
          </Field>
          <Field label="Manufacturer / Brand">
            <Input value={form.manufacturer} onChange={v => set('manufacturer', v)} placeholder="e.g. Cipla" />
          </Field>
          <Field label="Category">
            <Input value={form.category} onChange={v => set('category', v)} list="pharm-categories" placeholder="Tablet, Syrup…" />
            <datalist id="pharm-categories">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Unit">
            <Input value={form.unit} onChange={v => set('unit', v)} list="pharm-units" placeholder="Strip, Bottle…" />
            <datalist id="pharm-units">{UNITS.map(u => <option key={u} value={u} />)}</datalist>
          </Field>
        </Section>

        {/* Stock levels */}
        <Section icon={Boxes} title="Stock">
          <Field label="Current quantity">
            <Input type="number" value={form.quantity} onChange={v => set('quantity', v)} placeholder="0" />
          </Field>
          <Field label="Reorder level" hint="Flagged low when stock falls to/below this">
            <Input type="number" value={form.reorder_level} onChange={v => set('reorder_level', v)} placeholder="0" />
          </Field>
        </Section>

        {/* Batch & expiry */}
        <Section icon={CalendarClock} title="Batch & expiry">
          <Field label="Batch number">
            <Input value={form.batch_number} onChange={v => set('batch_number', v)} placeholder="e.g. B12345" />
          </Field>
          <Field label="Manufacture date">
            <Input type="date" value={form.manufacture_date} onChange={v => set('manufacture_date', v)} />
          </Field>
          <Field label="Expiry date">
            <Input type="date" value={form.expiry_date} onChange={v => set('expiry_date', v)} />
          </Field>
        </Section>

        {/* Pricing & tax */}
        <Section icon={IndianRupee} title="Pricing & tax">
          <Field label="Purchase price (₹)">
            <Input type="number" value={form.purchase_price} onChange={v => set('purchase_price', v)} placeholder="0.00" />
          </Field>
          <Field label="MRP / Selling price (₹)">
            <Input type="number" value={form.mrp} onChange={v => set('mrp', v)} placeholder="0.00" />
          </Field>
          <Field label="GST / Tax %">
            <Input type="number" value={form.tax_percent} onChange={v => set('tax_percent', v)} placeholder="0" />
          </Field>
          <Field label="Discount %">
            <Input type="number" value={form.discount_percent} onChange={v => set('discount_percent', v)} placeholder="0" />
          </Field>
          <Field label="HSN code">
            <Input value={form.hsn_code} onChange={v => set('hsn_code', v)} placeholder="e.g. 3004" />
          </Field>
        </Section>

        {/* Storage & supplier */}
        <Section icon={Warehouse} title="Storage & supplier">
          <Field label="Rack / Shelf location">
            <Input value={form.rack_location} onChange={v => set('rack_location', v)} placeholder="e.g. A-12" />
          </Field>
          <Field label="Default supplier">
            <Input value={form.supplier} onChange={v => set('supplier', v)} placeholder="Supplier name" />
          </Field>
          <Field label="Barcode">
            <Input value={form.barcode} onChange={v => set('barcode', v)} placeholder="Scan or enter barcode" />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <Input value={form.notes} onChange={v => set('notes', v)} placeholder="Any extra detail…" />
          </Field>
          <div className="md:col-span-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={form.prescription_required} onChange={e => set('prescription_required', e.target.checked)}
                className="w-4 h-4 rounded accent-(--color-brand)" />
              <span className="text-sm font-500" style={{ color: 'var(--color-text-secondary)' }}>Prescription required (Schedule H / controlled)</span>
            </label>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Link href="/pharmacy/inventory" className="btn btn-secondary btn-md">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn btn-primary btn-md disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : editId ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} style={{ color: 'var(--color-brand)' }} />
        <h2 className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, hint, className = '', children }) {
  return (
    <div className={className}>
      <label className="block text-xs font-600 mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder, list, autoFocus }) {
  return (
    <input
      type={type}
      value={value}
      list={list}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none transition-colors focus:border-(--color-brand)"
      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
    />
  )
}

export default function AddInventoryItemPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-32"><Spinner size={32} /></div>}>
      <InventoryFormInner />
    </Suspense>
  )
}
