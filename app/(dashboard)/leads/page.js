'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, Eye, EyeOff, X, Trash2, UserCheck, Download, RefreshCw, ChevronDown, Tag, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Badge, Card, Spinner } from '@/components/ui'
import { getLeads, deleteLead, updateLead, getTags } from '@/lib/supabase/queries'
import { getPref, setPref } from '@/lib/prefs'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, startOfDay, endOfDay } from 'date-fns'
import { logAudit, AUDIT } from '@/lib/audit'
import clsx from 'clsx'

// ── Constants ──────────────────────────────────────────────────
const STAGES     = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const SOURCES    = ['WhatsApp', 'Meta Ads', 'Website', 'Referral', 'Call', 'Email', 'Walk-in', 'Event', 'Other']
const GENDERS    = ['Male', 'Female', 'Other']

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
  { id: 'modified', label: 'Modified', defaultVisible: false },
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

// ── Multi-select dropdown (used for stage/priority/source/gender/tags/custom) ──
function MultiSelect({ label, icon: Icon, options, selected, onChange, align = 'left' }) {
  // options: array of { value, label, color? }
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

const opts = (arr) => arr.map(v => ({ value: v, label: v }))

// "Custom" dropdown — pick which custom module fields to expose as filters.
function CustomFieldPicker({ fields, active, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-500 transition-colors"
        style={active.length
          ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        <SlidersHorizontal size={13} />
        <span className="flex-1 text-left">Custom</span>
        {active.length > 0 && <span className="text-[10px] font-700 px-1.5 rounded-full" style={{ background: 'var(--color-brand)', color: 'white' }}>{active.length}</span>}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 right-0 min-w-48 max-h-64 overflow-y-auto rounded-xl border border-(--color-border) p-1"
          style={{ background: 'var(--color-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
          <p className="px-2.5 py-1.5 text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Custom fields</p>
          {fields.map(f => {
            const on = active.includes(f.colId)
            return (
              <button key={f.colId} type="button" onClick={() => onToggle(f.colId)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-(--color-surface-2)"
                style={{ color: 'var(--color-text-primary)' }}>
                <span className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                  style={on ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)' }}>
                  {on && <Check size={10} className="text-white" />}
                </span>
                <span className="flex-1 truncate">{f.label}</span>
              </button>
            )
          })}
        </div>
      )}
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
  const [filters, setFilters] = useState({ stages: [], priorities: [], sources: [], genders: [], tags: [], dateFrom: '', dateTo: '', custom: {} })

  // column sort (created / modified)
  const [sort,         setSort]        = useState({ field: null, dir: 'desc' })
  const [sortMenuCol,  setSortMenuCol] = useState(null)   // which col's dropdown is open
  const [availableTags, setAvailableTags] = useState([])
  const [activeCustom, setActiveCustom] = useState([]) // colIds of custom fields shown as filters

  useEffect(() => {
    if (!orgId) return
    getTags(orgId, 'leads').then(t => setAvailableTags(t || [])).catch(() => setAvailableTags([]))
  }, [orgId])

  // Stage options come from the org's configured lead stages.
  const stageOptions = useMemo(() => {
    const s = org?.settings?.lead_stages
    const names = (s && s.length ? s : STAGES).map(x => typeof x === 'string' ? x : x.name)
    return names.filter(Boolean)
  }, [org])

  // Custom module fields available to filter on (leads modules).
  const leadModuleFields = useMemo(() =>
    (org?.settings?.modules || [])
      .filter(m => m.page === 'leads' && m.active)
      .flatMap(m => (m.fields || []).map(f => ({
        colId: `mod::${m.id}::${f.id}`,
        moduleId: m.id, fieldId: f.id, label: f.label, type: f.type,
        options: (f.options || '').split(',').map(s => s.trim()).filter(Boolean),
      }))),
    [org])

  const setCustom = (colId, value) => setFilters(f => ({ ...f, custom: { ...f.custom, [colId]: value } }))
  const toggleCustomField = (colId) => {
    setActiveCustom(prev => prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId])
    if (activeCustom.includes(colId)) setCustom(colId, undefined) // clearing value when hiding
  }

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

  // Column visibility — initialise from saved prefs, then merge new columns as they appear
  const [visible, setVisible] = useState(() => {
    const saved = getPref('pref_lead_cols')
    const defaults = Object.fromEntries(BASE_COLUMNS.map(c => [c.id, c.defaultVisible]))
    return saved ? { ...defaults, ...saved } : defaults
  })
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
  useEffect(() => { setPref('pref_lead_cols', visible) }, [visible])

  // ── Selection ──
  const [selected, setSelected] = useState(new Set())

  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () =>
    setSelected(prev =>
      prev.size === sortedFiltered.length ? new Set() : new Set(sortedFiltered.map(l => l.id))
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
          case 'modified': return lead.updated_at ? format(new Date(lead.updated_at), 'MMM d, yyyy') : ''
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
    logAudit({ action: AUDIT.DATA_EXPORT, entityType: 'lead', description: `Exported ${rows.length} lead record(s) to CSV`, metadata: { count: rows.length, format: 'csv', columns: visibleCols.map(c => c.label) } })
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
    if (filters.genders.length    && !filters.genders.includes(patientGender(lead))) return false
    if (filters.tags.length) {
      const leadTagIds = (lead.tags || []).map(t => t.tags?.id).filter(Boolean)
      if (!filters.tags.some(id => leadTagIds.includes(id))) return false
    }
    if (filters.dateFrom && new Date(lead.created_at) < startOfDay(new Date(filters.dateFrom))) return false
    if (filters.dateTo   && new Date(lead.created_at) > endOfDay(new Date(filters.dateTo)))     return false
    // Custom module-field filters
    for (const [colId, val] of Object.entries(filters.custom)) {
      if (!val || (Array.isArray(val) && !val.length)) continue
      const fld = leadModuleFields.find(f => f.colId === colId)
      if (!fld) continue
      const cell = lead?.custom_data?.[fld.moduleId]?.[fld.fieldId] ?? ''
      if (Array.isArray(val)) { if (!val.includes(cell)) return false }
      else if (!String(cell).toLowerCase().includes(String(val).toLowerCase())) return false
    }
    return true
  })

  const customCount = Object.values(filters.custom).filter(v => Array.isArray(v) ? v.length : v).length
  const filterCount = filters.stages.length + filters.priorities.length + filters.sources.length + filters.genders.length + filters.tags.length + (filters.dateFrom || filters.dateTo ? 1 : 0) + customCount
  const hasFilters = filterCount > 0
  const clearFilters = () => { setFilters({ stages: [], priorities: [], sources: [], genders: [], tags: [], dateFrom: '', dateTo: '', custom: {} }); setActiveCustom([]) }

  const sortedFiltered = useMemo(() => {
    if (!sort.field) return filtered
    const key = sort.field === 'created' ? 'created_at' : 'updated_at'
    return [...filtered].sort((a, b) => {
      const ta = a[key] ? new Date(a[key]).getTime() : 0
      const tb = b[key] ? new Date(b[key]).getTime() : 0
      return sort.dir === 'asc' ? ta - tb : tb - ta
    })
  }, [filtered, sort])

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
      case 'modified': return (
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lead.updated_at ? format(new Date(lead.updated_at), 'MMM d, yyyy') : '—'}
        </span>
      )
      default: return null
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Leads</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? '—' : `${filtered.length} lead${filtered.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Link href="/leads/new">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-brand)' }}
            >
              <Plus size={16} /> New Lead
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
        <Card className="p-3 border-(--color-border) space-y-2.5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            <MultiSelect label="Stage"    options={opts(stageOptions)} selected={filters.stages}     onChange={v => setFilters(f => ({ ...f, stages: v }))} />
            <MultiSelect label="Priority" options={opts(PRIORITIES)}   selected={filters.priorities} onChange={v => setFilters(f => ({ ...f, priorities: v }))} />
            <MultiSelect label="Source"   options={opts(SOURCES)}      selected={filters.sources}    onChange={v => setFilters(f => ({ ...f, sources: v }))} />
            <MultiSelect label="Gender"   options={opts(GENDERS)}      selected={filters.genders}    onChange={v => setFilters(f => ({ ...f, genders: v }))} />
            <MultiSelect label="Tag" icon={Tag} options={availableTags.map(t => ({ value: t.id, label: t.name, color: t.color }))}
              selected={filters.tags} onChange={v => setFilters(f => ({ ...f, tags: v }))} />

            {/* Custom field picker — choose which custom fields to filter by */}
            {leadModuleFields.length > 0 && (
              <CustomFieldPicker fields={leadModuleFields} active={activeCustom} onToggle={toggleCustomField} />
            )}
          </div>

          {/* Date range + activated custom filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 items-start">
            <div className="col-span-2 flex items-center gap-1.5">
              <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>–</span>
              <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
            </div>

            {activeCustom.map(colId => {
              const fld = leadModuleFields.find(f => f.colId === colId)
              if (!fld) return null
              if (fld.type === 'select' || fld.type === 'boolean') {
                return <MultiSelect key={colId} label={fld.label}
                  options={opts(fld.type === 'boolean' ? ['Yes', 'No'] : fld.options)}
                  selected={filters.custom[colId] || []} onChange={v => setCustom(colId, v)} />
              }
              return (
                <div key={colId} className="relative">
                  <input value={filters.custom[colId] || ''} onChange={e => setCustom(colId, e.target.value)}
                    placeholder={fld.label}
                    className="w-full px-2.5 py-1.5 pr-6 text-xs rounded-lg border border-(--color-border) outline-none"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  <button type="button" onClick={() => toggleCustomField(colId)} className="absolute right-1.5 top-1/2 -translate-y-1/2" title="Remove filter">
                    <X size={12} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                </div>
              )
            })}
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
                      checked={sortedFiltered.length > 0 && selected.size === sortedFiltered.length}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < sortedFiltered.length }}
                      onChange={toggleAll}
                      className="w-4 h-4 cursor-pointer rounded"
                      style={{ accentColor: 'var(--color-brand)' }}
                    />
                  </th>
                  {/* Tag (pinned) */}
                  <th className="sticky left-12 z-20 text-left px-4 py-3 text-[11px] font-600 whitespace-nowrap border-r border-(--color-border)" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)' }}>
                    Tag
                  </th>
                  {visibleCols.map(col => {
                    const isSortable = col.id === 'created' || col.id === 'modified'
                    const isActive   = sort.field === col.id
                    return (
                      <th key={col.id} className="text-left px-4 py-3 text-[11px] font-600 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {isSortable ? (
                          <div className="relative inline-flex items-center gap-1">
                            {col.label}
                            <button
                              type="button"
                              onClick={() => setSortMenuCol(sortMenuCol === col.id ? null : col.id)}
                              className="p-0.5 rounded transition-colors hover:bg-(--color-surface)"
                              style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)' }}
                              title="Sort"
                            >
                              {isActive
                                ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
                                : <ArrowUpDown size={11} />}
                            </button>

                            {sortMenuCol === col.id && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setSortMenuCol(null)} />
                                <div
                                  className="absolute top-full left-0 mt-1 w-36 rounded-xl border overflow-hidden z-40"
                                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                                >
                                  {[{ dir: 'asc', label: 'Ascending' }, { dir: 'desc', label: 'Descending' }].map(opt => (
                                    <button
                                      key={opt.dir}
                                      type="button"
                                      onClick={() => { setSort({ field: col.id, dir: opt.dir }); setSortMenuCol(null) }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-(--color-surface-2)"
                                      style={{ color: 'var(--color-text-primary)' }}
                                    >
                                      {opt.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                                      {opt.label}
                                      {isActive && sort.dir === opt.dir && (
                                        <Check size={11} className="ml-auto" style={{ color: 'var(--color-brand)' }} />
                                      )}
                                    </button>
                                  ))}
                                  {isActive && (
                                    <button
                                      type="button"
                                      onClick={() => { setSort({ field: null, dir: 'desc' }); setSortMenuCol(null) }}
                                      className="w-full px-3 py-2 text-xs text-left border-t border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                                      style={{ color: 'var(--color-text-muted)' }}
                                    >
                                      Clear sort
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ) : col.label}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {sortedFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 2} className="px-4 py-20 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {hasFilters || search ? 'No leads match your filters.' : 'No leads yet. Create your first lead.'}
                    </td>
                  </tr>
                ) : sortedFiltered.map(lead => {
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
          {sortedFiltered.length > 0 && (
            <div
              className="px-4 py-2.5 border-t border-(--color-border) text-xs"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}
            >
              Showing {sortedFiltered.length} of {leads.length} leads
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
