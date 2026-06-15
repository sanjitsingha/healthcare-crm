'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Boxes, AlertTriangle, PackageX, CalendarClock, IndianRupee, Plus, ArrowRight, ShoppingCart,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import { getPharmacyItems } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { format, differenceInCalendarDays } from 'date-fns'

const NEAR_EXPIRY_DAYS = 60

function flags(it) {
  const qty = Number(it.quantity) || 0
  const reorder = Number(it.reorder_level) || 0
  const outOfStock = qty <= 0
  const lowStock = !outOfStock && reorder > 0 && qty <= reorder
  let expired = false, nearExpiry = false, days = null
  if (it.expiry_date) {
    days = differenceInCalendarDays(new Date(it.expiry_date), new Date())
    expired = days < 0
    nearExpiry = !expired && days <= NEAR_EXPIRY_DAYS
  }
  return { qty, outOfStock, lowStock, expired, nearExpiry, days }
}

export default function PharmacyOverviewPage() {
  const { orgId } = useOrg()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

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

  const { stats, lowList, expiryList } = useMemo(() => {
    let low = 0, out = 0, near = 0, value = 0
    const lowList = [], expiryList = []
    for (const it of items) {
      const f = flags(it)
      if (f.outOfStock) out++
      else if (f.lowStock) low++
      if (f.outOfStock || f.lowStock) lowList.push({ it, f })
      if (f.expired || f.nearExpiry) { near++; expiryList.push({ it, f }) }
      value += (Number(it.purchase_price) || 0) * f.qty
    }
    expiryList.sort((a, b) => (a.f.days ?? 1e9) - (b.f.days ?? 1e9))
    return {
      stats: { total: items.length, low, out, near, value },
      lowList: lowList.slice(0, 6),
      expiryList: expiryList.slice(0, 6),
    }
  }, [items])

  if (loading) return <div className="flex justify-center py-32"><Spinner size={32} /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Pharmacy Overview</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Inventory health at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pharmacy/billing"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-600 border border-(--color-border) hover:bg-(--color-surface-2) transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}>
            <ShoppingCart size={15} /> New Sale
          </Link>
          <Link href="/pharmacy/inventory/add"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-600 text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-brand)' }}>
            <Plus size={16} /> Add Item
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat icon={Boxes} label="Total items" value={stats.total} color="var(--color-brand)" bg="var(--color-brand-50)" />
        <Stat icon={AlertTriangle} label="Low stock" value={stats.low} color="#b45309" bg="#fef3c7" />
        <Stat icon={PackageX} label="Out of stock" value={stats.out} color="#b91c1c" bg="#fee2e2" />
        <Stat icon={CalendarClock} label="Expiring soon" value={stats.near} color="#7c3aed" bg="#f3e8ff" />
        <Stat icon={IndianRupee} label="Stock value" value={`₹${Math.round(stats.value).toLocaleString('en-IN')}`} color="#15803d" bg="#dcfce7" small />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListCard
          title="Needs restock"
          empty="All items are above their reorder level."
          rows={lowList}
          render={({ it, f }) => (
            <RowLink key={it.id} it={it}
              right={f.outOfStock
                ? <Tag bg="#fee2e2" color="#b91c1c">Out of stock</Tag>
                : <Tag bg="#fef3c7" color="#b45309">{f.qty} left</Tag>} />
          )}
        />
        <ListCard
          title="Expiring / expired"
          empty="No items nearing expiry."
          rows={expiryList}
          render={({ it, f }) => (
            <RowLink key={it.id} it={it}
              right={f.expired
                ? <Tag bg="#fee2e2" color="#b91c1c">Expired</Tag>
                : <Tag bg="#f3e8ff" color="#7c3aed">{f.days}d left</Tag>}
              sub={it.expiry_date ? format(new Date(it.expiry_date), 'MMM d, yyyy') : null} />
          )}
        />
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, color, bg, small }) {
  return (
    <div className="p-4 rounded-2xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: bg }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className={small ? 'text-base font-800 leading-tight' : 'text-2xl font-800 leading-none'} style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  )
}

function ListCard({ title, rows, render, empty }) {
  return (
    <div className="rounded-2xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
        <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        <Link href="/pharmacy/inventory" className="text-xs font-600 flex items-center gap-1 hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
          View all <ArrowRight size={12} />
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>{empty}</p>
      ) : (
        <div>{rows.map(render)}</div>
      )}
    </div>
  )
}

function RowLink({ it, right, sub }) {
  return (
    <Link href={`/pharmacy/inventory/add?id=${it.id}`}
      className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-(--color-border) last:border-0 transition-colors hover:bg-(--color-surface-2)">
      <div className="min-w-0">
        <p className="text-[13px] font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{it.name}</p>
        <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
          {it.item_code || ''}{sub ? `${it.item_code ? ' · ' : ''}${sub}` : ''}
        </p>
      </div>
      <div className="shrink-0">{right}</div>
    </Link>
  )
}

function Tag({ children, bg, color }) {
  return <span className="text-[10px] font-700 px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: bg, color }}>{children}</span>
}
