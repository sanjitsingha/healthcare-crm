'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Search, SlidersHorizontal, X, ArrowUp, ArrowDown, ArrowUpDown,
  Pencil, Trash2, Boxes, AlertTriangle, PackageX, CalendarClock,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import { getPharmacyItems, deletePharmacyItem } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import { format, differenceInCalendarDays } from 'date-fns'
import clsx from 'clsx'

const NEAR_EXPIRY_DAYS = 60

// Derived stock/expiry flags for a single item
function itemFlags(it) {
  const qty = Number(it.quantity) || 0
  const reorder = Number(it.reorder_level) || 0
  const outOfStock = qty <= 0
  const lowStock = !outOfStock && reorder > 0 && qty <= reorder
  let expired = false, nearExpiry = false, daysToExpiry = null
  if (it.expiry_date) {
    daysToExpiry = differenceInCalendarDays(new Date(it.expiry_date), new Date())
    expired = daysToExpiry < 0
    nearExpiry = !expired && daysToExpiry <= NEAR_EXPIRY_DAYS
  }
  return { qty, reorder, outOfStock, lowStock, expired, nearExpiry, daysToExpiry }
}

const COLUMNS = [
  { key: 'item_code',    label: 'Item ID',   sortable: true,  align: 'left',  width: '120px' },
  { key: 'name',         label: 'Name',      sortable: true,  align: 'left',  width: 'minmax(200px,1.4fr)' },
  { key: 'category',     label: 'Category',  sortable: true,  align: 'left',  width: '120px' },
  { key: 'batch_number', label: 'Batch',     sortable: true,  align: 'left',  width: '110px' },
  { key: 'expiry_date',  label: 'Expiry',    sortable: true,  align: 'left',  width: '120px' },
  { key: 'quantity',     label: 'Stock',     sortable: true,  align: 'right', width: '130px' },
  { key: 'purchase_price', label: 'Cost ₹',  sortable: true,  align: 'right', width: '90px' },
  { key: 'mrp',          label: 'MRP ₹',     sortable: true,  align: 'right', width: '90px' },
  { key: 'supplier',     label: 'Supplier',  sortable: true,  align: 'left',  width: '130px' },
  { key: '_actions',     label: '',          sortable: false, align: 'right', width: '88px' },
]

const GRID_COLS = COLUMNS.map(c => c.width).join(' ')
const GRID = 'var(--color-border)'

export default function PharmacyInventoryPage() {
  const { orgId } = useOrg()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStock, setFilterStock] = useState('')   // '' | 'low' | 'out'
  const [filterExpiry, setFilterExpiry] = useState('')  // '' | 'expired' | 'near'

  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    getPharmacyItems({ orgId })
      .then(d => { if (active) setItems(d || []) })
      .catch(() => { if (active) setItems([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orgId])

  const categories = useMemo(
    () => [...new Set(items.map(i => i.category).filter(Boolean))].sort(),
    [items]
  )

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleDelete = async (item) => {
    const ok = await showConfirm({
      title: `Delete ${item.name}?`,
      message: 'This permanently removes the item from inventory.',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    const prev = items
    setItems(list => list.filter(i => i.id !== item.id))
    try {
      await deletePharmacyItem(item.id)
      toast({ type: 'success', title: 'Item deleted', message: item.name })
    } catch (err) {
      setItems(prev)
      toast({ type: 'error', title: 'Delete failed', message: err.message })
    }
  }

  const filtered = useMemo(() => {
    let rows = items.filter(it => {
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const hay = [it.item_code, it.name, it.generic_name, it.manufacturer, it.batch_number, it.supplier, it.barcode]
          .filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filterCategory && it.category !== filterCategory) return false
      const f = itemFlags(it)
      if (filterStock === 'low' && !f.lowStock && !f.outOfStock) return false
      if (filterStock === 'out' && !f.outOfStock) return false
      if (filterExpiry === 'expired' && !f.expired) return false
      if (filterExpiry === 'near' && !f.nearExpiry) return false
      return true
    })

    const dir = sortDir === 'asc' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (['quantity', 'purchase_price', 'mrp', 'reorder_level'].includes(sortKey)) {
        av = Number(av) || 0; bv = Number(bv) || 0
        return (av - bv) * dir
      }
      if (sortKey === 'expiry_date' || sortKey === 'created_at') {
        av = av ? new Date(av).getTime() : 0; bv = bv ? new Date(bv).getTime() : 0
        return (av - bv) * dir
      }
      return String(av || '').localeCompare(String(bv || '')) * dir
    })
    return rows
  }, [items, search, filterCategory, filterStock, filterExpiry, sortKey, sortDir])

  // Summary stats
  const stats = useMemo(() => {
    let low = 0, out = 0, near = 0, value = 0
    for (const it of items) {
      const f = itemFlags(it)
      if (f.outOfStock) out++
      else if (f.lowStock) low++
      if (f.nearExpiry || f.expired) near++
      value += (Number(it.purchase_price) || 0) * (Number(it.quantity) || 0)
    }
    return { total: items.length, low, out, near, value }
  }, [items])

  const activeFilters = [filterCategory, filterStock, filterExpiry].filter(Boolean).length

  const clearFilters = () => { setFilterCategory(''); setFilterStock(''); setFilterExpiry('') }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {stats.total} item{stats.total !== 1 ? 's' : ''} · stock value ₹{Math.round(stats.value).toLocaleString('en-IN')}
          </p>
        </div>
        <Link
          href="/pharmacy/inventory/add"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-600 transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-brand)', color: 'white' }}
        >
          <Plus size={16} /> Add Item
        </Link>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip icon={Boxes} label="Total items" value={stats.total} color="var(--color-brand)" bg="var(--color-brand-50)" />
        <StatChip icon={AlertTriangle} label="Low stock" value={stats.low} color="#b45309" bg="#fef3c7" />
        <StatChip icon={PackageX} label="Out of stock" value={stats.out} color="#b91c1c" bg="#fee2e2" />
        <StatChip icon={CalendarClock} label="Expiring / expired" value={stats.near} color="#7c3aed" bg="#f3e8ff" />
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-52 px-3 py-2 rounded-xl border border-(--color-border) transition-colors focus-within:border-(--color-brand)"
          style={{ background: 'var(--color-surface)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search name, ID, generic, batch, supplier…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="p-0.5 rounded hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}>
              <X size={12} />
            </button>
          )}
        </div>

        <button type="button" onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-500 transition-all"
          style={showFilters || activeFilters > 0
            ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
            : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
          <SlidersHorizontal size={14} />
          Filters
          {activeFilters > 0 && (
            <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              {activeFilters}
            </span>
          )}
        </button>

        {activeFilters > 0 && (
          <button type="button" onClick={clearFilters} className="text-xs font-500 hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}>
            Clear all
          </button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
          <div className="flex flex-col gap-1 min-w-44">
            <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Category</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-(--color-border) text-sm outline-none"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Stock</label>
            <div className="flex gap-1">
              {[{ v: '', l: 'All' }, { v: 'low', l: 'Low' }, { v: 'out', l: 'Out' }].map(o => (
                <button key={o.v} type="button" onClick={() => setFilterStock(o.v)}
                  className="px-3 py-2 rounded-lg border text-xs font-600 transition-all"
                  style={filterStock === o.v
                    ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
                    : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Expiry</label>
            <div className="flex gap-1">
              {[{ v: '', l: 'All' }, { v: 'near', l: 'Expiring' }, { v: 'expired', l: 'Expired' }].map(o => (
                <button key={o.v} type="button" onClick={() => setFilterExpiry(o.v)}
                  className="px-3 py-2 rounded-lg border text-xs font-600 transition-all"
                  style={filterExpiry === o.v
                    ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
                    : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-2xl border-(--color-border)">
          <Boxes size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {items.length === 0 ? 'No items in inventory yet.' : 'No items match your filters.'}
          </p>
          {items.length === 0 && (
            <Link href="/pharmacy/inventory/add" className="mt-2 inline-block text-xs font-600 hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
              Add your first item →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <div className="overflow-x-auto">
            <div style={{ minWidth: '1180px' }}>
              {/* Header */}
              <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: 'var(--color-surface-2)' }}>
                {COLUMNS.map(col => {
                  const sorted = sortKey === col.key
                  return (
                    <button
                      key={col.key}
                      type="button"
                      disabled={!col.sortable}
                      onClick={() => col.sortable && toggleSort(col.key)}
                      className={clsx(
                        'px-3 py-2.5 text-[11px] font-800 uppercase tracking-wider flex items-center gap-1',
                        col.align === 'right' && 'justify-end',
                        col.sortable && 'hover:bg-(--color-surface) transition-colors cursor-pointer'
                      )}
                      style={{ color: 'var(--color-text-secondary)', borderRight: `1px solid ${GRID}`, borderBottom: `2px solid ${GRID}` }}
                    >
                      <span>{col.label}</span>
                      {col.sortable && (
                        sorted
                          ? (sortDir === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-brand)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-brand)' }} />)
                          : <ArrowUpDown size={11} className="opacity-30" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Rows */}
              {filtered.map(it => {
                const f = itemFlags(it)
                return (
                  <div key={it.id} className="grid items-stretch group transition-colors hover:bg-(--color-surface-2)"
                    style={{ gridTemplateColumns: GRID_COLS }}>
                    <Cell><span className="font-600 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{it.item_code || '—'}</span></Cell>
                    <Cell>
                      <div className="min-w-0">
                        <Link href={`/pharmacy/inventory/add?id=${it.id}`} className="text-[13px] font-600 truncate block hover:underline" style={{ color: 'var(--color-text-primary)' }}>
                          {it.name}
                        </Link>
                        {it.generic_name && <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{it.generic_name}</p>}
                      </div>
                    </Cell>
                    <Cell>{it.category ? <span className="text-[11px] font-600 px-2 py-0.5 rounded-md" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>{it.category}</span> : <Dash />}</Cell>
                    <Cell><span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{it.batch_number || <Dash />}</span></Cell>
                    <Cell>
                      {it.expiry_date ? (
                        <span className="text-[12px] font-500 inline-flex items-center gap-1"
                          style={{ color: f.expired ? '#b91c1c' : f.nearExpiry ? '#b45309' : 'var(--color-text-secondary)' }}>
                          {(f.expired || f.nearExpiry) && <CalendarClock size={11} />}
                          {format(new Date(it.expiry_date), 'MMM yyyy')}
                        </span>
                      ) : <Dash />}
                    </Cell>
                    <Cell align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[13px] font-700" style={{ color: f.outOfStock ? '#b91c1c' : 'var(--color-text-primary)' }}>
                          {f.qty}{it.unit ? <span className="text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}> {it.unit}</span> : null}
                        </span>
                        {f.outOfStock
                          ? <Pill2 bg="#fee2e2" color="#b91c1c">Out</Pill2>
                          : f.lowStock ? <Pill2 bg="#fef3c7" color="#b45309">Low</Pill2> : null}
                      </div>
                    </Cell>
                    <Cell align="right"><span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{it.purchase_price != null ? Number(it.purchase_price).toLocaleString('en-IN') : <Dash />}</span></Cell>
                    <Cell align="right"><span className="text-[12px] font-600" style={{ color: 'var(--color-text-secondary)' }}>{it.mrp != null ? Number(it.mrp).toLocaleString('en-IN') : <Dash />}</span></Cell>
                    <Cell><span className="text-[12px] truncate" style={{ color: 'var(--color-text-muted)' }}>{it.supplier || <Dash />}</span></Cell>
                    <Cell align="right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/pharmacy/inventory/add?id=${it.id}`} title="Edit"
                          className="p-1.5 rounded-md hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                          <Pencil size={13} />
                        </Link>
                        <button type="button" title="Delete" onClick={() => handleDelete(it)}
                          className="p-1.5 rounded-md hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </Cell>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Cell({ children, align = 'left' }) {
  return (
    <div className={clsx('px-3 py-2.5 flex items-center min-w-0', align === 'right' ? 'justify-end' : '')}
      style={{ borderRight: `1px solid ${GRID}`, borderBottom: `1px solid ${GRID}` }}>
      {children}
    </div>
  )
}

const Dash = () => <span style={{ color: 'var(--color-text-muted)' }}>—</span>

function Pill2({ children, bg, color }) {
  return <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide" style={{ background: bg, color }}>{children}</span>
}

function StatChip({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-800 leading-none" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
        <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      </div>
    </div>
  )
}
