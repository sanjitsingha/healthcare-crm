'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, Eye, EyeOff, X, Trash2, Download, ToggleLeft, ToggleRight, RefreshCw, ChevronDown, Tag, Check, Calendar } from 'lucide-react'
import { Card, Spinner } from '@/components/ui'
import { getPatients, deletePatient, updatePatient, getTags } from '@/lib/supabase/queries'
import { logAudit, AUDIT } from '@/lib/audit'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import { getPref, setPref } from '@/lib/prefs'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, differenceInYears, startOfDay, endOfDay } from 'date-fns'
import clsx from 'clsx'

// ── Constants ──────────────────────────────────────────────────
const GENDERS  = ['Male', 'Female', 'Other']
const DEFAULT_STATUSES = [{ name: 'Active', color: '#10b981' }, { name: 'Inactive', color: '#ef4444' }]
const GENDER_STYLE = {
  Male:   { bg: '#dbeafe', color: '#1d4ed8' },
  Female: { bg: '#fce7f3', color: '#be185d' },
  Other:  { bg: '#f3f4f6', color: '#374151' },
}

const BASE_COLUMNS = [
  { id: 'name',       label: 'Name',         defaultVisible: true  },
  { id: 'phone',      label: 'Phone',        defaultVisible: true  },
  { id: 'email',      label: 'Email',        defaultVisible: false },
  { id: 'gender',     label: 'Gender',       defaultVisible: true  },
  { id: 'age',        label: 'Age',          defaultVisible: true  },
  { id: 'dob',        label: 'Date of Birth',defaultVisible: false },
  { id: 'city',       label: 'City',         defaultVisible: false },
  { id: 'status',     label: 'Status',       defaultVisible: true  },
  { id: 'registered', label: 'Registered',   defaultVisible: true  },
]

// ── Helpers ────────────────────────────────────────────────────
const fullName    = p => `${p.first_name} ${p.last_name || ''}`.trim()
const calcAge     = dob => dob ? differenceInYears(new Date(), new Date(dob)) : null
const extractCity = addr => { if (!addr) return '—'; const p = addr.split(','); return p.length >= 2 ? p[p.length - 2].trim() : addr }

function StyledBadge({ label, styleMap }) {
  const s = styleMap?.[label] || {}
  return (
    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: s.bg || '#f3f4f6', color: s.color || '#374151' }}>
      {label}
    </span>
  )
}

function MultiPill({ label, options, selected, onChange }) {
  const toggle = v => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className="px-2.5 py-1 rounded-full text-xs font-500 border transition-all"
            style={selected.includes(opt)
              ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
              : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
          >{opt}</button>
        ))}
      </div>
    </div>
  )
}

// ── Multi-select dropdown (status/gender/tags/custom) ──
function MultiSelect({ label, icon: Icon, options, selected, onChange }) {
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
        <div className="absolute z-30 mt-1 left-0 min-w-44 max-h-64 overflow-y-auto rounded-xl border border-(--color-border) p-1"
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

// ── Date-range dropdown — one button, opens start + end pickers with presets ──
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
  const summary = from && to ? `${fmt(from)} – ${fmt(to)}`
    : from ? `From ${fmt(from)}`
    : to   ? `Until ${fmt(to)}`
    : label

  const iso = (d) => format(d, 'yyyy-MM-dd')
  const applyPreset = (days) => {
    const end = new Date()
    const start = new Date()
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
          <span onClick={(e) => { e.stopPropagation(); onChange('', '') }}
            className="shrink-0 rounded hover:bg-(--color-surface-2) p-0.5" title="Clear">
            <X size={12} />
          </span>
        )}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className={clsx('absolute z-30 mt-1 w-64 rounded-xl border border-(--color-border) p-2.5', align === 'right' ? 'right-0' : 'left-0')}
          style={{ background: 'var(--color-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1 mb-2.5">
            {[
              { label: 'Today',     run: () => applyPreset(1) },
              { label: 'Last 7d',   run: () => applyPreset(7) },
              { label: 'Last 30d',  run: () => applyPreset(30) },
              { label: 'This month', run: applyThisMonth },
            ].map(p => (
              <button key={p.label} type="button" onClick={p.run}
                className="px-2 py-1 text-[11px] font-600 rounded-md border border-(--color-border) transition-colors hover:bg-(--color-brand-50) hover:border-(--color-brand)"
                style={{ color: 'var(--color-text-secondary)' }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Start / end */}
          <label className="block text-[10px] font-700 uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Start date</label>
          <input type="date" value={from || ''} max={to || undefined}
            onChange={e => onChange(e.target.value, to)}
            className="w-full px-2 py-1.5 mb-2.5 text-xs rounded-lg border border-(--color-border) outline-none focus:border-(--color-brand)"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />

          <label className="block text-[10px] font-700 uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>End date</label>
          <input type="date" value={to || ''} min={from || undefined}
            onChange={e => onChange(from, e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none focus:border-(--color-brand)"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />

          {active && (
            <button type="button" onClick={() => { onChange('', ''); }}
              className="w-full text-center px-2.5 py-1.5 mt-2.5 border-t border-(--color-border) text-[11px] font-600" style={{ color: 'var(--color-text-muted)' }}>
              Clear dates
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

function ColumnToggle({ allColumns, visible, setVisible }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const count = Object.values(visible).filter(Boolean).length
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-(--color-border) text-sm font-500 transition-colors hover:bg-(--color-brand-50)"
        style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {open ? <EyeOff size={15} /> : <Eye size={15} />} Columns
        <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{count}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-(--color-border) shadow-lg z-20 p-2" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[10px] font-600 uppercase tracking-wider px-2 py-1.5" style={{ color: 'var(--color-text-muted)' }}>Show / Hide Columns</p>
          {allColumns.map(col => (
            <button key={col.id} onClick={() => setVisible(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors hover:bg-(--color-brand-50)"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {col.label}
              <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                style={visible[col.id] ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)' }}>
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
export default function PatientsPage() {
  const { orgId, org, hasPermission } = useOrg()
  const patientStatuses = (org?.settings?.patient_statuses || DEFAULT_STATUSES).map(s => typeof s === 'string' ? { name: s, color: '#6366f1' } : s)
  const STATUSES = patientStatuses.map(s => s.name)
  const STATUS_STYLE = Object.fromEntries(patientStatuses.map(s => [s.name, { bg: s.color + '20', color: s.color }]))
  const router = useRouter()

  const [patients, setPatients] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters]   = useState({ genders: [], statuses: [], tags: [], dateFrom: '', dateTo: '', custom: {} })
  const [availableTags, setAvailableTags] = useState([])
  const [activeCustom, setActiveCustom] = useState([])
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    if (!orgId) return
    getTags(orgId, 'patients').then(t => setAvailableTags(t || [])).catch(() => setAvailableTags([]))
  }, [orgId])

  // Custom patient-module fields available to filter on.
  const patientModuleFields = useMemo(() =>
    (org?.settings?.modules || [])
      .filter(m => m.page === 'patients' && m.active)
      .flatMap(m => (m.fields || []).map(f => ({
        colId: `mod::${m.id}::${f.id}`,
        moduleId: m.id, fieldId: f.id, label: f.label, type: f.type,
        options: (f.options || '').split(',').map(s => s.trim()).filter(Boolean),
      }))),
    [org])

  const setCustom = (colId, value) => setFilters(f => ({ ...f, custom: { ...f.custom, [colId]: value } }))
  const toggleCustomField = (colId) => {
    setActiveCustom(prev => prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId])
    if (activeCustom.includes(colId)) setCustom(colId, undefined)
  }

  // ── Dynamic columns: base + active patient modules ──
  const allColumns = useMemo(() => {
    const moduleFields = (org?.settings?.modules || [])
      .filter(m => m.page === 'patients' && m.active)
      .flatMap(m => (m.fields || []).map(f => ({
        id:             `mod::${m.id}::${f.id}`,
        label:          f.label,
        defaultVisible: false,
        moduleId:       m.id,
        fieldId:        f.id,
      })))
    return [...BASE_COLUMNS, ...moduleFields]
  }, [org])

  const [visible, setVisible] = useState(() => {
    const saved = getPref('pref_patient_cols')
    const defaults = Object.fromEntries(BASE_COLUMNS.map(c => [c.id, c.defaultVisible]))
    return saved ? { ...defaults, ...saved } : defaults
  })
  useEffect(() => {
    setVisible(prev => {
      const next = { ...prev }; let changed = false
      allColumns.forEach(col => { if (!(col.id in next)) { next[col.id] = col.defaultVisible; changed = true } })
      return changed ? next : prev
    })
  }, [allColumns])
  useEffect(() => { setPref('pref_patient_cols', visible) }, [visible])

  // ── Fetch ──
  const loadPatients = useCallback(() => {
    if (!orgId) return
    setLoading(true)
    getPatients({ orgId })
      .then(data => setPatients(data || []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false))
  }, [orgId])

  useEffect(() => { loadPatients() }, [loadPatients])

  // ── Client-side filtering ──
  const filtered = patients.filter(p => {
    if (search) {
      const q = search.toLowerCase()
      if (!fullName(p).toLowerCase().includes(q) && !(p.phone || '').includes(q) && !(p.email || '').toLowerCase().includes(q)) return false
    }
    if (filters.genders.length  && !filters.genders.includes(p.gender))   return false
    if (filters.statuses.length && !filters.statuses.includes(p.status))  return false
    if (filters.tags.length) {
      const ptags = (p.tags || []).map(t => t.tags?.id).filter(Boolean)
      if (!filters.tags.some(id => ptags.includes(id))) return false
    }
    if (filters.dateFrom && new Date(p.created_at) < startOfDay(new Date(filters.dateFrom))) return false
    if (filters.dateTo   && new Date(p.created_at) > endOfDay(new Date(filters.dateTo)))     return false
    for (const [colId, val] of Object.entries(filters.custom)) {
      if (!val || (Array.isArray(val) && !val.length)) continue
      const fld = patientModuleFields.find(f => f.colId === colId)
      if (!fld) continue
      const cell = p?.custom_data?.[fld.moduleId]?.[fld.fieldId] ?? ''
      if (Array.isArray(val)) { if (!val.includes(cell)) return false }
      else if (!String(cell).toLowerCase().includes(String(val).toLowerCase())) return false
    }
    return true
  })

  const customCount = Object.values(filters.custom).filter(v => Array.isArray(v) ? v.length : v).length
  const filterCount = filters.genders.length + filters.statuses.length + filters.tags.length + (filters.dateFrom || filters.dateTo ? 1 : 0) + customCount
  const hasFilters  = filterCount > 0
  const clearFilters = () => { setFilters({ genders: [], statuses: [], tags: [], dateFrom: '', dateTo: '', custom: {} }); setActiveCustom([]) }

  // ── Selection ──
  const toggleOne  = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll  = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)))
  const clearSel   = () => setSelected(new Set())

  // ── Bulk actions ──
  const handleBulkDelete = async () => {
    const ok = await showConfirm({
      title: `Delete ${selected.size} patient${selected.size !== 1 ? 's' : ''}?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await Promise.all([...selected].map(id => deletePatient(id)))
      setPatients(prev => prev.filter(p => !selected.has(p.id)))
      clearSel()
      toast({ type: 'success', title: 'Deleted', message: `${selected.size} patient${selected.size !== 1 ? 's' : ''} deleted` })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const handleBulkStatus = async (status) => {
    try {
      await Promise.all([...selected].map(id => updatePatient(id, { status })))
      setPatients(prev => prev.map(p => selected.has(p.id) ? { ...p, status } : p))
      clearSel()
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const handleExport = () => {
    const visibleCols = allColumns.filter(c => visible[c.id])
    const rows = patients.filter(p => selected.has(p.id)).map(p =>
      visibleCols.map(col => {
        if (col.moduleId) return p?.custom_data?.[col.moduleId]?.[col.fieldId] || ''
        switch (col.id) {
          case 'name':       return fullName(p)
          case 'phone':      return p.phone || ''
          case 'email':      return p.email || ''
          case 'gender':     return p.gender || ''
          case 'age':        return calcAge(p.date_of_birth) ?? ''
          case 'dob':        return p.date_of_birth ? format(new Date(p.date_of_birth), 'yyyy-MM-dd') : ''
          case 'city':       return extractCity(p.address)
          case 'status':     return p.status || ''
          case 'registered': return format(new Date(p.created_at), 'MMM d, yyyy')
          default:           return ''
        }
      })
    )
    const csv = [visibleCols.map(c => c.label), ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `patients-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    logAudit({ action: AUDIT.DATA_EXPORT, entityType: 'patient', description: `Exported ${rows.length} patient record(s) to CSV`, metadata: { count: rows.length, format: 'csv' } })
    clearSel()
  }

  const visibleCols = allColumns.filter(c => visible[c.id])

  const renderCell = (col, p) => {
    if (col.moduleId) {
      const val = p?.custom_data?.[col.moduleId]?.[col.fieldId]
      return <span className="text-xs" style={{ color: val ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{val || '—'}</span>
    }
    const age = calcAge(p.date_of_birth)
    switch (col.id) {
      case 'name':       return <span className="font-600 text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{fullName(p)}</span>
      case 'phone':      return <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.phone || '—'}</span>
      case 'email':      return <span className="text-xs max-w-45 truncate block" style={{ color: 'var(--color-text-secondary)' }}>{p.email || '—'}</span>
      case 'gender':     return p.gender ? <StyledBadge label={p.gender} styleMap={GENDER_STYLE} /> : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
      case 'age':        return <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{age != null ? `${age} yrs` : '—'}</span>
      case 'dob':        return <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.date_of_birth ? format(new Date(p.date_of_birth), 'MMM d, yyyy') : '—'}</span>
      case 'city':       return <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{extractCity(p.address)}</span>
      case 'status':     return <StyledBadge label={p.status || 'Active'} styleMap={STATUS_STYLE} />
      case 'registered': return <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{format(new Date(p.created_at), 'MMM d, yyyy')}</span>
      default:           return null
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Patients</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? '—' : `${filtered.length} patient${filtered.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadPatients} disabled={loading} title="Refresh patients"
            className="btn btn-secondary btn-icon disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {hasPermission('patients.create') && (
            <Link href="/patients/new">
              <button className="btn btn-primary btn-md">
                <Plus size={16} /> New Patient
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-(--color-border) outline-none transition-all"
            style={{ background: 'var(--color-surface)' }}
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={13} style={{ color: 'var(--color-text-muted)' }} /></button>}
        </div>
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-500 transition-all', filtersOpen || hasFilters ? 'text-white' : 'border-(--color-border) hover:bg-(--color-brand-50)')}
          style={filtersOpen || hasFilters ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
        >
          <SlidersHorizontal size={15} /> Filters
          {hasFilters ? <span className="bg-white/30 text-[10px] font-700 px-1.5 py-0.5 rounded-full">{filterCount}</span> : null}
        </button>
        <ColumnToggle allColumns={allColumns} visible={visible} setVisible={setVisible} />
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <Card className="p-3 border-(--color-border) space-y-2.5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            <MultiSelect label="Status" options={opts(STATUSES)} selected={filters.statuses} onChange={v => setFilters(f => ({ ...f, statuses: v }))} />
            <MultiSelect label="Gender" options={opts(GENDERS)}  selected={filters.genders}  onChange={v => setFilters(f => ({ ...f, genders: v }))} />
            <MultiSelect label="Tag" icon={Tag} options={availableTags.map(t => ({ value: t.id, label: t.name, color: t.color }))}
              selected={filters.tags} onChange={v => setFilters(f => ({ ...f, tags: v }))} />
            {patientModuleFields.length > 0 && (
              <CustomFieldPicker fields={patientModuleFields} active={activeCustom} onToggle={toggleCustomField} />
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 items-start">
            <div className="col-span-2">
              <DateRangeSelect from={filters.dateFrom} to={filters.dateTo}
                onChange={(dateFrom, dateTo) => setFilters(f => ({ ...f, dateFrom, dateTo }))} />
            </div>

            {activeCustom.map(colId => {
              const fld = patientModuleFields.find(f => f.colId === colId)
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
              <button onClick={clearFilters} className="btn btn-danger btn-sm">
                <X size={12} /> Clear all
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }}>
          <span className="text-sm font-600" style={{ color: 'var(--color-brand)' }}>{selected.size} patient{selected.size !== 1 ? 's' : ''} selected</span>
          <button onClick={clearSel} className="text-xs font-500 px-2 py-1 rounded-lg hover:bg-white/50 transition-colors" style={{ color: 'var(--color-brand)' }}>Deselect all</button>
          <div className="flex-1" />
          <button onClick={() => handleBulkStatus('Active')} className="btn btn-success btn-sm">
            <ToggleRight size={14} /> Mark Active
          </button>
          <button onClick={() => handleBulkStatus('Inactive')} className="btn btn-secondary btn-sm">
            <ToggleLeft size={14} /> Mark Inactive
          </button>
          <button onClick={handleExport} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export
          </button>
          {hasPermission('patients.delete') && (
            <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24"><Spinner size={32} /></div>
      ) : (
        <Card className="p-0 overflow-hidden border-(--color-border)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length }}
                      onChange={toggleAll}
                      className="w-4 h-4 cursor-pointer rounded"
                      style={{ accentColor: 'var(--color-brand)' }}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-600 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>Tag</th>
                  {visibleCols.map(col => (
                    <th key={col.id} className="text-left px-4 py-3 text-[11px] font-600 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 2} className="px-4 py-20 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {hasFilters || search ? 'No patients match your filters.' : 'No patients yet. Add your first patient.'}
                    </td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className={clsx('transition-colors', selected.has(p.id) ? 'bg-(--color-brand-50)/60' : 'hover:bg-(--color-brand-50)/30')}>
                    <td className="w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                        className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: 'var(--color-brand)' }} />
                    </td>
                    <td className="px-4 py-3 align-top cursor-pointer" onClick={() => router.push(`/patients/${p.id}`)}>
                      {(() => {
                        const pTags = (p.tags || []).map(t => t.tags).filter(Boolean)
                        if (pTags.length === 0) return <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                        return (
                          <div className="flex flex-wrap items-center gap-1 max-w-60">
                            {pTags.map(tag => {
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
                        )
                      })()}
                    </td>
                    {visibleCols.map(col => (
                      <td key={col.id} className="px-4 py-3 whitespace-nowrap cursor-pointer" onClick={() => router.push(`/patients/${p.id}`)}>
                        {renderCell(col, p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-(--color-border) text-xs" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              Showing {filtered.length} of {patients.length} patients
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
