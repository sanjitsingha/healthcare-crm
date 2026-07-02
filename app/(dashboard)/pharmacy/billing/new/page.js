'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Plus, Minus, Trash2, X, ShoppingCart, UserRound,
  Printer, CheckCircle2, Loader2, IndianRupee, Package, ArrowLeft, FileText,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import {
  getPharmacyItems, getPatients, getPharmacySale, savePharmacySale,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Per-line math: base → discount → tax
function lineCalc(row) {
  const base = (Number(row.unit_price) || 0) * (Number(row.quantity) || 0)
  const disc = base * (Number(row.discount_percent) || 0) / 100
  const taxable = base - disc
  const tax = taxable * (Number(row.tax_percent) || 0) / 100
  return { base, disc, tax, total: taxable + tax }
}

function NewSaleInner() {
  const router = useRouter()
  const params = useSearchParams()
  const draftId = params.get('id')
  const { orgId } = useOrg()

  const [inventory, setInventory] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  const [cart, setCart] = useState([])
  const [itemQuery, setItemQuery] = useState('')
  const [itemOpen, setItemOpen] = useState(false)
  const itemBoxRef = useRef(null)

  const [patientQuery, setPatientQuery] = useState('')
  const [patientOpen, setPatientOpen] = useState(false)
  const patientBoxRef = useRef(null)
  const [customer, setCustomer] = useState({ patient_id: null, name: '', phone: '' })

  const [payMode, setPayMode] = useState('cash')
  const [payStatus, setPayStatus] = useState('paid')
  const [amountPaid, setAmountPaid] = useState('')

  const [saving, setSaving] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [lastSale, setLastSale] = useState(null)

  // Load inventory + patients, then hydrate a draft if resuming one
  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    Promise.all([getPharmacyItems({ orgId }), getPatients({ orgId })])
      .then(async ([inv, pts]) => {
        if (!active) return
        setInventory(inv || [])
        setPatients(pts || [])
        if (draftId) {
          try {
            const s = await getPharmacySale(draftId)
            if (s && active) {
              const invMap = Object.fromEntries((inv || []).map(i => [i.id, i]))
              setCart((s.pharmacy_sale_items || []).map(li => {
                const match = invMap[li.item_id]
                return {
                  key: crypto.randomUUID(),
                  item_id: li.item_id,
                  item_code: li.item_code,
                  name: li.name,
                  unit: match?.unit || '',
                  stock: match ? Number(match.quantity) || 0 : Number(li.quantity) || 0,
                  unit_price: Number(li.unit_price) || 0,
                  quantity: Number(li.quantity) || 1,
                  discount_percent: Number(li.discount_percent) || 0,
                  tax_percent: Number(li.tax_percent) || 0,
                }
              }))
              setCustomer({ patient_id: s.patient_id, name: s.customer_name || '', phone: s.customer_phone || '' })
              setPayMode(s.payment_mode || 'cash')
              setPayStatus(s.payment_status || 'paid')
              setAmountPaid(s.amount_paid != null ? String(s.amount_paid) : '')
            }
          } catch { toast({ type: 'error', title: 'Could not load draft' }) }
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orgId, draftId])

  const inCartQty = (id) => cart.filter(c => c.item_id === id).reduce((s, c) => s + (Number(c.quantity) || 0), 0)
  const availOf = (it) => (Number(it.quantity) || 0) - inCartQty(it.id)

  const itemMatches = useMemo(() => {
    const q = itemQuery.trim().toLowerCase()
    if (!q) return inventory.slice(0, 8)
    return inventory.filter(it =>
      [it.name, it.item_code, it.generic_name, it.manufacturer, it.barcode]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    ).slice(0, 12)
  }, [itemQuery, inventory])

  const patientMatches = useMemo(() => {
    const q = patientQuery.trim().toLowerCase()
    if (!q) return patients.slice(0, 6)
    return patients.filter(p =>
      [p.first_name, p.last_name, p.phone, p.patient_code].filter(Boolean).join(' ').toLowerCase().includes(q)
    ).slice(0, 10)
  }, [patientQuery, patients])

  const addToCart = (it) => {
    if ((Number(it.quantity) || 0) <= 0) { toast({ type: 'error', title: 'Out of stock', message: it.name }); return }
    if (availOf(it) <= 0) { toast({ type: 'error', title: 'No more stock', message: `Only ${it.quantity} ${it.unit || ''} of ${it.name} available` }); return }
    setCart(prev => {
      const existing = prev.find(c => c.item_id === it.id)
      if (existing) return prev.map(c => c.item_id === it.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, {
        key: crypto.randomUUID(),
        item_id: it.id, item_code: it.item_code, name: it.name, unit: it.unit,
        stock: Number(it.quantity) || 0, unit_price: Number(it.mrp) || 0, quantity: 1,
        discount_percent: Number(it.discount_percent) || 0, tax_percent: Number(it.tax_percent) || 0,
      }]
    })
    setItemQuery(''); setItemOpen(false)
  }

  const updateRow = (key, patch) => setCart(prev => prev.map(c => c.key === key ? { ...c, ...patch } : c))
  const removeRow = (key) => setCart(prev => prev.filter(c => c.key !== key))

  const changeQty = (row, delta) => {
    const next = (Number(row.quantity) || 0) + delta
    if (next < 1) return
    if (next > row.stock) { toast({ type: 'error', title: 'Exceeds stock', message: `Only ${row.stock} ${row.unit || ''} available` }); return }
    updateRow(row.key, { quantity: next })
  }
  const setQty = (row, val) => {
    let n = Math.floor(Number(val) || 0)
    if (n < 1) n = 1
    if (n > row.stock) n = row.stock
    updateRow(row.key, { quantity: n })
  }

  const totals = useMemo(() => {
    let subtotal = 0, discount = 0, tax = 0, total = 0
    for (const row of cart) {
      const c = lineCalc(row)
      subtotal += c.base; discount += c.disc; tax += c.tax; total += c.total
    }
    return { subtotal, discount, tax, total }
  }, [cart])

  useEffect(() => {
    if (payStatus === 'paid') setAmountPaid(String(round2(totals.total)))
  }, [payStatus, totals.total])

  const selectPatient = (p) => {
    setCustomer({ patient_id: p.id, name: [p.first_name, p.last_name].filter(Boolean).join(' '), phone: p.phone || '' })
    setPatientQuery(''); setPatientOpen(false)
  }
  const clearPatient = () => setCustomer({ patient_id: null, name: '', phone: '' })

  const buildPayload = () => ({
    sale: {
      organization_id: orgId,
      patient_id: customer.patient_id,
      customer_name: customer.name.trim() || null,
      customer_phone: customer.phone.trim() || null,
      subtotal: round2(totals.subtotal),
      discount_total: round2(totals.discount),
      tax_total: round2(totals.tax),
      total: round2(totals.total),
      payment_mode: payMode,
      payment_status: payStatus,
      amount_paid: payStatus === 'paid' ? round2(totals.total) : round2(Number(amountPaid) || 0),
    },
    items: cart.map(row => ({
      item_id: row.item_id, item_code: row.item_code, name: row.name,
      quantity: row.quantity, unit_price: row.unit_price,
      discount_percent: row.discount_percent, tax_percent: row.tax_percent,
      line_total: round2(lineCalc(row).total),
    })),
  })

  const saveDraft = async () => {
    if (cart.length === 0) { toast({ type: 'error', title: 'Nothing to save' }); return }
    setSavingDraft(true)
    try {
      const { sale, items } = buildPayload()
      await savePharmacySale({ id: draftId || null, sale, items, complete: false })
      toast({ type: 'success', title: 'Draft saved' })
      router.push('/pharmacy/billing')
    } catch (err) {
      toast({ type: 'error', title: 'Could not save draft', message: err.message })
      setSavingDraft(false)
    }
  }

  const completeSale = async () => {
    if (cart.length === 0) { toast({ type: 'error', title: 'Cart is empty' }); return }
    if (!customer.phone.trim()) { toast({ type: 'error', title: 'Phone required', message: 'Enter the customer phone number to complete the sale' }); return }
    setSaving(true)
    try {
      const { sale, items } = buildPayload()
      const saleRow = await savePharmacySale({ id: draftId || null, sale, items, complete: true })
      toast({ type: 'success', title: 'Sale completed', message: `${saleRow.sale_code || ''} · ${money(sale.total)}` })
      setLastSale({ ...saleRow, items, customer: { ...customer }, payMode, payStatus })
    } catch (err) {
      toast({ type: 'error', title: 'Sale failed', message: err.message })
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-32"><Spinner size={32} /></div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/pharmacy/billing" className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>
            {draftId ? 'Resume Draft' : 'New Sale'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Walk-in pharmacy point of sale</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* ── Left: customer + items + cart ── */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Customer */}
          <div className="rounded-2xl border border-(--color-border) p-4" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center gap-2 mb-3">
              <UserRound size={15} style={{ color: 'var(--color-brand)' }} />
              <h2 className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Customer</h2>
              {customer.patient_id && (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
                  Linked patient
                  <button type="button" onClick={clearPatient} className="hover:opacity-70"><X size={11} /></button>
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Patient link search */}
              <div ref={patientBoxRef} className="relative"
                onBlur={(e) => { if (!patientBoxRef.current?.contains(e.relatedTarget)) setPatientOpen(false) }}>
                <label className="block text-[11px] font-600 mb-1" style={{ color: 'var(--color-text-muted)' }}>Link patient</label>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                  <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
                  <input value={patientQuery} onFocus={() => setPatientOpen(true)}
                    onChange={e => { setPatientQuery(e.target.value); setPatientOpen(true) }}
                    placeholder="Search patient…" className="flex-1 bg-transparent text-sm outline-none min-w-0" style={{ color: 'var(--color-text-primary)' }} />
                </div>
                {patientOpen && patientMatches.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full rounded-xl border border-(--color-border) overflow-hidden max-h-64 overflow-y-auto" style={{ background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    {patientMatches.map(p => (
                      <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectPatient(p)}
                        className="w-full text-left px-3 py-2 hover:bg-(--color-surface-2) transition-colors">
                        <p className="text-[13px] font-600" style={{ color: 'var(--color-text-primary)' }}>{[p.first_name, p.last_name].filter(Boolean).join(' ')}</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{p.patient_code || ''}{p.phone ? `${p.patient_code ? ' · ' : ''}${p.phone}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-600 mb-1" style={{ color: 'var(--color-text-muted)' }}>Name</label>
                <input value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                  placeholder="Walk-in customer" className="w-full px-2.5 py-2 rounded-lg border border-(--color-border) text-sm outline-none" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
              </div>
              <div>
                <label className="block text-[11px] font-600 mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Phone<span style={{ color: '#dc2626' }}> *</span>
                </label>
                <input value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))}
                  placeholder="Required" className="w-full px-2.5 py-2 rounded-lg border border-(--color-border) text-sm outline-none" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
              </div>
            </div>
          </div>

          {/* Item search */}
          <div ref={itemBoxRef} className="relative"
            onBlur={(e) => { if (!itemBoxRef.current?.contains(e.relatedTarget)) setItemOpen(false) }}>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-(--color-border) transition-colors focus-within:border-(--color-brand)" style={{ background: 'var(--color-surface)' }}>
              <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
              <input value={itemQuery} onFocus={() => setItemOpen(true)}
                onChange={e => { setItemQuery(e.target.value); setItemOpen(true) }}
                placeholder="Search medicine by name, ID, generic, barcode…" className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--color-text-primary)' }} />
              {itemQuery && <button type="button" onClick={() => setItemQuery('')} className="hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}><X size={13} /></button>}
            </div>
            {itemOpen && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-(--color-border) overflow-hidden max-h-80 overflow-y-auto" style={{ background: 'var(--color-surface)', boxShadow: '0 10px 28px rgba(0,0,0,0.14)' }}>
                {itemMatches.length === 0 ? (
                  <p className="px-4 py-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No items found.</p>
                ) : itemMatches.map(it => {
                  const avail = availOf(it)
                  const out = (Number(it.quantity) || 0) <= 0
                  return (
                    <button key={it.id} type="button" disabled={out} onMouseDown={(e) => e.preventDefault()} onClick={() => addToCart(it)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-(--color-surface-2) transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                        <Package size={15} style={{ color: 'var(--color-brand)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{it.name}</p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {it.item_code || ''}{it.generic_name ? `${it.item_code ? ' · ' : ''}${it.generic_name}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-700" style={{ color: 'var(--color-text-primary)' }}>{money(it.mrp)}</p>
                        <p className="text-[10px] font-600" style={{ color: out ? '#b91c1c' : avail <= 0 ? '#b45309' : 'var(--color-text-muted)' }}>
                          {out ? 'Out of stock' : `${avail} ${it.unit || ''} left`}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="rounded-2xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
              <ShoppingCart size={15} style={{ color: 'var(--color-brand)' }} />
              <h2 className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Cart</h2>
              <span className="text-[11px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{cart.length}</span>
            </div>

            {cart.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingCart size={30} className="mx-auto mb-3 opacity-15" />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Search and add items to start a sale.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div style={{ minWidth: '720px' }}>
                  <div className="grid px-4 py-2 text-[10px] font-800 uppercase tracking-wider border-b border-(--color-border)"
                    style={{ gridTemplateColumns: '1fr 90px 132px 70px 70px 100px 36px', color: 'var(--color-text-muted)' }}>
                    <span>Item</span><span className="text-right">Price</span><span className="text-center">Qty</span>
                    <span className="text-right">Disc%</span><span className="text-right">Tax%</span><span className="text-right">Total</span><span></span>
                  </div>
                  {cart.map(row => {
                    const c = lineCalc(row)
                    return (
                      <div key={row.key} className="grid px-4 py-2.5 items-center border-b border-(--color-border) last:border-0"
                        style={{ gridTemplateColumns: '1fr 90px 132px 70px 70px 100px 36px' }}>
                        <div className="min-w-0 pr-2">
                          <p className="text-[13px] font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{row.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{row.item_code || ''} · {row.stock} in stock</p>
                        </div>
                        <div className="text-right">
                          <CellNum value={row.unit_price} onChange={v => updateRow(row.key, { unit_price: v })} />
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => changeQty(row, -1)} className="w-6 h-6 rounded-md border border-(--color-border) flex items-center justify-center hover:bg-(--color-surface-2)" style={{ color: 'var(--color-text-secondary)' }}><Minus size={11} /></button>
                          <input value={row.quantity} onChange={e => setQty(row, e.target.value)}
                            className="w-9 text-center text-[13px] font-600 px-1 py-1 rounded-md border border-(--color-border) outline-none" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
                          <button type="button" onClick={() => changeQty(row, 1)} className="w-6 h-6 rounded-md border border-(--color-border) flex items-center justify-center hover:bg-(--color-surface-2)" style={{ color: 'var(--color-text-secondary)' }}><Plus size={11} /></button>
                        </div>
                        <div className="text-right"><CellNum value={row.discount_percent} onChange={v => updateRow(row.key, { discount_percent: v })} /></div>
                        <div className="text-right"><CellNum value={row.tax_percent} onChange={v => updateRow(row.key, { tax_percent: v })} /></div>
                        <div className="text-right text-[13px] font-700" style={{ color: 'var(--color-text-primary)' }}>{money(c.total)}</div>
                        <div className="text-right">
                          <button type="button" onClick={() => removeRow(row.key)} className="p-1 rounded-md hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: summary + checkout ── */}
        <div className="w-full xl:w-80 shrink-0 xl:sticky xl:top-0">
          <div className="rounded-2xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
            <div className="px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
              <h2 className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Summary</h2>
            </div>
            <div className="p-4 space-y-2.5">
              <Row label="Subtotal" value={money(totals.subtotal)} />
              <Row label="Discount" value={`− ${money(totals.discount)}`} muted />
              <Row label="Tax" value={`+ ${money(totals.tax)}`} muted />
              <div className="border-t border-(--color-border) pt-2.5 flex items-center justify-between">
                <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Total</span>
                <span className="text-xl font-800" style={{ color: 'var(--color-brand)' }}>{money(totals.total)}</span>
              </div>

              <div className="pt-2">
                <label className="block text-[11px] font-700 uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Payment mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {['cash', 'online'].map(m => (
                    <button key={m} type="button" onClick={() => setPayMode(m)}
                      className="px-3 py-2 rounded-lg border text-xs font-600 capitalize transition-all"
                      style={payMode === m
                        ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-700 uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'paid', l: 'Paid' }, { v: 'due', l: 'Due' }].map(o => (
                    <button key={o.v} type="button" onClick={() => setPayStatus(o.v)}
                      className="px-3 py-2 rounded-lg border text-xs font-600 transition-all"
                      style={payStatus === o.v
                        ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {payStatus === 'due' && (
                <div>
                  <label className="block text-[11px] font-700 uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Amount paid now (₹)</label>
                  <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-(--color-border) text-sm outline-none" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
                  <p className="text-[11px] mt-1" style={{ color: '#b45309' }}>
                    Balance due: {money(Math.max(0, totals.total - (Number(amountPaid) || 0)))}
                  </p>
                </div>
              )}

              <button type="button" onClick={completeSale} disabled={saving || savingDraft || cart.length === 0}
                className="btn btn-primary btn-md w-full mt-1">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <IndianRupee size={16} />}
                {saving ? 'Processing…' : `Complete Sale · ${money(totals.total)}`}
              </button>
              <button type="button" onClick={saveDraft} disabled={saving || savingDraft || cart.length === 0}
                className="btn btn-secondary btn-md w-full">
                {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {savingDraft ? 'Saving…' : 'Save as draft'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {lastSale && <ReceiptCard sale={lastSale} onClose={() => router.push('/pharmacy/billing')} />}
    </div>
  )
}

function Row({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="font-600" style={{ color: muted ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>{value}</span>
    </div>
  )
}

function CellNum({ value, onChange }) {
  return (
    <input type="number" value={value} onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className="w-full text-right text-[13px] px-2 py-1 rounded-md border border-(--color-border) outline-none focus:border-(--color-brand)"
      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
  )
}

function ReceiptCard({ sale, onClose }) {
  const name = sale.customer?.name || 'Walk-in customer'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,18,30,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)' }} onClick={e => e.stopPropagation()}>
        <div className="p-5 text-center border-b border-(--color-border)">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#dcfce7' }}>
            <CheckCircle2 size={26} style={{ color: '#15803d' }} />
          </div>
          <p className="text-base font-800" style={{ color: 'var(--color-text-primary)' }}>Sale completed</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sale.sale_code}</p>
        </div>
        <div className="p-5 space-y-2 max-h-72 overflow-y-auto">
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'var(--color-text-muted)' }}>{name}</span>
            <span className="capitalize font-600" style={{ color: 'var(--color-text-secondary)' }}>{sale.payMode} · {sale.payStatus}</span>
          </div>
          {(sale.items || []).map((i, idx) => (
            <div key={idx} className="flex justify-between text-[13px]">
              <span className="truncate pr-2" style={{ color: 'var(--color-text-secondary)' }}>{i.name} <span style={{ color: 'var(--color-text-muted)' }}>× {i.quantity}</span></span>
              <span className="font-600 shrink-0" style={{ color: 'var(--color-text-primary)' }}>{money(i.line_total)}</span>
            </div>
          ))}
          <div className="border-t border-(--color-border) pt-2 flex justify-between">
            <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Total</span>
            <span className="text-base font-800" style={{ color: 'var(--color-brand)' }}>{money(sale.total)}</span>
          </div>
        </div>
        <div className="p-4 flex gap-2 border-t border-(--color-border)">
          <button type="button" onClick={() => window.print()} className="btn btn-secondary btn-md flex-1">
            <Printer size={14} /> Print
          </button>
          <button type="button" onClick={onClose} className="btn btn-primary btn-md flex-1">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NewSalePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-32"><Spinner size={32} /></div>}>
      <NewSaleInner />
    </Suspense>
  )
}
