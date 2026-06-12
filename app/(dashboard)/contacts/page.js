'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Search, Phone, Mail, UserRound, TrendingUp,
  Eye, EyeOff, Download, Check, X, ArrowRight, Trash2,
  ChevronDown, Calendar, Plus, ArrowUpDown, ArrowUp, ArrowDown,
  SlidersHorizontal, Tag, RefreshCw, Users,
} from 'lucide-react'
import { Spinner, Avatar, Card } from '@/components/ui'
import { getLeads, getPatients, deleteLead, deletePatient, updateOrganization } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { format, startOfDay, endOfDay } from 'date-fns'
import { logAudit, AUDIT } from '@/lib/audit'
import clsx from 'clsx'

// ── Constants ───────────────────────────────────────────────────
const GENDERS = ['Male', 'Female', 'Other']
const opts = (arr) => arr.map(v => ({ value: v, label: v }))

// Base column definitions — `locked` columns can't be hidden
const BASE_COLUMNS = [
  { key: 'name',     label: 'Name',           locked: true },
  { key: 'type',     label: 'Type' },
  { key: 'phone',    label: 'Phone' },
  { key: 'email',    label: 'Email' },
  { key: 'status',   label: 'Stage / Status' },
  { key: 'source',   label: 'Source' },
  { key: 'gender',   label: 'Gender' },
  { key: 'tags',     label: 'Tags' },
  { key: 'created',  label: 'Created' },
  { key: 'modified', label: 'Modified' },
]
const BASE_DEFAULT_VISIBLE = {
  name: true, type: true, phone: true, email: true,
  status: true, source: false, gender: false,
  tags: false, created: true, modified: false,
}

const EMPTY_FILTERS = {
  types: [], stages: [], statuses: [], sources: [], genders: [], tags: [], has: [],
  createdFrom: '', createdTo: '', modifiedFrom: '', modifiedTo: '',
}

// ── Cell text for CSV export ────────────────────────────────────
function cellText(r, col) {
  if (col.custom) {
    const applies = (col.page === 'leads' && r.type === 'Lead') || (col.page === 'patients' && r.type === 'Patient')
    return applies ? (r.custom_data?.[col.moduleId]?.[col.fieldId] ?? '') : ''
  }
  switch (col.key) {
    case 'name':     return r.name
    case 'type':     return r.type
    case 'phone':    return r.phone || ''
    case 'email':    return r.email || ''
    case 'status':   return r.detail || ''
    case 'source':   return r.source || ''
    case 'gender':   return r.gender || ''
    case 'tags':     return (r.tags || []).map(t => t.name).join(', ')
    case 'created':  return r.created_at  ? format(new Date(r.created_at),  'yyyy-MM-dd') : ''
    case 'modified': return r.updated_at  ? format(new Date(r.updated_at),  'yyyy-MM-dd') : ''
    default:         return ''
  }
}

function toCSV(rows, cols) {
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [cols.map(c => c.label).join(',')]
  rows.forEach(r => lines.push(cols.map(c => escape(cellText(r, c))).join(',')))
  return lines.join('\n')
}

// ── Multi-select dropdown (identical pattern to Leads page) ─────
function MultiSelect({ label, icon: Icon, options, selected, onChange, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  const count = selected.length
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-500 transition-colors"
        style={count
          ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        {Icon && <Icon size={13} />}
        <span className="flex-1 text-left truncate">{label}</span>
        {count > 0 && <span className="text-[10px] font-700 px-1.5 rounded-full" style={{ background: 'var(--color-brand)', color: 'white' }}>{count}</span>}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className={clsx('absolute z-30 mt-1 min-w-44 max-h-64 overflow-y-auto rounded-xl border border-(--color-border) p-1', align === 'right' ? 'right-0' : 'left-0')}
          style={{ background: 'var(--color-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
          {options.length === 0 && <p className="px-2.5 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No options</p>}
          {options.map(o => {
            const on = selected.includes(o.value)
            return (
              <button key={o.value} type="button" onClick={() => toggle(o.value)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-(--color-surface-2)"
                style={{ color: 'var(--color-text-primary)' }}>
                <span className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                  style={on ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)' }}>
                  {on && <Check size={10} className="text-white" />}
                </span>
                {o.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: o.color }} />}
                <span className="flex-1 truncate">{o.label}</span>
              </button>
            )
          })}
          {count > 0 && (
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-2.5 py-1.5 mt-1 border-t border-(--color-border) text-[11px] font-600" style={{ color: 'var(--color-text-muted)' }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Date-range dropdown (identical pattern to Leads page) ───────
function DateRangeSelect({ from, to, onChange, label = 'Date range', align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const active = !!(from || to)
  const fmt = (d) => { try { return format(new Date(d), 'MMM d, yyyy') } catch { return d } }
  const summary = from && to ? `${fmt(from)} – ${fmt(to)}` : from ? `From ${fmt(from)}` : to ? `Until ${fmt(to)}` : label
  const iso = (d) => format(d, 'yyyy-MM-dd')
  const applyPreset = (days) => {
    const end = new Date(); const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    onChange(iso(start), iso(end))
  }
  const applyThisMonth = () => {
    const now = new Date()
    onChange(iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now))
  }
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-500 transition-colors"
        style={active
          ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        <Calendar size={13} />
        <span className="flex-1 text-left truncate">{summary}</span>
        {active && (
          <span onClick={(e) => { e.stopPropagation(); onChange('', '') }} className="shrink-0 rounded hover:bg-(--color-surface-2) p-0.5" title="Clear">
            <X size={12} />
          </span>
        )}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className={clsx('absolute z-30 mt-1 w-64 rounded-xl border border-(--color-border) p-2.5', align === 'right' ? 'right-0' : 'left-0')}
          style={{ background: 'var(--color-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
          <div className="flex flex-wrap gap-1 mb-2.5">
            {[
              { label: 'Today',      run: () => applyPreset(1) },
              { label: 'Last 7d',    run: () => applyPreset(7) },
              { label: 'Last 30d',   run: () => applyPreset(30) },
              { label: 'This month', run: applyThisMonth },
            ].map(p => (
              <button key={p.label} type="button" onClick={p.run}
                className="px-2 py-1 text-[11px] font-600 rounded-md border border-(--color-border) transition-colors hover:bg-(--color-brand-50) hover:border-(--color-brand)"
                style={{ color: 'var(--color-text-secondary)' }}>{p.label}</button>
            ))}
          </div>
          <label className="block text-[10px] font-700 uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Start date</label>
          <input type="date" value={from || ''} max={to || undefined} onChange={e => onChange(e.target.value, to)}
            className="w-full px-2 py-1.5 mb-2.5 text-xs rounded-lg border border-(--color-border) outline-none focus:border-(--color-brand)"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          <label className="block text-[10px] font-700 uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>End date</label>
          <input type="date" value={to || ''} min={from || undefined} onChange={e => onChange(from, e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none focus:border-(--color-brand)"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          {active && (
            <button type="button" onClick={() => onChange('', '')}
              className="w-full text-center px-2.5 py-1.5 mt-2.5 border-t border-(--color-border) text-[11px] font-600" style={{ color: 'var(--color-text-muted)' }}>
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Column visibility dropdown (identical pattern to Leads page) ─
function ColumnToggle({ baseColumns, customColumns, isVisible, toggleColumn }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const activeCount = [...baseColumns, ...customColumns].filter(isVisible).length
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-(--color-border) text-sm font-500 transition-colors hover:bg-(--color-brand-50)"
        style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        {open ? <EyeOff size={15} /> : <Eye size={15} />}
        Columns
        <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
          {activeCount}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-(--color-border) shadow-lg z-20 p-2 max-h-80 overflow-y-auto"
          style={{ background: 'var(--color-surface)' }}>
          <p className="text-[10px] font-600 uppercase tracking-wider px-2 py-1.5" style={{ color: 'var(--color-text-muted)' }}>Show / Hide Columns</p>
          {baseColumns.map(col => (
            <button key={col.key} onClick={() => toggleColumn(col)} disabled={col.locked}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors hover:bg-(--color-brand-50) disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--color-text-primary)' }}>
              <span>{col.label}{col.locked && <span className="text-[9px] ml-1" style={{ color: 'var(--color-text-muted)' }}>(locked)</span>}</span>
              <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                style={isVisible(col) ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)' }}>
                {isVisible(col) && <span className="text-white text-[10px] font-800">✓</span>}
              </div>
            </button>
          ))}
          {customColumns.length > 0 && (
            <>
              <p className="text-[10px] font-600 uppercase tracking-wider px-2 py-1.5 mt-1" style={{ color: 'var(--color-text-muted)' }}>Custom Fields</p>
              {customColumns.map(col => (
                <button key={col.key} onClick={() => toggleColumn(col)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors hover:bg-(--color-brand-50)"
                  style={{ color: 'var(--color-text-primary)' }}>
                  <span className="truncate text-left">{col.label}<span className="text-[9px] ml-1 capitalize" style={{ color: 'var(--color-text-muted)' }}>({col.page})</span></span>
                  <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                    style={isVisible(col) ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)' }}>
                    {isVisible(col) && <span className="text-white text-[10px] font-800">✓</span>}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────
export default function ContactsPage() {
  const { orgId, org } = useOrg()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visible, setVisible]   = useState(() => ({ ...(org?.settings?.contacts_columns || {}) }))
  const [filters, setFilters]   = useState({ ...EMPTY_FILTERS })
  const [selected, setSelected] = useState(new Set())
  const [sort, setSort]         = useState({ field: 'created', dir: 'desc' })

  const stages  = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s, color: '#6366f1' } : s)
  const stageColor = (name) => stages.find(s => s.name === name)?.color || '#6366f1'

  const customColumns = (org?.settings?.modules || [])
    .filter(m => m.active)
    .flatMap(m => (m.fields || []).map(f => ({
      key: `cf:${m.id}:${f.id}`,
      label: f.label,
      custom: true, page: m.page, moduleId: m.id, fieldId: f.id,
    })))

  const ALL_COLUMNS = [...BASE_COLUMNS, ...customColumns]
  const isVisible = (col) => {
    if (col.locked) return true
    if (col.key in visible) return visible[col.key]
    return col.custom ? false : (BASE_DEFAULT_VISIBLE[col.key] ?? false)
  }
  const visibleCols = ALL_COLUMNS.filter(isVisible)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setSelected(new Set())
    try {
      const [patients, leads] = await Promise.all([getPatients({ orgId }), getLeads({ orgId })])
      const patientRows = (patients || []).map(p => ({
        id: p.id, type: 'Patient',
        name: `${p.first_name} ${p.last_name || ''}`.trim() || 'Unnamed',
        phone: p.phone || null, email: p.email || null,
        detail: p.status || 'Active', source: null, gender: p.gender || null,
        tags: (p.tags || []).map(t => t.tags).filter(Boolean),
        custom_data: p.custom_data || {},
        created_at: p.created_at, updated_at: p.updated_at || p.created_at,
        href: `/patients/${p.id}`,
      }))
      const leadRows = (leads || []).filter(l => !l.patient_id).map(l => ({
        id: l.id, type: 'Lead',
        name: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title || 'Unnamed',
        phone: l.phone || l.contacts?.phone || null, email: l.email || l.contacts?.email || null,
        detail: l.stage || 'New', source: l.source || null, gender: l.gender || null,
        tags: (l.tags || []).map(t => t.tags).filter(Boolean),
        custom_data: l.custom_data || {},
        created_at: l.created_at, updated_at: l.updated_at || l.created_at,
        href: `/leads/${l.id}`,
      }))
      setRows([...patientRows, ...leadRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  const persistColumns = async (next) => {
    setVisible(next)
    try { await updateOrganization(orgId, { settings: { ...(org?.settings || {}), contacts_columns: next } }) }
    catch (err) { alert(err.message) }
  }
  const toggleColumn = (col) => {
    if (col.locked) return
    persistColumns({ ...visible, [col.key]: !isVisible(col) })
  }

  // Filter option sources, derived from loaded rows
  const sources = useMemo(() => [...new Set(rows.map(r => r.source).filter(Boolean))], [rows])
  const availableTags = useMemo(() => {
    const map = new Map()
    rows.forEach(r => (r.tags || []).forEach(t => { if (t && !map.has(t.id)) map.set(t.id, t) }))
    return [...map.values()]
  }, [rows])

  // ── Filtering ──────────────────────────────────────────────────
  const filtered = useMemo(() => rows.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      if (!r.name.toLowerCase().includes(q) && !(r.phone || '').toLowerCase().includes(q) && !(r.email || '').toLowerCase().includes(q)) return false
    }
    if (filters.types.length    && !filters.types.includes(r.type)) return false
    if (filters.stages.length   && !(r.type === 'Lead'    && filters.stages.includes(r.detail)))   return false
    if (filters.statuses.length && !(r.type === 'Patient' && filters.statuses.includes(r.detail))) return false
    if (filters.sources.length  && !filters.sources.includes(r.source || '')) return false
    if (filters.genders.length  && !filters.genders.includes(r.gender || '')) return false
    if (filters.tags.length) {
      const ids = (r.tags || []).map(t => t.id)
      if (!filters.tags.some(id => ids.includes(id))) return false
    }
    if (filters.has.includes('Phone') && !r.phone) return false
    if (filters.has.includes('Email') && !r.email) return false
    if (filters.createdFrom  && new Date(r.created_at) < startOfDay(new Date(filters.createdFrom)))  return false
    if (filters.createdTo    && new Date(r.created_at) > endOfDay(new Date(filters.createdTo)))      return false
    if (filters.modifiedFrom && new Date(r.updated_at) < startOfDay(new Date(filters.modifiedFrom))) return false
    if (filters.modifiedTo   && new Date(r.updated_at) > endOfDay(new Date(filters.modifiedTo)))     return false
    return true
  }), [rows, filters, search])

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered]
    if (sort.field === 'name') {
      arr.sort((a, b) => {
        const va = a.name.toLowerCase(), vb = b.name.toLowerCase()
        if (va < vb) return sort.dir === 'asc' ? -1 : 1
        if (va > vb) return sort.dir === 'asc' ? 1 : -1
        return 0
      })
    } else {
      const key = sort.field === 'modified' ? 'updated_at' : 'created_at'
      arr.sort((a, b) => {
        const ta = a[key] ? new Date(a[key]).getTime() : 0
        const tb = b[key] ? new Date(b[key]).getTime() : 0
        return sort.dir === 'asc' ? ta - tb : tb - ta
      })
    }
    return arr
  }, [filtered, sort])

  const filterCount =
    filters.types.length + filters.stages.length + filters.statuses.length +
    filters.sources.length + filters.genders.length + filters.tags.length + filters.has.length +
    (filters.createdFrom || filters.createdTo ? 1 : 0) +
    (filters.modifiedFrom || filters.modifiedTo ? 1 : 0)
  const hasFilters = filterCount > 0
  const clearFilters = () => setFilters({ ...EMPTY_FILTERS })

  const toggleSort = (field) =>
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })
  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <ArrowUpDown size={12} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
    return sort.dir === 'asc'
      ? <ArrowUp size={12} style={{ color: 'var(--color-brand)' }} />
      : <ArrowDown size={12} style={{ color: 'var(--color-brand)' }} />
  }

  // ── Selection ──────────────────────────────────────────────────
  const rowKey = (r) => `${r.type}:${r.id}`
  const allSelected = sortedFiltered.length > 0 && sortedFiltered.every(r => selected.has(rowKey(r)))
  const toggleRow = (r) => {
    const k = rowKey(r)
    setSelected(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next })
  }
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(sortedFiltered.map(rowKey)))
  const clearSelection = () => setSelected(new Set())

  // ── Export (selected only) ─────────────────────────────────────
  const handleExport = () => {
    const data = sortedFiltered.filter(r => selected.has(rowKey(r)))
    if (!data.length) return
    const csv = toCSV(data, visibleCols)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `contacts-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    logAudit({ action: AUDIT.DATA_EXPORT, entityType: 'contact', description: `Exported ${data.length} contact record(s) to CSV`, metadata: { count: data.length, format: 'csv', columns: visibleCols.map(c => c.label) } })
  }

  const handleDeleteSelected = async () => {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} selected contact${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    try {
      for (const key of selected) {
        const [type, id] = key.split(':')
        if (type === 'Patient') await deletePatient(id)
        else await deleteLead(id)
      }
      clearSelection(); load()
    } catch (err) { alert(err.message) }
  }

  // ── Cell renderer ──────────────────────────────────────────────
  const renderCell = (r, col) => {
    const isPatient = r.type === 'Patient'
    if (col.custom) {
      const txt = cellText(r, col)
      return <span style={{ color: txt ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{txt || '—'}</span>
    }
    switch (col.key) {
      case 'name':
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={r.name} size="sm" />
            <span className="font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{r.name}</span>
          </div>
        )
      case 'type':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full"
            style={isPatient ? { background: '#dcfce7', color: '#15803d' } : { background: '#dbeafe', color: '#1d4ed8' }}>
            {isPatient ? <UserRound size={10} /> : <TrendingUp size={10} />}{r.type}
          </span>
        )
      case 'phone':
        return r.phone
          ? <span className="flex items-center gap-1.5 truncate" style={{ color: 'var(--color-text-secondary)' }}><Phone size={11} className="shrink-0" />{r.phone}</span>
          : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
      case 'email':
        return r.email
          ? <span className="flex items-center gap-1.5 truncate" style={{ color: 'var(--color-text-secondary)' }}><Mail size={11} className="shrink-0" /><span className="truncate">{r.email}</span></span>
          : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
      case 'status':
        return isPatient ? (
          <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={r.detail === 'Active' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#b91c1c' }}>{r.detail}</span>
        ) : (
          <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: stageColor(r.detail) + '20', color: stageColor(r.detail) }}>{r.detail}</span>
        )
      case 'source':
        return <span style={{ color: r.source ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{r.source || '—'}</span>
      case 'gender':
        return <span style={{ color: r.gender ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{r.gender || '—'}</span>
      case 'tags':
        return r.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {r.tags.slice(0, 3).map(tag => (
              <span key={tag.id} className="inline-flex items-center gap-1 text-[10px] font-600 px-1.5 py-0.5 rounded-md"
                style={{ background: (tag.color || '#6366f1') + '20', color: tag.color || '#6366f1' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tag.color || '#6366f1' }} />
                {tag.name}
              </span>
            ))}
            {r.tags.length > 3 && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>+{r.tags.length - 3}</span>}
          </div>
        ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
      case 'created':
        return <span style={{ color: 'var(--color-text-muted)' }}>{r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : '—'}</span>
      case 'modified':
        return <span style={{ color: 'var(--color-text-muted)' }}>{r.updated_at ? format(new Date(r.updated_at), 'MMM d, yyyy') : '—'}</span>
      default: return null
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Contacts</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? '—' : `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} disabled={loading} title="Refresh contacts"
            className="p-2 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-surface-2) disabled:opacity-50"
            style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/leads/new">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-brand)' }}>
              <Plus size={16} /> Add Contact
            </button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-(--color-border) outline-none transition-all"
            style={{ background: 'var(--color-surface)' }}
            placeholder="Search by name, phone, email..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-500 transition-all',
            filtersOpen || hasFilters ? 'border-(--color-brand) text-white' : 'border-(--color-border) hover:bg-(--color-brand-50)'
          )}
          style={filtersOpen || hasFilters ? { background: 'var(--color-brand)' } : { color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
        >
          <SlidersHorizontal size={15} />
          Filters
          {hasFilters && <span className="bg-white/30 text-[10px] font-700 px-1.5 py-0.5 rounded-full">{filterCount}</span>}
        </button>

        {/* Column toggle */}
        <ColumnToggle baseColumns={BASE_COLUMNS} customColumns={customColumns} isVisible={isVisible} toggleColumn={toggleColumn} />
      </div>

      {/* Advanced filter panel */}
      {filtersOpen && (
        <Card className="p-3 border-(--color-border) space-y-2.5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            <MultiSelect label="Type" icon={Users} options={opts(['Lead', 'Patient'])} selected={filters.types} onChange={v => setFilters(f => ({ ...f, types: v }))} />
            {stages.length > 0 && (
              <MultiSelect label="Stage" options={stages.map(s => ({ value: s.name, label: s.name, color: s.color }))} selected={filters.stages} onChange={v => setFilters(f => ({ ...f, stages: v }))} />
            )}
            <MultiSelect label="Status" options={opts(['Active', 'Inactive'])} selected={filters.statuses} onChange={v => setFilters(f => ({ ...f, statuses: v }))} />
            {sources.length > 0 && (
              <MultiSelect label="Source" options={opts(sources)} selected={filters.sources} onChange={v => setFilters(f => ({ ...f, sources: v }))} />
            )}
            <MultiSelect label="Gender" options={opts(GENDERS)} selected={filters.genders} onChange={v => setFilters(f => ({ ...f, genders: v }))} />
            {availableTags.length > 0 && (
              <MultiSelect label="Tag" icon={Tag} options={availableTags.map(t => ({ value: t.id, label: t.name, color: t.color }))} selected={filters.tags} onChange={v => setFilters(f => ({ ...f, tags: v }))} />
            )}
            <MultiSelect label="Has" options={opts(['Phone', 'Email'])} selected={filters.has} onChange={v => setFilters(f => ({ ...f, has: v }))} />
          </div>

          {/* Date ranges */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 items-start">
            <div className="col-span-2">
              <DateRangeSelect label="Created" from={filters.createdFrom} to={filters.createdTo}
                onChange={(createdFrom, createdTo) => setFilters(f => ({ ...f, createdFrom, createdTo }))} />
            </div>
            <div className="col-span-2">
              <DateRangeSelect label="Modified" from={filters.modifiedFrom} to={filters.modifiedTo}
                onChange={(modifiedFrom, modifiedTo) => setFilters(f => ({ ...f, modifiedFrom, modifiedTo }))} />
            </div>
          </div>

          {hasFilters && (
            <div className="flex justify-end pt-2 border-t border-(--color-border)">
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-600 px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                <X size={12} /> Clear all
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Bulk action bar (shown only when rows are selected) */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }}>
          <span className="text-sm font-600" style={{ color: 'var(--color-brand)' }}>
            {selected.size} contact{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button onClick={clearSelection} className="text-xs font-500 px-2 py-1 rounded-lg hover:bg-white/50 transition-colors" style={{ color: 'var(--color-brand)' }}>
            Deselect all
          </button>
          <div className="flex-1" />
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-(--color-border) bg-white hover:bg-gray-50 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}>
            <Download size={14} /> Export
          </button>
          <button onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : sortedFiltered.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
          <Users size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {search || hasFilters ? 'No contacts match your filters.' : 'No leads or patients yet.'}
          </p>
          {!search && !hasFilters && (
            <Link href="/leads/new" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-xs font-600 transition-colors hover:opacity-90"
              style={{ background: 'var(--color-brand)', color: 'white' }}>
              <Plus size={13} /> Add your first contact
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th className="w-10 px-4 py-2.5 border-b border-(--color-border)">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: 'var(--color-brand)' }} />
                  </th>
                  {visibleCols.map(c => {
                    const sortable = c.key === 'name' || c.key === 'created' || c.key === 'modified'
                    const sortField = c.key === 'modified' ? 'modified' : c.key === 'name' ? 'name' : 'created'
                    return (
                      <th key={c.key} className="text-left px-4 py-2.5 border-b border-(--color-border) whitespace-nowrap">
                        {sortable ? (
                          <button type="button" onClick={() => toggleSort(sortField)}
                            className="flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-widest transition-colors hover:opacity-80"
                            style={{ color: 'var(--color-text-muted)' }}>
                            {c.label}<SortIcon field={sortField} />
                          </button>
                        ) : (
                          <span className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{c.label}</span>
                        )}
                      </th>
                    )
                  })}
                  <th className="w-10 border-b border-(--color-border)" />
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map((r, i) => {
                  const sel = selected.has(rowKey(r))
                  return (
                    <tr key={rowKey(r)} className="group transition-colors hover:bg-(--color-surface-2)"
                      style={{ borderBottom: i === sortedFiltered.length - 1 ? 'none' : '1px solid var(--color-border)', background: sel ? 'var(--color-brand-50)' : undefined }}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={sel} onChange={() => toggleRow(r)} className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: 'var(--color-brand)' }} />
                      </td>
                      {visibleCols.map(c => (
                        <td key={c.key} className="px-4 py-3 max-w-0">
                          <Link href={r.href} className="block truncate">{renderCell(r, c)}</Link>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <Link href={r.href}>
                          <ArrowRight size={14} className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--color-text-muted)' }} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {sortedFiltered.length} of {rows.length} contact{rows.length !== 1 ? 's' : ''}{hasFilters ? ' (filtered)' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
