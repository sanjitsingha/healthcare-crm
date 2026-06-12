'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Search, Phone, Mail, UserRound, TrendingUp,
  Columns3, Download, Check, X, ArrowRight, Trash2,
  ChevronDown, Calendar, Plus, ArrowUpDown, ArrowUp, ArrowDown,
  SlidersHorizontal, Tag,
} from 'lucide-react'
import { Spinner, Avatar, Button, Card } from '@/components/ui'
import { getLeads, getPatients, deleteLead, deletePatient, updateOrganization } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { format } from 'date-fns'
import { logAudit, AUDIT } from '@/lib/audit'
import clsx from 'clsx'

// ── Base column definitions ─────────────────────────────────────
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
  type: 'All',       // 'All' | 'Lead' | 'Patient'
  stages: [],
  statuses: [],      // patient statuses
  sources: [],
  genders: [],
  hasPhone: false,
  hasEmail: false,
  createdFrom: '', createdTo: '',
  modifiedFrom: '', modifiedTo: '',
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

// ── Filter panel (single button → dropdown) ─────────────────────
function FilterPanel({ filters, onChange, stages, sources }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const set = (key, val) => onChange({ ...filters, [key]: val })
  const toggleArr = (key, val) => {
    const arr = filters[key]
    onChange({ ...filters, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] })
  }

  const activeCount = [
    filters.type !== 'All',
    filters.stages.length,
    filters.statuses.length,
    filters.sources.length,
    filters.genders.length,
    filters.hasPhone,
    filters.hasEmail,
    filters.createdFrom || filters.createdTo,
    filters.modifiedFrom || filters.modifiedTo,
  ].filter(Boolean).length

  const GENDERS = ['Male', 'Female', 'Other']
  const PATIENT_STATUSES = ['Active', 'Inactive']

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-600 transition-colors hover:bg-(--color-surface-2)"
        style={activeCount
          ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        <SlidersHorizontal size={14} />
        Filter
        {activeCount > 0 && (
          <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand)', color: 'white' }}>
            {activeCount}
          </span>
        )}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1.5 left-0 w-80 rounded-xl border border-(--color-border) z-30 overflow-hidden"
          style={{ background: 'var(--color-surface)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-[11px] font-700 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Filters</p>
            {activeCount > 0 && (
              <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS })}
                className="text-[10px] font-600 flex items-center gap-1" style={{ color: 'var(--color-brand)' }}>
                <X size={11} /> Clear all
              </button>
            )}
          </div>

          <div className="p-4 space-y-4 max-h-120 overflow-y-auto">

            {/* Type */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Type</p>
              <div className="flex gap-1.5">
                {['All', 'Lead', 'Patient'].map(t => (
                  <button key={t} type="button" onClick={() => set('type', t)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-600 border transition-all"
                    style={filters.type === t
                      ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' }
                      : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Lead Stage */}
            {stages.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Lead Stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {stages.map(s => {
                    const on = filters.stages.includes(s.name)
                    return (
                      <button key={s.name} type="button" onClick={() => toggleArr('stages', s.name)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-600 border transition-all"
                        style={on
                          ? { background: s.color + '20', color: s.color, borderColor: s.color + '60' }
                          : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Patient Status */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Patient Status</p>
              <div className="flex gap-1.5">
                {PATIENT_STATUSES.map(s => {
                  const on = filters.statuses.includes(s)
                  return (
                    <button key={s} type="button" onClick={() => toggleArr('statuses', s)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-600 border transition-all"
                      style={on
                        ? { background: s === 'Active' ? '#dcfce7' : '#fee2e2', color: s === 'Active' ? '#15803d' : '#b91c1c', borderColor: 'transparent' }
                        : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Source */}
            {sources.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Source</p>
                <div className="flex flex-wrap gap-1.5">
                  {sources.map(s => {
                    const on = filters.sources.includes(s)
                    return (
                      <button key={s} type="button" onClick={() => toggleArr('sources', s)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-600 border transition-all"
                        style={on
                          ? { background: 'var(--color-brand-50)', color: 'var(--color-brand)', borderColor: 'var(--color-brand)' }
                          : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Gender */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Gender</p>
              <div className="flex gap-1.5">
                {GENDERS.map(g => {
                  const on = filters.genders.includes(g)
                  return (
                    <button key={g} type="button" onClick={() => toggleArr('genders', g)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-600 border transition-all"
                      style={on
                        ? { background: 'var(--color-brand-50)', color: 'var(--color-brand)', borderColor: 'var(--color-brand)' }
                        : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                      {g}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Has Phone / Has Email */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Contact Info</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.hasPhone} onChange={e => set('hasPhone', e.target.checked)}
                    className="w-3.5 h-3.5" style={{ accentColor: 'var(--color-brand)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>Has phone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.hasEmail} onChange={e => set('hasEmail', e.target.checked)}
                    className="w-3.5 h-3.5" style={{ accentColor: 'var(--color-brand)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>Has email</span>
                </label>
              </div>
            </div>

            {/* Created date range */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Date Created</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>From</label>
                  <input type="date" value={filters.createdFrom} max={filters.createdTo || undefined}
                    onChange={e => set('createdFrom', e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-(--color-border) outline-none"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                </div>
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>To</label>
                  <input type="date" value={filters.createdTo} min={filters.createdFrom || undefined}
                    onChange={e => set('createdTo', e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-(--color-border) outline-none"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                </div>
              </div>
            </div>

            {/* Modified date range */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Date Modified</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>From</label>
                  <input type="date" value={filters.modifiedFrom} max={filters.modifiedTo || undefined}
                    onChange={e => set('modifiedFrom', e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-(--color-border) outline-none"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                </div>
                <div>
                  <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>To</label>
                  <input type="date" value={filters.modifiedTo} min={filters.modifiedFrom || undefined}
                    onChange={e => set('modifiedTo', e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-(--color-border) outline-none"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                </div>
              </div>
            </div>

          </div>
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

  const [colsOpen, setColsOpen] = useState(false)
  const colsRef = useRef()

  const [visible, setVisible]   = useState(() => ({ ...(org?.settings?.contacts_columns || {}) }))
  const [filters, setFilters]   = useState({ ...EMPTY_FILTERS })
  const [selected, setSelected] = useState(new Set())
  const [sort, setSort]         = useState({ col: 'created', dir: 'desc' })

  useEffect(() => {
    const h = (e) => { if (colsRef.current && !colsRef.current.contains(e.target)) setColsOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

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

  // ── Filtering + sorting ────────────────────────────────────────
  const sources = useMemo(() => [...new Set(rows.map(r => r.source).filter(Boolean))], [rows])

  const filtered = useMemo(() => {
    let result = rows.filter(r => {
      if (filters.type !== 'All' && r.type !== filters.type) return false
      if (filters.stages.length && !(r.type === 'Lead' && filters.stages.includes(r.detail))) return false
      if (filters.statuses.length && !(r.type === 'Patient' && filters.statuses.includes(r.detail))) return false
      if (filters.sources.length && !filters.sources.includes(r.source || '')) return false
      if (filters.genders.length && !filters.genders.includes(r.gender || '')) return false
      if (filters.hasPhone && !r.phone) return false
      if (filters.hasEmail && !r.email) return false
      if (filters.createdFrom) {
        if (new Date(r.created_at) < new Date(filters.createdFrom)) return false
      }
      if (filters.createdTo) {
        if (new Date(r.created_at) > new Date(filters.createdTo + 'T23:59:59')) return false
      }
      if (filters.modifiedFrom) {
        if (new Date(r.updated_at) < new Date(filters.modifiedFrom)) return false
      }
      if (filters.modifiedTo) {
        if (new Date(r.updated_at) > new Date(filters.modifiedTo + 'T23:59:59')) return false
      }
      if (search) {
        const q = search.toLowerCase()
        return (
          r.name.toLowerCase().includes(q) ||
          (r.phone || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q)
        )
      }
      return true
    })

    result = [...result].sort((a, b) => {
      let va, vb
      if (sort.col === 'name') {
        va = a.name.toLowerCase(); vb = b.name.toLowerCase()
        if (va < vb) return sort.dir === 'asc' ? -1 : 1
        if (va > vb) return sort.dir === 'asc' ? 1 : -1
        return 0
      }
      const dateKey = sort.col === 'modified' ? 'updated_at' : 'created_at'
      va = new Date(a[dateKey]).getTime(); vb = new Date(b[dateKey]).getTime()
      return sort.dir === 'asc' ? va - vb : vb - va
    })
    return result
  }, [rows, filters, search, sort])

  const activeFilterCount = [
    filters.type !== 'All',
    filters.stages.length > 0,
    filters.statuses.length > 0,
    filters.sources.length > 0,
    filters.genders.length > 0,
    filters.hasPhone,
    filters.hasEmail,
    !!(filters.createdFrom || filters.createdTo),
    !!(filters.modifiedFrom || filters.modifiedTo),
  ].filter(Boolean).length

  const toggleSort = (col) =>
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })

  const SortIcon = ({ col }) => {
    if (sort.col !== col) return <ArrowUpDown size={12} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
    return sort.dir === 'asc'
      ? <ArrowUp size={12} style={{ color: 'var(--color-brand)' }} />
      : <ArrowDown size={12} style={{ color: 'var(--color-brand)' }} />
  }

  // ── Selection ──────────────────────────────────────────────────
  const rowKey = (r) => `${r.type}:${r.id}`
  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(rowKey(r)))
  const toggleRow = (r) => {
    const k = rowKey(r)
    setSelected(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next })
  }
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(rowKey)))

  // ── Export ─────────────────────────────────────────────────────
  const handleExport = () => {
    const data = filtered.filter(r => selected.has(rowKey(r)))
    if (!data.length) return
    const csv = toCSV(data, visibleCols)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `contacts-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
    URL.revokeObjectURL(url)
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
      setSelected(new Set()); load()
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
    <div className="p-6 space-y-5" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Contacts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {rows.length} total · {rows.filter(r => r.type === 'Patient').length} patients · {rows.filter(r => r.type === 'Lead').length} leads
          </p>
        </div>
        <Link href="/leads/new">
          <Button size="sm"><Plus size={14} /> Add Contact</Button>
        </Link>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative min-w-48 max-w-72 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            placeholder="Search by name, phone, email…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        <FilterPanel
          filters={filters}
          onChange={setFilters}
          stages={stages}
          sources={sources}
        />

        {activeFilterCount > 0 && (
          <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS })}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-600 border border-dashed transition-colors hover:bg-(--color-surface-2)"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            <X size={12} /> Clear filters
          </button>
        )}

        <div className="flex-1" />

        {/* Columns toggle */}
        <div className="relative" ref={colsRef}>
          <button type="button" onClick={() => setColsOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-600 transition-colors hover:bg-(--color-surface-2)"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
            <Columns3 size={14} /> Columns
          </button>
          {colsOpen && (
            <div className="absolute top-full mt-1.5 right-0 w-60 rounded-xl border border-(--color-border) overflow-hidden z-20"
              style={{ background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              <div className="p-2 max-h-80 overflow-y-auto">
                <p className="text-[11px] font-700 uppercase tracking-wide px-2 py-1.5" style={{ color: 'var(--color-text-muted)' }}>Base Columns</p>
                {BASE_COLUMNS.map(col => (
                  <button key={col.key} type="button" onClick={() => toggleColumn(col)} disabled={col.locked}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs transition-colors hover:bg-(--color-surface-2) disabled:opacity-50 disabled:cursor-not-allowed">
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {col.label}{col.locked && <span className="text-[9px] ml-1" style={{ color: 'var(--color-text-muted)' }}>(locked)</span>}
                    </span>
                    <span className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: isVisible(col) ? 'var(--color-brand)' : 'transparent', border: isVisible(col) ? 'none' : '1.5px solid var(--color-border)' }}>
                      {isVisible(col) && <Check size={11} className="text-white" />}
                    </span>
                  </button>
                ))}
                {customColumns.length > 0 && (
                  <>
                    <p className="text-[11px] font-700 uppercase tracking-wide px-2 py-1.5 mt-1" style={{ color: 'var(--color-text-muted)' }}>Custom Fields</p>
                    {customColumns.map(col => (
                      <button key={col.key} type="button" onClick={() => toggleColumn(col)}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs transition-colors hover:bg-(--color-surface-2)">
                        <span className="truncate text-left" style={{ color: 'var(--color-text-primary)' }}>
                          {col.label}<span className="text-[9px] ml-1 capitalize" style={{ color: 'var(--color-text-muted)' }}>({col.page})</span>
                        </span>
                        <span className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: isVisible(col) ? 'var(--color-brand)' : 'transparent', border: isVisible(col) ? 'none' : '1.5px solid var(--color-border)' }}>
                          {isVisible(col) && <Check size={11} className="text-white" />}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bulk action bar (shown only when rows are selected) ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' + '40' }}>
          <span className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>{selected.size} selected</span>
          <div className="flex-1" />
          <button type="button" onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors hover:bg-(--color-surface)"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
            <Download size={13} /> Export
          </button>
          <button type="button" onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors hover:bg-red-50"
            style={{ borderColor: '#fecaca', color: '#b91c1c', background: 'var(--color-surface)' }}>
            <Trash2 size={13} /> Delete
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="p-1.5 rounded-lg hover:bg-(--color-surface)" style={{ color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {search || activeFilterCount ? 'No contacts match your filters.' : 'No leads or patients yet.'}
          </p>
          {!search && !activeFilterCount && (
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
                    const sortKey  = c.key === 'modified' ? 'modified' : c.key === 'name' ? 'name' : 'created'
                    return (
                      <th key={c.key} className="text-left px-4 py-2.5 border-b border-(--color-border) whitespace-nowrap">
                        {sortable ? (
                          <button type="button" onClick={() => toggleSort(sortKey)}
                            className="flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-widest transition-colors hover:opacity-80"
                            style={{ color: 'var(--color-text-muted)' }}>
                            {c.label}<SortIcon col={sortKey} />
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
                {filtered.map((r, i) => {
                  const sel = selected.has(rowKey(r))
                  return (
                    <tr key={rowKey(r)} className="group transition-colors hover:bg-(--color-surface-2)"
                      style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--color-border)', background: sel ? 'var(--color-brand-50)' : undefined }}>
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
              {filtered.length} of {rows.length} contact{rows.length !== 1 ? 's' : ''}{activeFilterCount > 0 ? ' (filtered)' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
