'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, X, TrendingUp, CheckCircle, Clock, ArrowLeftRight, ReceiptText, Pill, Stethoscope, CalendarDays, Filter, Check, ChevronUp, ChevronDown } from 'lucide-react'
import { Card, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { getTransactions } from '@/lib/supabase/queries'
import { format } from 'date-fns'
import clsx from 'clsx'

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const LINE = '#e8efec' // soft divider color (lighter than --color-border)

// Source → icon + chip colors
const SOURCE_META = {
  Billing:      { icon: ReceiptText, fg: '#135BFB', bg: '#eef2ff' },
  Pharmacy:     { icon: Pill,        fg: '#059669', bg: '#ecfdf5' },
  Consultation: { icon: Stethoscope, fg: '#2563eb', bg: '#eff6ff' },
  Appointment:  { icon: CalendarDays,fg: '#b45309', bg: '#fffbeb' },
}

// Normalize a status string to a visual tone
function statusTone(status) {
  const s = (status || '').toLowerCase()
  if (['paid', 'completed', 'settled'].includes(s)) return 'paid'
  if (['partially paid', 'partial'].includes(s)) return 'partial'
  if (['cancelled', 'canceled', 'refunded', 'void', 'overdue'].includes(s)) return 'bad'
  if (['draft', 'scheduled'].includes(s)) return 'draft'
  return 'pending' // due, unpaid, sent, pending, etc.
}
const TONE_STYLE = {
  paid:    'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  pending: 'bg-orange-50 text-orange-700',
  draft:   'bg-gray-100 text-gray-500',
  bad:     'bg-red-50 text-red-600',
}

const SOURCES = ['All', 'Billing', 'Pharmacy', 'Consultation', 'Appointment']

export default function TransactionsPage() {
  const { orgId } = useOrg()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortDir, setSortDir] = useState('desc') // date sort

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try { setRows(await getTransactions({ orgId })) }
    catch { setRows([]) }
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = rows
    if (source !== 'All') list = list.filter(r => r.source === source)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.patient?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.reference?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q)
      )
    }
    const sorted = [...list].sort((a, b) => {
      const da = new Date(a.date || 0).getTime()
      const db = new Date(b.date || 0).getTime()
      return sortDir === 'desc' ? db - da : da - db
    })
    return sorted
  }, [rows, source, search, sortDir])

  const stats = useMemo(() => {
    const billed = rows.reduce((s, r) => s + (r.amount || 0), 0)
    const collected = rows.reduce((s, r) => {
      if (r.paid != null) return s + r.paid
      return s + (statusTone(r.status) === 'paid' ? (r.amount || 0) : 0)
    }, 0)
    return { count: rows.length, billed, collected, pending: billed - collected }
  }, [rows])

  const sourceCounts = useMemo(() => {
    const m = {}
    for (const r of rows) m[r.source] = (m[r.source] || 0) + 1
    return m
  }, [rows])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-800 tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <ArrowLeftRight size={22} style={{ color: 'var(--color-brand)' }} /> Transactions
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Every charge across billing, pharmacy, consultations and appointments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4" style={{ borderLeftColor: 'var(--color-brand)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--color-brand-50)' }}>
              <ArrowLeftRight size={18} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Transactions</p>
              <p className="text-xl font-900" style={{ color: 'var(--color-text-primary)' }}>{stats.count}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50"><TrendingUp size={18} className="text-indigo-600" /></div>
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
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Pending</p>
              <p className="text-xl font-900 text-amber-600">{rupee(stats.pending)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient, phone, reference or description…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none focus:ring-2 transition-all"
            style={{ borderColor: 'var(--color-border)', background: 'white' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:opacity-70">
              <X size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>

        {/* Source filter button + dropdown */}
        <div className="relative shrink-0"
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFilterOpen(false) }}>
          <button onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 rounded-lg border transition-colors hover:bg-gray-50"
            style={{
              borderColor: source !== 'All' ? 'var(--color-brand)' : 'var(--color-border)',
              background: 'white',
              color: source !== 'All' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            }}>
            <Filter size={15} />
            {source === 'All' ? 'Filter' : source}
            <ChevronDown size={14} className={clsx('transition-transform', filterOpen && 'rotate-180')} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 z-20 mt-1.5 w-48 rounded-xl border shadow-lg overflow-hidden"
              style={{ borderColor: 'var(--color-border)', background: 'white' }}>
              {SOURCES.map(s => (
                <button key={s} tabIndex={0}
                  onClick={() => { setSource(s); setFilterOpen(false) }}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-600 text-left transition-colors hover:bg-gray-50"
                  style={{ color: source === s ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}>
                  <span>{s}</span>
                  <span className="flex items-center gap-2">
                    {s !== 'All' && sourceCounts[s] != null && (
                      <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{sourceCounts[s] || 0}</span>
                    )}
                    {source === s && <Check size={14} />}
                  </span>
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
                <tr style={{ borderBottom: `1px solid ${LINE}`, background: 'var(--color-surface-2)' }}>
                  <th className="px-4 py-3.5 text-left">
                    <button
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-1 text-[10px] font-800 uppercase tracking-widest hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Date
                      {sortDir === 'desc'
                        ? <ChevronDown size={13} style={{ color: 'var(--color-brand)' }} />
                        : <ChevronUp size={13} style={{ color: 'var(--color-brand)' }} />}
                    </button>
                  </th>
                  {['Source', 'Reference', 'Patient', 'Phone', 'Description', 'Amount', 'Status'].map(h => (
                    <th key={h} className={clsx('px-4 py-3.5 text-[10px] font-800 uppercase tracking-widest', h === 'Amount' ? 'text-right' : 'text-left')} style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const meta = SOURCE_META[r.source] || SOURCE_META.Billing
                  const Icon = meta.icon
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors" style={{ borderTop: `1px solid ${LINE}` }}>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-700" style={{ background: meta.bg, color: meta.fg }}>
                          <Icon size={12} /> {r.source}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>{r.reference}</td>
                      <td className="px-4 py-3.5 font-600" style={{ color: 'var(--color-text-primary)' }}>{r.patient}</td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {r.phone || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.description}</td>
                      <td className="px-4 py-3.5 text-right font-800 whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>{rupee(r.amount)}</td>
                      <td className="px-4 py-3.5">
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-600', TONE_STYLE[statusTone(r.status)])}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <ArrowLeftRight size={28} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-600" style={{ color: 'var(--color-text-muted)' }}>
                {search || source !== 'All' ? 'No transactions match your filter.' : 'No transactions yet.'}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
