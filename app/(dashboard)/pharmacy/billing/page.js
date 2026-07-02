'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, X, SlidersHorizontal, Receipt, FileText, Trash2, Pencil,
  ArrowUpDown, UserRound,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import { getPharmacySales, deletePharmacySale } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import { format } from 'date-fns'

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const SORTS = {
  recent:    { label: 'Newest first', fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  oldest:    { label: 'Oldest first', fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  high:      { label: 'Amount: high → low', fn: (a, b) => (Number(b.total) || 0) - (Number(a.total) || 0) },
  low:       { label: 'Amount: low → high', fn: (a, b) => (Number(a.total) || 0) - (Number(b.total) || 0) },
}

export default function PharmacyBillingListPage() {
  const { orgId } = useOrg()
  const router = useRouter()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState('bills') // 'bills' | 'drafts'
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterPayStatus, setFilterPayStatus] = useState('') // '' | 'paid' | 'due'
  const [filterMode, setFilterMode] = useState('')           // '' | 'cash' | 'online'
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [sort, setSort] = useState('recent')

  const load = () => {
    if (!orgId) return
    setLoading(true)
    getPharmacySales({ orgId, limit: 300 })
      .then(d => setSales(d || []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [orgId])

  const counts = useMemo(() => ({
    bills: sales.filter(s => s.status !== 'draft').length,
    drafts: sales.filter(s => s.status === 'draft').length,
  }), [sales])

  const nameOf = (s) => s.patients
    ? [s.patients.first_name, s.patients.last_name].filter(Boolean).join(' ')
    : (s.customer_name || 'Walk-in')

  const activeFilters = [filterPayStatus, filterMode, filterFrom, filterTo].filter(Boolean).length

  const rows = useMemo(() => {
    let list = sales.filter(s => (tab === 'drafts' ? s.status === 'draft' : s.status !== 'draft'))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(s =>
        [s.sale_code, nameOf(s), s.customer_phone].filter(Boolean).join(' ').toLowerCase().includes(q)
      )
    }
    if (filterPayStatus) list = list.filter(s => s.payment_status === filterPayStatus)
    if (filterMode) list = list.filter(s => s.payment_mode === filterMode)
    if (filterFrom) list = list.filter(s => new Date(s.created_at) >= new Date(filterFrom + 'T00:00:00'))
    if (filterTo) list = list.filter(s => new Date(s.created_at) <= new Date(filterTo + 'T23:59:59'))

    return [...list].sort(SORTS[sort].fn)
  }, [sales, tab, search, filterPayStatus, filterMode, filterFrom, filterTo, sort])

  const deleteDraft = async (s) => {
    const ok = await showConfirm({ title: 'Delete this draft?', confirmLabel: 'Delete' })
    if (!ok) return
    const prev = sales
    setSales(list => list.filter(x => x.id !== s.id))
    try { await deletePharmacySale(s.id); toast({ type: 'success', title: 'Draft deleted' }) }
    catch (err) { setSales(prev); toast({ type: 'error', title: 'Delete failed', message: err.message }) }
  }

  const clearFilters = () => { setFilterPayStatus(''); setFilterMode(''); setFilterFrom(''); setFilterTo('') }

  const gridCols = tab === 'bills'
    ? '100px 1fr 70px 120px 110px 90px 80px'   // invoice no, customer, items, date, total, payment, print
    : '110px 1fr 90px 120px 120px 110px'        // draft, customer, items, saved, total, actions

  const totalBilled = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.total) || 0), 0),
    [rows]
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Billing</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {counts.bills} bill{counts.bills !== 1 ? 's' : ''} · {counts.drafts} draft{counts.drafts !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/pharmacy/billing/new"
          className="btn btn-primary btn-md">
          <Plus size={16} /> New Sale
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-(--color-border)">
        {[{ id: 'bills', label: 'Bills', icon: Receipt, count: counts.bills }, { id: 'drafts', label: 'Drafts', icon: FileText, count: counts.drafts }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-5 py-3 text-xs font-600 border-b-2 transition-all"
            style={tab === t.id ? { color: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { color: 'var(--color-text-muted)', borderColor: 'transparent' }}>
            <t.icon size={14} /> {t.label}
            {t.count > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-700"
                style={tab === t.id ? { background: 'var(--color-brand)', color: 'white' } : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + filters + sort */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-52 px-3 py-2 rounded-xl border border-(--color-border) transition-colors focus-within:border-(--color-brand)"
          style={{ background: 'var(--color-surface)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input type="text" placeholder="Search invoice no, customer, phone…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--color-text-primary)' }} />
          {search && <button type="button" onClick={() => setSearch('')} className="p-0.5 rounded hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}><X size={12} /></button>}
        </div>

        <button type="button" onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-500 transition-all"
          style={showFilters || activeFilters > 0
            ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
            : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
          <SlidersHorizontal size={14} /> Filters
          {activeFilters > 0 && <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>{activeFilters}</span>}
        </button>

        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
          <ArrowUpDown size={13} style={{ color: 'var(--color-text-muted)' }} />
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-transparent text-sm outline-none" style={{ color: 'var(--color-text-secondary)' }}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {activeFilters > 0 && (
          <button type="button" onClick={clearFilters} className="text-xs font-500 hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}>Clear all</button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Payment</label>
            <div className="flex gap-1">
              {[{ v: '', l: 'All' }, { v: 'paid', l: 'Paid' }, { v: 'due', l: 'Due' }].map(o => (
                <button key={o.v} type="button" onClick={() => setFilterPayStatus(o.v)}
                  className="px-3 py-2 rounded-lg border text-xs font-600 transition-all"
                  style={filterPayStatus === o.v ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' } : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>{o.l}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Mode</label>
            <div className="flex gap-1">
              {[{ v: '', l: 'All' }, { v: 'cash', l: 'Cash' }, { v: 'online', l: 'Online' }].map(o => (
                <button key={o.v} type="button" onClick={() => setFilterMode(o.v)}
                  className="px-3 py-2 rounded-lg border text-xs font-600 transition-all"
                  style={filterMode === o.v ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' } : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>{o.l}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Date range</label>
            <div className="flex items-center gap-2">
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-(--color-border) text-sm outline-none" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>to</span>
              <input type="date" value={filterTo} min={filterFrom} onChange={e => setFilterTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-(--color-border) text-sm outline-none" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-2xl border-(--color-border)">
          {tab === 'drafts' ? <FileText size={32} className="mx-auto mb-3 opacity-20" /> : <Receipt size={32} className="mx-auto mb-3 opacity-20" />}
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {search || activeFilters > 0
              ? 'No results match your filters.'
              : tab === 'drafts' ? 'No saved drafts.' : 'No bills yet.'}
          </p>
          {!search && !activeFilters && (
            <Link href="/pharmacy/billing/new" className="mt-2 inline-block text-xs font-600 hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
              Start a new sale →
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
            {/* Header row */}
            <div className="grid items-center px-4 py-2.5 text-[10px] font-800 uppercase tracking-wider border-b border-(--color-border)"
              style={{ gridTemplateColumns: gridCols, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              <span>{tab === 'drafts' ? 'Draft' : 'Invoice No'}</span>
              <span>Customer</span>
              <span className="text-center">Items</span>
              <span>{tab === 'drafts' ? 'Saved' : 'Date'}</span>
              <span className="text-right">Total</span>
              <span className="text-right">{tab === 'drafts' ? 'Actions' : 'Payment'}</span>
              {tab === 'bills' && <span className="text-right">Invoice</span>}
            </div>

            {rows.map(s => {
              const itemCount = s.pharmacy_sale_items?.length || 0
              return (
                <div key={s.id}
                  className="grid items-center px-4 py-3 border-b border-(--color-border) last:border-0 transition-colors hover:bg-(--color-surface-2) group"
                  style={{ gridTemplateColumns: gridCols }}>
                  <span className="text-[12px] font-700" style={{ color: tab === 'drafts' ? 'var(--color-text-muted)' : 'var(--color-brand)' }}>
                    {s.sale_code || (tab === 'drafts' ? 'Draft' : '—')}
                  </span>
                  <div className="min-w-0 pr-3">
                    <p className="text-[13px] font-600 truncate flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                      {s.patients && <UserRound size={11} style={{ color: 'var(--color-brand)' }} />}
                      {nameOf(s)}
                    </p>
                    {s.customer_phone && <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{s.customer_phone}</p>}
                  </div>
                  <span className="text-[12px] text-center" style={{ color: 'var(--color-text-secondary)' }}>{itemCount}</span>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{format(new Date(s.created_at), 'MMM d, h:mm a')}</span>
                  <span className="text-[13px] font-700 text-right" style={{ color: 'var(--color-text-primary)' }}>{money(s.total)}</span>

                  {tab === 'drafts' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/pharmacy/billing/new?id=${s.id}`} title="Resume"
                        className="p-1.5 rounded-md hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                        <Pencil size={13} />
                      </Link>
                      <button type="button" title="Delete" onClick={() => deleteDraft(s)}
                        className="p-1.5 rounded-md hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-end">
                        <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full capitalize"
                          style={s.payment_status === 'paid' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fef3c7', color: '#b45309' }}>
                          {s.payment_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-end">
                        <Link href={`/pharmacy/billing/${s.id}`} title="Open invoice"
                          className="text-[12px] font-700 hover:underline" style={{ color: 'var(--color-brand)' }}>
                          Print
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {tab === 'bills' && (
            <div className="flex justify-end px-1">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Showing {rows.length} · total <span className="font-700" style={{ color: 'var(--color-text-primary)' }}>{money(totalBilled)}</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
