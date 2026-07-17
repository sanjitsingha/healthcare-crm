'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Plus, Search, SlidersHorizontal, Eye, EyeOff, X,
  Trash2, Download, RefreshCw, ChevronDown, Check, UserRound, TrendingUp, Calendar,
  User, Users, Phone, Mail, CircleDot, CalendarDays, Hash,
} from 'lucide-react'
import { Spinner, Avatar } from '@/components/ui'
import { getPatients, getLeads, getAppointments, deletePatient, deleteLead } from '@/lib/supabase/queries'
import { getPref, setPref } from '@/lib/prefs'
import { useOrg } from '@/lib/context/OrgContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, startOfDay, endOfDay } from 'date-fns'
import { logAudit, AUDIT } from '@/lib/audit'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import clsx from 'clsx'

const TYPE_OPTIONS = ['Patient', 'Lead']
const STATUS_OPTIONS = ['Active', 'Inactive', 'Discharged']

const BASE_COLUMNS = [
  { id: 'name',         label: 'Name',           defaultVisible: true,  icon: User },
  { id: 'type',         label: 'Type',           defaultVisible: true,  icon: Users },
  { id: 'phone',        label: 'Phone',          defaultVisible: true,  icon: Phone },
  { id: 'email',        label: 'Email',          defaultVisible: false, icon: Mail },
  { id: 'detail',       label: 'Stage / Status', defaultVisible: true,  icon: CircleDot },
  { id: 'appointments', label: 'Appointments',   defaultVisible: true,  icon: CalendarDays },
  { id: 'created',      label: 'Created',        defaultVisible: true,  icon: Calendar },
]

// Default pixel widths per column — resizable, persisted per device (same as Leads table)
const DEFAULT_COL_WIDTHS = {
  name: 200, type: 110, phone: 140, email: 210,
  detail: 140, appointments: 140, created: 120,
}

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

  const stages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s, color: '#393E9A' } : s)
  const stageColor = name => stages.find(s => s.name === name)?.color || '#393E9A'

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
      moduleId: f.moduleId, fieldId: f.fieldId, icon: Hash,
    }))
    return [...BASE_COLUMNS, ...modCols]
  }, [customModuleFields])

  // Column visibility. Start from SSR-safe defaults so the server and first client
  // render agree; saved prefs are merged in after mount to avoid a hydration mismatch.
  const [visible, setVisible] = useState(() =>
    Object.fromEntries(BASE_COLUMNS.map(c => [c.id, c.defaultVisible]))
  )
  const [colPrefsLoaded, setColPrefsLoaded] = useState(false)
  useEffect(() => {
    const saved = getPref('pref_consult_cols')
    if (saved) setVisible(prev => ({ ...prev, ...saved }))
    setColPrefsLoaded(true)
  }, [])
  useEffect(() => {
    setVisible(prev => {
      const next = { ...prev }; let changed = false
      allColumns.forEach(col => { if (!(col.id in next)) { next[col.id] = col.defaultVisible; changed = true } })
      return changed ? next : prev
    })
  }, [allColumns])
  // Persist only after saved prefs have loaded, so we don't overwrite them with defaults on mount.
  useEffect(() => { if (colPrefsLoaded) setPref('pref_consult_cols', visible) }, [visible, colPrefsLoaded])

  // Column widths — resizable, loaded post-mount to avoid hydration mismatch (same as Leads)
  const [colWidths, setColWidths] = useState({})
  const colWidthsRef = useRef(colWidths)
  useEffect(() => { colWidthsRef.current = colWidths }, [colWidths])
  useEffect(() => { const saved = getPref('pref_consult_col_widths'); if (saved) setColWidths(saved) }, [])

  const startResize = useCallback((colId, e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX     = e.clientX
    const startWidth = colWidthsRef.current[colId] ?? DEFAULT_COL_WIDTHS[colId] ?? 130
    const onMove = (ev) => {
      const w = Math.max(60, startWidth + ev.clientX - startX)
      setColWidths(prev => ({ ...prev, [colId]: w }))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setColWidths(prev => { setPref('pref_consult_col_widths', prev); return prev })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const getW = (id) => colWidths[id] ?? DEFAULT_COL_WIDTHS[id] ?? 130

  // Pagination (same as Leads)
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filter modal: close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!filtersOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setFiltersOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [filtersOpen])

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pagedRows  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ── Selection ──
  const rowKey = r => `${r.type}:${r.id}`
  const toggleOne = key => setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(rowKey)))
  const clearSelection = () => setSelected(new Set())

  // ── Bulk delete ──
  const handleBulkDelete = async () => {
    const ok = await showConfirm({
      title: `Delete ${selected.size} record${selected.size !== 1 ? 's' : ''}?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map(key => {
        const [type, id] = key.split(':')
        return type === 'Patient' ? deletePatient(id) : deleteLead(id)
      }))
      setRows(prev => prev.filter(r => !selected.has(rowKey(r))))
      clearSelection()
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
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
            className="btn btn-secondary btn-icon disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/consultation/new">
            <button className="btn btn-primary btn-md">
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

        <button onClick={() => setFiltersOpen(true)}
          className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-500 transition-all',
            filtersOpen || hasFilters ? 'border-(--color-brand) text-white' : 'border-(--color-border) hover:bg-(--color-brand-50)')}
          style={filtersOpen || hasFilters ? { background: 'var(--color-brand)' } : { color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
          <SlidersHorizontal size={15} /> Filters
          {hasFilters && <span className="bg-white/30 text-[10px] font-700 px-1.5 py-0.5 rounded-full">{filterCount}</span>}
        </button>

        <ColumnToggle allColumns={allColumns} visible={visible} setVisible={setVisible} />
      </div>

      {/* Filter modal */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setFiltersOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-(--color-border)">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border)">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} style={{ color: 'var(--color-brand)' }} />
                <h2 className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Filter Consultations</h2>
                {hasFilters && (
                  <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                    {filterCount}
                  </span>
                )}
              </div>
              <button onClick={() => setFiltersOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Close">
                <X size={16} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <MultiSelect label="Type"           options={TYPE_OPTIONS} selected={filters.types}    onChange={v => setFilters(f => ({ ...f, types: v }))} />
                <MultiSelect label="Stage / Status" options={stageOpts}    selected={filters.statuses} onChange={v => setFilters(f => ({ ...f, statuses: v }))} />

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
                <div className="grid grid-cols-2 gap-2 items-start">
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
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-(--color-border)">
              {hasFilters ? (
                <button onClick={clearFilters} className="btn btn-danger btn-sm">
                  <X size={12} /> Clear all
                </button>
              ) : <span />}
              <button onClick={() => setFiltersOpen(false)} className="btn btn-primary btn-sm">
                Done
              </button>
            </div>
          </div>
        </div>
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
          <button onClick={handleExport} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export
          </button>
          <button onClick={handleBulkDelete} disabled={deleting} className="btn btn-danger btn-sm disabled:opacity-50">
            <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}

      {/* Table — same design as the Leads table */}
      {loading ? (
        <div className="flex items-center justify-center py-24"><Spinner size={32} /></div>
      ) : (
        <div style={{ border: '1px solid #dde1e7', borderRadius: 4, background: '#fff', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ fontSize: 15, tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
              <colgroup>
                <col style={{ width: 40 }} />
                {visibleCols.map(col => <col key={col.id} style={{ width: getW(col.id) }} />)}
              </colgroup>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #dde1e7' }}>
                  {/* Select-all */}
                  <th className="sticky left-0 z-20 text-left" style={{ width: 40, padding: '0 0 0 14px', background: '#f3f4f6', borderRight: '1px solid #dde1e7' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length }}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 cursor-pointer"
                      style={{ accentColor: 'var(--color-brand)' }}
                    />
                  </th>
                  {visibleCols.map(col => {
                    const ColIcon = col.icon || Hash
                    return (
                      <th key={col.id} className="text-left" style={{ width: getW(col.id), padding: '9px 14px', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6b7280', borderRight: '1px solid #dde1e7', position: 'relative', userSelect: 'none', overflow: 'hidden' }}>
                        <span className="inline-flex items-center gap-1.5">
                          <ColIcon size={15} style={{ color: '#9ca3af', flexShrink: 0 }} />
                          {col.label}
                        </span>
                        <div onMouseDown={e => startResize(col.id, e)} style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 5, cursor: 'col-resize', zIndex: 1 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 1} className="text-center" style={{ padding: '56px 16px', fontSize: 15, color: '#9ca3af' }}>
                      {search || hasFilters ? 'No records match your filters.' : 'No patients or appointment-booked leads yet.'}
                    </td>
                  </tr>
                ) : pagedRows.map((r, idx) => {
                  const key   = rowKey(r)
                  const sel   = selected.has(key)
                  const rowBg = sel ? '#eef3ff' : '#fff'
                  return (
                    <tr
                      key={key}
                      className="group"
                      style={{ background: rowBg, borderBottom: idx === pagedRows.length - 1 ? 'none' : '1px solid #f0f0f0' }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f5f8ff' }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '#fff' }}
                    >
                      {/* Checkbox */}
                      <td className="sticky left-0 z-10" style={{ width: 40, padding: '0 0 0 14px', background: rowBg, borderRight: '1px solid #f0f0f0' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={sel} onChange={() => toggleOne(key)} className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: 'var(--color-brand)' }} />
                      </td>
                      {/* Data cells */}
                      {visibleCols.map((col, ci) => (
                        <td key={col.id}
                          className="cursor-pointer"
                          style={{ padding: '8px 14px', borderRight: ci === visibleCols.length - 1 ? 'none' : '1px solid #f0f0f0', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => router.push(r.href)}>
                          {renderCell(col, r)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #dde1e7', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            {/* Left: count + page-size selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#6b7280' }}>
              <span>
                {filtered.length === 0 ? '0 records' : <>
                  <strong style={{ color: '#374151' }}>{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}</strong>
                  {' of '}
                  <strong style={{ color: '#374151' }}>{filtered.length}</strong>
                  {hasFilters ? ' (filtered)' : ''}
                </>}
              </span>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #dde1e7', borderRadius: 4, background: '#fff', color: '#374151', cursor: 'pointer' }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Right: pagination controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #dde1e7', borderRadius: 4, background: safePage === 1 ? '#f9fafb' : '#fff', color: safePage === 1 ? '#d1d5db' : '#374151', cursor: safePage === 1 ? 'default' : 'pointer' }}
              >‹ Prev</button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1] > 1) acc.push('…')
                  acc.push(n)
                  return acc
                }, [])
                .map((n, i) => n === '…'
                  ? <span key={`ellipsis-${i}`} style={{ padding: '3px 6px', fontSize: 12, color: '#9ca3af' }}>…</span>
                  : <button key={n} onClick={() => setPage(n)}
                      style={{ minWidth: 28, padding: '3px 6px', fontSize: 12, border: '1px solid', borderRadius: 4, cursor: 'pointer', fontWeight: n === safePage ? 600 : 400, borderColor: n === safePage ? 'var(--color-brand)' : '#dde1e7', background: n === safePage ? 'var(--color-brand)' : '#fff', color: n === safePage ? '#fff' : '#374151' }}
                    >{n}</button>
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #dde1e7', borderRadius: 4, background: safePage === totalPages ? '#f9fafb' : '#fff', color: safePage === totalPages ? '#d1d5db' : '#374151', cursor: safePage === totalPages ? 'default' : 'pointer' }}
              >Next ›</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
