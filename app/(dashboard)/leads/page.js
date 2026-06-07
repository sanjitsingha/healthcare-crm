'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, Eye, EyeOff, X, Trash2, UserCheck, Download, RefreshCw } from 'lucide-react'
import { Badge, Card, Spinner } from '@/components/ui'
import { getLeads, deleteLead, updateLead } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, startOfDay, endOfDay } from 'date-fns'
import clsx from 'clsx'

// ── Constants ──────────────────────────────────────────────────
const STAGES     = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const SOURCES    = ['WhatsApp', 'Meta Ads', 'Website', 'Referral', 'Call', 'Email', 'Walk-in', 'Event', 'Other']

const STAGE_STYLE = {
  New:        { bg: '#ede9fe', color: '#6d28d9' },
  Contacted:  { bg: '#dbeafe', color: '#1d4ed8' },
  Interested: { bg: '#fef3c7', color: '#b45309' },
  'Follow-up':{ bg: '#f3e8ff', color: '#7c3aed' },
  Converted:  { bg: '#dcfce7', color: '#15803d' },
  Lost:       { bg: '#fee2e2', color: '#b91c1c' },
}
const PRIORITY_STYLE = {
  Low:    { bg: '#dcfce7', color: '#15803d' },
  Medium: { bg: '#fef3c7', color: '#b45309' },
  High:   { bg: '#fee2e2', color: '#b91c1c' },
  Urgent: { bg: '#f3e8ff', color: '#7c3aed' },
}

// Base columns — extended dynamically with active module fields inside the component
const BASE_COLUMNS = [
  { id: 'name',     label: 'Name',     defaultVisible: true  },
  { id: 'phone',    label: 'Phone',    defaultVisible: true  },
  { id: 'email',    label: 'Email',    defaultVisible: false },
  { id: 'gender',   label: 'Gender',   defaultVisible: false },
  { id: 'city',     label: 'City',     defaultVisible: false },
  { id: 'stage',    label: 'Stage',    defaultVisible: true  },
  { id: 'priority', label: 'Priority', defaultVisible: true  },
  { id: 'source',   label: 'Source',   defaultVisible: true  },
  { id: 'created',  label: 'Created',  defaultVisible: true  },
]

// ── Helpers ────────────────────────────────────────────────────
function patientName(lead) {
  if (lead.first_name) return `${lead.first_name} ${lead.last_name || ''}`.trim()
  if (lead.patients)   return `${lead.patients.first_name} ${lead.patients.last_name || ''}`.trim()
  return lead.title
}

function patientPhone(lead)  { return lead.phone  || lead.patients?.phone  || '—' }
function patientEmail(lead)  { return lead.email  || lead.patients?.email  || '—' }
function patientGender(lead) { return lead.gender || lead.patients?.gender || '—' }
function patientCity(lead) {
  const addr = lead.address || lead.patients?.address || ''
  const parts = addr.split(',')
  return parts.length >= 2 ? parts[parts.length - 2].trim() : (addr || '—')
}

function StyledBadge({ label, styleMap }) {
  const s = styleMap?.[label] || {}
  return (
    <span
      className="text-[10px] font-600 px-2 py-0.5 rounded-full"
      style={{ background: s.bg || '#f3f4f6', color: s.color || '#374151' }}
    >
      {label}
    </span>
  )
}

function MultiPill({ label, options, selected, onChange }) {
  const toggle = (v) =>
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="px-2.5 py-1 rounded-full text-xs font-500 border transition-all"
            style={selected.includes(opt)
              ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
              : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Column visibility dropdown ─────────────────────────────────
function ColumnToggle({ allColumns, visible, setVisible }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeCount = Object.values(visible).filter(Boolean).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-(--color-border) text-sm font-500 transition-colors hover:bg-(--color-brand-50)"
        style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {open ? <EyeOff size={15} /> : <Eye size={15} />}
        Columns
        <span
          className="text-[10px] font-600 px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
        >
          {activeCount}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-(--color-border) shadow-lg z-20 p-2"
          style={{ background: 'var(--color-surface)' }}
        >
          <p className="text-[10px] font-600 uppercase tracking-wider px-2 py-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Show / Hide Columns
          </p>
          {allColumns.map(col => (
            <button
              key={col.id}
              onClick={() => setVisible(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors hover:bg-(--color-brand-50)"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {col.label}
              <div
                className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                style={visible[col.id]
                  ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' }
                  : { borderColor: 'var(--color-border)' }}
              >
                {visible[col.id] && <span className="text-white text-[10px] font-800">✓</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function LeadsPage() {
  const { orgId, org } = useOrg()
  const router = useRouter()

  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)

  // filters
  const [search,      setSearch]      = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({ stages: [], priorities: [], sources: [], dateFrom: '', dateTo: '' })

  // Build column list: base columns + one column per field in every active leads module
  const allColumns = useMemo(() => {
    const moduleFields = (org?.settings?.modules || [])
      .filter(m => m.page === 'leads' && m.active)
      .flatMap(m =>
        (m.fields || []).map(f => ({
          id:             `mod::${m.id}::${f.id}`,
          label:          f.label,
          defaultVisible: false,
          moduleId:       m.id,
          fieldId:        f.id,
        }))
      )
    return [...BASE_COLUMNS, ...moduleFields]
  }, [org])

  // Column visibility — initialise from defaults; add new columns as they appear
  const [visible, setVisible] = useState(() =>
    Object.fromEntries(BASE_COLUMNS.map(c => [c.id, c.defaultVisible]))
  )
  useEffect(() => {
    setVisible(prev => {
      const next = { ...prev }
      let changed = false
      allColumns.forEach(col => {
        if (!(col.id in next)) { next[col.id] = col.defaultVisible; changed = true }
      })
      return changed ? next : prev
    })
  }, [allColumns])

  // ── Selection ──
  const [selected, setSelected] = useState(new Set())

  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () =>
    setSelected(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id))
    )

  const clearSelection = () => setSelected(new Set())

  // ── Bulk actions ──
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} lead${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map(id => deleteLead(id)))
      setLeads(prev => prev.filter(l => !selected.has(l.id)))
      clearSelection()
    } catch (err) { alert(err.message) }
  }

  const handleMoveToPatient = async () => {
    if (!confirm(`Mark ${selected.size} lead${selected.size !== 1 ? 's' : ''} as Converted?`)) return
    try {
      await Promise.all([...selected].map(id => updateLead(id, { stage: 'Converted' })))
      setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, stage: 'Converted' } : l))
      clearSelection()
    } catch (err) { alert(err.message) }
  }

  const handleExport = () => {
    const rows = leads
      .filter(l => selected.has(l.id))
      .map(lead => visibleCols.map(col => {
        if (col.moduleId) return lead?.custom_data?.[col.moduleId]?.[col.fieldId] || ''
        switch (col.id) {
          case 'name':     return patientName(lead)
          case 'phone':    return patientPhone(lead)
          case 'email':    return patientEmail(lead)
          case 'gender':   return patientGender(lead)
          case 'city':     return patientCity(lead)
          case 'stage':    return lead.stage
          case 'priority': return lead.priority
          case 'source':   return lead.source
          case 'created':  return format(new Date(lead.created_at), 'MMM d, yyyy')
          default:         return ''
        }
      }))
    const header = visibleCols.map(c => c.label)
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    clearSelection()
  }

  // ── Fetch ──
  const loadLeads = useCallback(() => {
    if (!orgId) return
    setLoading(true)
    getLeads({ orgId })
      .then(data => setLeads(data || []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [orgId])

  useEffect(() => { loadLeads() }, [loadLeads])

  // ── Client-side filtering ──
  const filtered = leads.filter(lead => {
    if (search) {
      const q = search.toLowerCase()
      const name  = patientName(lead).toLowerCase()
      const phone = patientPhone(lead).toLowerCase()
      const email = patientEmail(lead).toLowerCase()
      if (!name.includes(q) && !phone.includes(q) && !email.includes(q)) return false
    }
    if (filters.stages.length     && !filters.stages.includes(lead.stage))       return false
    if (filters.priorities.length && !filters.priorities.includes(lead.priority)) return false
    if (filters.sources.length    && !filters.sources.includes(lead.source))      return false
    if (filters.dateFrom && new Date(lead.created_at) < startOfDay(new Date(filters.dateFrom))) return false
    if (filters.dateTo   && new Date(lead.created_at) > endOfDay(new Date(filters.dateTo)))     return false
    return true
  })

  const filterCount = filters.stages.length + filters.priorities.length + filters.sources.length + (filters.dateFrom || filters.dateTo ? 1 : 0)
  const hasFilters = filterCount > 0
  const clearFilters = () => setFilters({ stages: [], priorities: [], sources: [], dateFrom: '', dateTo: '' })

  const visibleCols = allColumns.filter(c => visible[c.id])

  const renderCell = (col, lead) => {
    // Custom module field
    if (col.moduleId) {
      const val = lead?.custom_data?.[col.moduleId]?.[col.fieldId]
      return <span className="text-xs" style={{ color: val ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{val || '—'}</span>
    }
    switch (col.id) {
      case 'name':     return (
        <span className="font-600 text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
          {patientName(lead)}
        </span>
      )
      case 'phone':    return <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{patientPhone(lead)}</span>
      case 'email':    return <span className="text-xs truncate max-w-45 block" style={{ color: 'var(--color-text-secondary)' }}>{patientEmail(lead)}</span>
      case 'gender':   return <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{patientGender(lead)}</span>
      case 'city':     return <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{patientCity(lead)}</span>
      case 'stage':    return <StyledBadge label={lead.stage}    styleMap={STAGE_STYLE} />
      case 'priority': return <StyledBadge label={lead.priority} styleMap={PRIORITY_STYLE} />
      case 'source':   return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
          {lead.source}
        </span>
      )
      case 'created':  return (
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {format(new Date(lead.created_at), 'MMM d, yyyy')}
        </span>
      )
      default: return null
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Leads</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {loading ? '—' : `${filtered.length} lead${filtered.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            title="Refresh leads"
            className="p-2 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-surface-2) disabled:opacity-50"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <Link href="/leads/new">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-brand)' }}
          >
            <Plus size={16} /> New Lead
          </button>
        </Link>
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
            value={search}
            onChange={e => setSearch(e.target.value)}
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
          style={filtersOpen || hasFilters
            ? { background: 'var(--color-brand)' }
            : { color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
        >
          <SlidersHorizontal size={15} />
          Filters
          {hasFilters && (
            <span className="bg-white/30 text-[10px] font-700 px-1.5 py-0.5 rounded-full">
              {filterCount}
            </span>
          )}
        </button>

        {/* Column toggle */}
        <ColumnToggle allColumns={allColumns} visible={visible} setVisible={setVisible} />
      </div>

      {/* Advanced filter panel */}
      {filtersOpen && (
        <Card className="p-4 border-(--color-border) space-y-4">
          <div className="grid grid-cols-3 gap-6">
            <MultiPill label="Stage"    options={STAGES}     selected={filters.stages}     onChange={v => setFilters(f => ({ ...f, stages: v }))} />
            <MultiPill label="Priority" options={PRIORITIES} selected={filters.priorities} onChange={v => setFilters(f => ({ ...f, priorities: v }))} />
            <MultiPill label="Source"   options={SOURCES}    selected={filters.sources}    onChange={v => setFilters(f => ({ ...f, sources: v }))} />
          </div>

          {/* Created date range */}
          <div className="pt-3 border-t border-(--color-border)">
            <p className="text-xs font-600 mb-2" style={{ color: 'var(--color-text-secondary)' }}>Created date</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>From</span>
                <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined}
                  onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>To</span>
                <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined}
                  onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <button type="button" onClick={() => setFilters(f => ({ ...f, dateFrom: '', dateTo: '' }))}
                  className="text-[11px] font-600 px-2 py-1 rounded-md hover:bg-(--color-surface-2)" style={{ color: 'var(--color-text-muted)' }}>
                  Clear dates
                </button>
              )}
            </div>
          </div>
          {hasFilters ? (
            <div className="flex justify-end pt-2 border-t border-(--color-border)">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                <X size={12} /> Clear All Filters
              </button>
            </div>
          ) : null}
        </Card>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }}
        >
          <span className="text-sm font-600" style={{ color: 'var(--color-brand)' }}>
            {selected.size} lead{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={clearSelection}
            className="text-xs font-500 px-2 py-1 rounded-lg hover:bg-white/50 transition-colors"
            style={{ color: 'var(--color-brand)' }}
          >
            Deselect all
          </button>
          <div className="flex-1" />
          <button
            onClick={handleMoveToPatient}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-green-200 bg-white text-green-700 hover:bg-green-50 transition-colors"
          >
            <UserCheck size={14} /> Move to Patient
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-(--color-border) bg-white hover:bg-gray-50 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size={32} />
        </div>
      ) : (
        <Card className="p-0 overflow-hidden border-(--color-border)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                  {/* Select-all checkbox (pinned) */}
                  <th className="sticky left-0 z-20 w-12 px-3 py-3" style={{ background: 'var(--color-surface-2)' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length }}
                      onChange={toggleAll}
                      className="w-4 h-4 cursor-pointer rounded"
                      style={{ accentColor: 'var(--color-brand)' }}
                    />
                  </th>
                  {/* Tag (pinned) */}
                  <th className="sticky left-12 z-20 text-left px-4 py-3 text-[11px] font-600 whitespace-nowrap border-r border-(--color-border)" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)' }}>
                    Tag
                  </th>
                  {visibleCols.map(col => (
                    <th key={col.id} className="text-left px-4 py-3 text-[11px] font-600 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 2} className="px-4 py-20 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {hasFilters || search ? 'No leads match your filters.' : 'No leads yet. Create your first lead.'}
                    </td>
                  </tr>
                ) : filtered.map(lead => {
                  const rowBg = selected.has(lead.id) ? '#eef6f2' : 'var(--color-surface)'
                  const leadTags = (lead.tags || []).map(t => t.tags).filter(Boolean)
                  return (
                  <tr
                    key={lead.id}
                    className={clsx(
                      'transition-colors',
                      selected.has(lead.id) ? 'bg-(--color-brand-50)/60' : 'hover:bg-(--color-brand-50)/30'
                    )}
                  >
                    {/* Row checkbox (pinned) */}
                    <td className="sticky left-0 z-10 w-12 px-3 py-3" style={{ background: rowBg }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        className="w-4 h-4 cursor-pointer rounded"
                        style={{ accentColor: 'var(--color-brand)' }}
                      />
                    </td>
                    {/* Tag (pinned) */}
                    <td className="sticky left-12 z-10 px-4 py-3 border-r border-(--color-border) cursor-pointer align-top" style={{ background: rowBg }} onClick={() => router.push(`/leads/${lead.id}`)}>
                      {leadTags.length === 0 ? (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1 max-w-60">
                          {leadTags.map(tag => {
                            const tc = tag.color || '#6366f1'
                            return (
                              <span key={tag.id} className="relative inline-flex items-center pl-2.5 pr-2 py-0.5 text-[10px] font-600 whitespace-nowrap"
                                style={{ background: tc, color: 'white', clipPath: 'polygon(7px 0, 100% 0, 100% 100%, 7px 100%, 0 50%)' }}>
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }} />
                                {tag.name}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </td>
                    {visibleCols.map(col => (
                      <td
                        key={col.id}
                        className="px-4 py-3 whitespace-nowrap cursor-pointer"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                      >
                        {renderCell(col, lead)}
                      </td>
                    ))}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div
              className="px-4 py-2.5 border-t border-(--color-border) text-xs"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}
            >
              Showing {filtered.length} of {leads.length} leads
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
