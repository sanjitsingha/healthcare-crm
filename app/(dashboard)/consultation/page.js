'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Plus, Search, SlidersHorizontal, Eye, EyeOff, X,
  Trash2, Download, RefreshCw, ChevronDown, Check, UserRound, TrendingUp, Calendar,
} from 'lucide-react'
import { Card, Spinner, Avatar } from '@/components/ui'
import { getPatients, getLeads, getAppointments, deletePatient, deleteLead } from '@/lib/supabase/queries'
import { getPref, setPref } from '@/lib/prefs'
import { useOrg } from '@/lib/context/OrgContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, startOfDay, endOfDay } from 'date-fns'
import { logAudit, AUDIT } from '@/lib/audit'
import clsx from 'clsx'

const TYPE_OPTIONS = ['Patient', 'Lead']
const STATUS_OPTIONS = ['Active', 'Inactive', 'Discharged']

const BASE_COLUMNS = [
  { id: 'name',         label: 'Name',           defaultVisible: true  },
  { id: 'type',         label: 'Type',           defaultVisible: true  },
  { id: 'phone',        label: 'Phone',          defaultVisible: true  },
  { id: 'email',        label: 'Email',          defaultVisible: false },
  { id: 'detail',       label: 'Stage / Status', defaultVisible: true  },
  { id: 'appointments', label: 'Appointments',   defaultVisible: true  },
  { id: 'created',      label: 'Created',        defaultVisible: true  },
]

// ── MultiSelect dropdown ───────────────────────────────────────
function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const toggle = v => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  const count = selected.length
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-500 transition-colors"
        style={count
          ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        <span className="flex-1 text-left truncate">{label}</span>
        {count > 0 && <span className="text-[10px] font-700 px-1.5 rounded-full" style={{ background: 'var(--color-brand)', color: 'white' }}>{count}</span>}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 min-w-44 max-h-60 overflow-y-auto rounded-xl border border-(--color-border) p-1"
          style={{ background: 'var(--color-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
          {options.map(o => {
            const on = selected.includes(typeof o === 'string' ? o : o.value)
            const val = typeof o === 'string' ? o : o.value
            const lbl = typeof o === 'string' ? o : o.label
            const col = typeof o === 'object' ? o.color : null
            return (
              <button key={val} type="button" onClick={() => toggle(val)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-(--color-surface-2)"
                style={{ color: 'var(--color-text-primary)' }}>
                <span className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                  style={on ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)' }}>
                  {on && <Check size={10} className="text-white" />}
                </span>
                {col && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col }} />}
                <span className="flex-1 truncate">{lbl}</span>
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

// ── Custom field picker ────────────────────────────────────────
function CustomFieldPicker({ fields, active, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
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
        <div className="absolute z-30 mt-1 right-0 min-w-52 max-h-64 overflow-y-auto rounded-xl border border-(--color-border) p-1"
          style={{ background: 'var(--color-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
          <p className="px-2.5 py-1.5 text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Custom fields</p>
          {fields.length === 0 && <p className="px-2.5 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No custom fields</p>}
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
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  {f.page}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Column visibility ─────────────────────────────────────────
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
        style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        {open ? <EyeOff size={15} /> : <Eye size={15} />} Columns
        <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{count}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-(--color-border) shadow-lg z-20 p-2" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[10px] font-600 uppercase tracking-wider px-2 py-1.5" style={{ color: 'var(--color-text-muted)' }}>Show / Hide Columns</p>
          {allColumns.map(col => (
            <button key={col.id} onClick={() => setVisible(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors hover:bg-(--color-brand-50)"
              style={{ color: 'var(--color-text-primary)' }}>
              <span className="truncate mr-2">{col.label}</span>
              <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
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

// ── Main page ──────────────────────────────────────────────────
export default function ConsultationPage() {
  const { orgId, org } = useOrg()
  const router = useRouter()

  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)

  // filters
  const [filters, setFilters] = useState({ types: [], statuses: [], dateFrom: '', dateTo: '', custom: {} })
  const [activeCustom, setActiveCustom] = useState([])

  const stages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s, color: '#6366f1' } : s)
  const stageColor = name => stages.find(s => s.name === name)?.color || '#6366f1'

  // Custom fields from both leads and patients modules
  const customModuleFields = useMemo(() => {
    const mods = org?.settings?.modules || []
    return mods
      .filter(m => (m.page === 'leads' || m.page === 'patients') && m.active)
      .flatMap(m => (m.fields || []).map(f => ({
        colId: `mod::${m.id}::${f.id}`,
        moduleId: m.id, fieldId: f.id,
        label: f.label, type: f.type, page: m.page === 'leads' ? 'Lead' : 'Patient',
        options: (f.options || '').split(',').map(s => s.trim()).filter(Boolean),
      })))
  }, [org])

  // All columns = base + custom module columns
  const allColumns = useMemo(() => {
    const modCols = customModuleFields.map(f => ({
      id: f.colId, label: `${f.label} (${f.page})`, defaultVisible: false,
      moduleId: f.moduleId, fieldId: f.fieldId,
    }))
    return [...BASE_COLUMNS, ...modCols]
  }, [customModuleFields])

  const [visible, setVisible] = useState(() => {
    const saved = getPref('pref_consult_cols')
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
  useEffect(() => { setPref('pref_consult_cols', visible) }, [visible])

  const setCustomFilter = (colId, value) => setFilters(f => ({ ...f, custom: { ...f.custom, [colId]: value } }))
  const toggleCustomField = colId => {
    setActiveCustom(prev => prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId])
    if (activeCustom.includes(colId)) setCustomFilter(colId, undefined)
  }

  // ── Load ──
  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setSelected(new Set())
    try {
      const [patients, leads, appts] = await Promise.all([
        getPatients({ orgId }), getLeads({ orgId }), getAppointments({ orgId }),
      ])
      const apptByPatient = {}, apptByLead = {}
      ;(appts || []).forEach(a => {
        if (a.patient_id) apptByPatient[a.patient_id] = (apptByPatient[a.patient_id] || 0) + 1
        if (a.lead_id)    apptByLead[a.lead_id]       = (apptByLead[a.lead_id] || 0) + 1
      })
      const apptLeadIds = new Set(Object.keys(apptByLead))

      const patientRows = (patients || []).map(p => ({
        id: p.id, type: 'Patient',
        name: `${p.first_name} ${p.last_name || ''}`.trim() || 'Unnamed',
        phone: p.phone || null, email: p.email || null,
        detail: p.status || 'Active',
        appointments: apptByPatient[p.id] || 0,
        created_at: p.created_at,
        href: `/consultation/${p.id}`,
        custom_data: p.custom_data || {},
        _stage: null,
      }))
      const leadRows = (leads || [])
        .filter(l => apptLeadIds.has(l.id) && !l.patient_id)
        .map(l => ({
          id: l.id, type: 'Lead',
          name: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title || 'Unnamed',
          phone: l.phone || l.contacts?.phone || null,
          email: l.email || l.contacts?.email || null,
          detail: l.stage || 'New',
          appointments: apptByLead[l.id] || 0,
          created_at: l.created_at,
          href: `/consultation/${l.id}`,
          custom_data: l.custom_data || {},
          _stage: l.stage || null,
        }))

      setRows([...patientRows, ...leadRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  // ── Filtering ──
  const filtered = useMemo(() => rows.filter(r => {
    if (filters.types.length && !filters.types.includes(r.type)) return false
    if (filters.statuses.length) {
      if (r.type === 'Patient' && !filters.statuses.includes(r.detail)) return false
      if (r.type === 'Lead'    && !filters.statuses.includes(r._stage)) return false
    }
    if (filters.dateFrom && new Date(r.created_at) < startOfDay(new Date(filters.dateFrom))) return false
    if (filters.dateTo   && new Date(r.created_at) > endOfDay(new Date(filters.dateTo)))     return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.name.toLowerCase().includes(q) &&
          !(r.phone || '').toLowerCase().includes(q) &&
          !(r.email || '').toLowerCase().includes(q)) return false
    }
    for (const [colId, val] of Object.entries(filters.custom)) {
      if (!val || (Array.isArray(val) && !val.length)) continue
      const fld = customModuleFields.find(f => f.colId === colId)
      if (!fld) continue
      const cell = r.custom_data?.[fld.moduleId]?.[fld.fieldId] ?? ''
      if (Array.isArray(val)) { if (!val.includes(cell)) return false }
      else if (!String(cell).toLowerCase().includes(String(val).toLowerCase())) return false
    }
    return true
  }), [rows, filters, search, customModuleFields])

  const filterCount = filters.types.length + filters.statuses.length +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    Object.values(filters.custom).filter(v => Array.isArray(v) ? v.length : v).length
  const hasFilters = filterCount > 0
  const clearFilters = () => { setFilters({ types: [], statuses: [], dateFrom: '', dateTo: '', custom: {} }); setActiveCustom([]) }

  // ── Selection ──
  const rowKey = r => `${r.type}:${r.id}`
  const toggleOne = key => setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(rowKey)))
  const clearSelection = () => setSelected(new Set())

  // ── Bulk delete ──
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} record${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map(key => {
        const [type, id] = key.split(':')
        return type === 'Patient' ? deletePatient(id) : deleteLead(id)
      }))
      setRows(prev => prev.filter(r => !selected.has(rowKey(r))))
      clearSelection()
    } catch (err) { alert(err.message) }
    finally { setDeleting(false) }
  }

  // ── Export ──
  const visibleCols = allColumns.filter(c => visible[c.id])

  const handleExport = () => {
    const data = filtered.filter(r => selected.has(rowKey(r)))
    if (!data.length) return
    const header = visibleCols.map(c => c.label)
    const lines = [header, ...data.map(r => visibleCols.map(col => {
      if (col.moduleId) return r.custom_data?.[col.moduleId]?.[col.fieldId] || ''
      switch (col.id) {
        case 'name':         return r.name
        case 'type':         return r.type
        case 'phone':        return r.phone || ''
        case 'email':        return r.email || ''
        case 'detail':       return r.detail || ''
        case 'appointments': return r.appointments
        case 'created':      return format(new Date(r.created_at), 'yyyy-MM-dd')
        default:             return ''
      }
    }))]
    const csv = lines.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `consultations-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    logAudit({ action: AUDIT.DATA_EXPORT, entityType: 'consultation', description: `Exported ${data.length} consultation record(s) to CSV`, metadata: { count: data.length, format: 'csv', columns: visibleCols.map(c => c.label) } })
    clearSelection()
  }

  // ── Cell renderer ──
  const renderCell = (col, r) => {
    if (col.moduleId) {
      const val = r.custom_data?.[col.moduleId]?.[col.fieldId]
      return <span className="text-xs" style={{ color: val ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{val || '—'}</span>
    }
    const isPatient = r.type === 'Patient'
    switch (col.id) {
      case 'name': return (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={r.name} size="sm" />
          <span className="font-600 text-[13px] truncate" style={{ color: 'var(--color-text-primary)' }}>{r.name}</span>
        </div>
      )
      case 'type': return (
        <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full"
          style={isPatient ? { background: '#dcfce7', color: '#15803d' } : { background: '#dbeafe', color: '#1d4ed8' }}>
          {isPatient ? <UserRound size={10} /> : <TrendingUp size={10} />}{r.type}
        </span>
      )
      case 'phone': return <span className="text-xs" style={{ color: r.phone ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{r.phone || '—'}</span>
      case 'email': return <span className="text-xs truncate max-w-45 block" style={{ color: r.email ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{r.email || '—'}</span>
      case 'detail': return isPatient
        ? <span className="text-[10px] font-600 px-2 py-0.5 rounded-full"
            style={r.detail === 'Active' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#b91c1c' }}>
            {r.detail}
          </span>
        : <span className="text-[10px] font-600 px-2 py-0.5 rounded-full"
            style={{ background: stageColor(r.detail) + '20', color: stageColor(r.detail) }}>
            {r.detail}
          </span>
      case 'appointments': return (
        <span className="text-xs font-600" style={{ color: r.appointments ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
          {r.appointments || '—'}
        </span>
      )
      case 'created': return <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{format(new Date(r.created_at), 'MMM d, yyyy')}</span>
      default: return null
    }
  }

  const patientCount = rows.filter(r => r.type === 'Patient').length
  const leadCount    = rows.filter(r => r.type === 'Lead').length

  // Stage options for the status filter (includes both lead stages and patient statuses)
  const stageOpts = useMemo(() => [
    ...STATUS_OPTIONS,
    ...stages.map(s => s.name),
  ].filter((v, i, a) => a.indexOf(v) === i), [stages])

  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Consultations</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? '—' : `${filtered.length} in consultation · ${patientCount} patients · ${leadCount} leads${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} disabled={loading} title="Refresh"
            className="p-2 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-surface-2) disabled:opacity-50"
            style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/consultation/new">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-brand)' }}>
              <Plus size={16} /> Add Consultation
            </button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-(--color-border) outline-none transition-all"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            placeholder="Search by name, phone, email…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>

        <button onClick={() => setFiltersOpen(o => !o)}
          className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-500 transition-all',
            filtersOpen || hasFilters ? 'border-(--color-brand) text-white' : 'border-(--color-border) hover:bg-(--color-brand-50)')}
          style={filtersOpen || hasFilters ? { background: 'var(--color-brand)' } : { color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
          <SlidersHorizontal size={15} /> Filters
          {hasFilters && <span className="bg-white/30 text-[10px] font-700 px-1.5 py-0.5 rounded-full">{filterCount}</span>}
        </button>

        <ColumnToggle allColumns={allColumns} visible={visible} setVisible={setVisible} />
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <Card className="p-3 border-(--color-border) space-y-2.5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
            <MultiSelect label="Type"          options={TYPE_OPTIONS} selected={filters.types}    onChange={v => setFilters(f => ({ ...f, types: v }))} />
            <MultiSelect label="Stage / Status" options={stageOpts}   selected={filters.statuses} onChange={v => setFilters(f => ({ ...f, statuses: v }))} />

            {/* Date range */}
            <div className="col-span-2">
              <DateRangeSelect from={filters.dateFrom} to={filters.dateTo}
                onChange={(dateFrom, dateTo) => setFilters(f => ({ ...f, dateFrom, dateTo }))} />
            </div>

            {customModuleFields.length > 0 && (
              <CustomFieldPicker fields={customModuleFields} active={activeCustom} onToggle={toggleCustomField} />
            )}
          </div>

          {/* Active custom field inputs */}
          {activeCustom.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 items-start">
              {activeCustom.map(colId => {
                const fld = customModuleFields.find(f => f.colId === colId)
                if (!fld) return null
                if (fld.type === 'select' || fld.type === 'boolean') {
                  return <MultiSelect key={colId} label={fld.label}
                    options={fld.type === 'boolean' ? ['Yes', 'No'] : fld.options}
                    selected={filters.custom[colId] || []} onChange={v => setCustomFilter(colId, v)} />
                }
                return (
                  <div key={colId} className="relative">
                    <input value={filters.custom[colId] || ''} onChange={e => setCustomFilter(colId, e.target.value)}
                      placeholder={fld.label}
                      className="w-full px-2.5 py-1.5 pr-6 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                    <button type="button" onClick={() => toggleCustomField(colId)} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                      <X size={12} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

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
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }}>
          <span className="text-sm font-600" style={{ color: 'var(--color-brand)' }}>
            {selected.size} record{selected.size !== 1 ? 's' : ''} selected
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
          <button onClick={handleBulkDelete} disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
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
                      onChange={toggleAll} className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: 'var(--color-brand)' }} />
                  </th>
                  {visibleCols.map(col => (
                    <th key={col.id} className="text-left px-4 py-3 text-[11px] font-600 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 1} className="px-4 py-20 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {search || hasFilters ? 'No records match your filters.' : 'No patients or appointment-booked leads yet.'}
                    </td>
                  </tr>
                ) : filtered.map(r => {
                  const key = rowKey(r)
                  return (
                    <tr key={key} className={clsx('transition-colors', selected.has(key) ? 'bg-(--color-brand-50)/60' : 'hover:bg-(--color-brand-50)/30')}>
                      <td className="w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(key)} onChange={() => toggleOne(key)} className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: 'var(--color-brand)' }} />
                      </td>
                      {visibleCols.map(col => (
                        <td key={col.id} className="px-4 py-3 whitespace-nowrap cursor-pointer" onClick={() => router.push(r.href)}>
                          {renderCell(col, r)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-(--color-border) text-xs" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              Showing {filtered.length} of {rows.length}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
