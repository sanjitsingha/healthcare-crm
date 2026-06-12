'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Search, Users, Phone, Mail, UserRound, TrendingUp,
  Columns3, Download, Upload, Check, X, ArrowRight, Trash2,
  ChevronDown, Calendar, Plus, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { Spinner, Avatar, Button, Modal, Card } from '@/components/ui'
import { getLeads, getPatients, createLead, deleteLead, deletePatient, updateOrganization } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { format } from 'date-fns'
import { logAudit, AUDIT } from '@/lib/audit'
import clsx from 'clsx'

// ── Base column definitions ─────────────────────────────────────
const BASE_COLUMNS = [
  { key: 'name',    label: 'Name',          locked: true },
  { key: 'type',    label: 'Type' },
  { key: 'phone',   label: 'Phone' },
  { key: 'email',   label: 'Email' },
  { key: 'status',  label: 'Stage / Status' },
  { key: 'source',  label: 'Source' },
  { key: 'gender',  label: 'Gender' },
  { key: 'created', label: 'Created' },
]
const BASE_DEFAULT_VISIBLE = { name: true, type: true, phone: true, email: true, status: true, source: false, gender: false, created: true }

// ── Cell value helpers ──────────────────────────────────────────
function cellText(r, col) {
  if (col.custom) {
    const applies = (col.page === 'leads' && r.type === 'Lead') || (col.page === 'patients' && r.type === 'Patient')
    return applies ? (r.custom_data?.[col.moduleId]?.[col.fieldId] ?? '') : ''
  }
  switch (col.key) {
    case 'name':    return r.name
    case 'type':    return r.type
    case 'phone':   return r.phone || ''
    case 'email':   return r.email || ''
    case 'status':  return r.detail || ''
    case 'source':  return r.source || ''
    case 'gender':  return r.gender || ''
    case 'created': return r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : ''
    default:        return ''
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

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map(line => {
    const cells = line.split(',')
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim().replace(/^"|"$/g, '') })
    return obj
  })
}

// ── MultiSelect dropdown ────────────────────────────────────────
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-500 transition-colors whitespace-nowrap"
        style={count
          ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        {Icon && <Icon size={13} />}
        <span>{label}</span>
        {count > 0 && <span className="text-[10px] font-700 px-1.5 rounded-full" style={{ background: 'var(--color-brand)', color: 'white' }}>{count}</span>}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
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
                {o.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />}
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

// ── DateRangeSelect ─────────────────────────────────────────────
function DateRangeSelect({ from, to, onChange, label = 'Date range' }) {
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-500 transition-colors whitespace-nowrap"
        style={active
          ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        <Calendar size={13} />
        <span className="max-w-36 truncate">{summary}</span>
        {active && (
          <span onClick={(e) => { e.stopPropagation(); onChange('', '') }} className="shrink-0 rounded hover:bg-(--color-surface-2) p-0.5" title="Clear">
            <X size={12} />
          </span>
        )}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 w-64 rounded-xl border border-(--color-border) p-2.5"
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

// ── Import Modal ────────────────────────────────────────────────
function ImportModal({ open, onClose, orgId, onImported }) {
  const [rows, setRows]     = useState([])
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseCSV(String(reader.result))
        if (!parsed.length) { setError('No rows found in file.'); return }
        setRows(parsed); setError('')
      } catch { setError('Could not parse CSV file.') }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!rows.length || !orgId) return
    setSaving(true)
    try {
      let count = 0
      for (const row of rows) {
        const first = row.first_name || row.name || row.full_name || ''
        const last  = row.last_name || ''
        const title = `${first} ${last}`.trim() || row.email || row.phone || 'Imported Lead'
        await createLead({
          organization_id: orgId, title,
          first_name: first || null, last_name: last || null,
          phone: row.phone || row.mobile || null, email: row.email || null,
          stage: 'New', source: row.source || 'Import',
        })
        count++
      }
      onImported(count); setRows([]); onClose()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import Contacts">
      <div className="space-y-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Upload a CSV with columns like <span className="font-600">first_name, last_name, phone, email, source</span>.
          Each row is created as a new <span className="font-600">Lead</span>.
        </p>
        <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-(--color-surface-2)" style={{ borderColor: 'var(--color-border)' }}>
          <Upload size={22} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>Click to choose a CSV file</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </label>
        {error && <p className="text-xs" style={{ color: '#b91c1c' }}>{error}</p>}
        {rows.length > 0 && (
          <div className="px-3 py-2 rounded-lg text-xs font-600" style={{ background: '#dcfce7', color: '#15803d' }}>
            {rows.length} row{rows.length !== 1 ? 's' : ''} ready to import.
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleImport} disabled={saving || !rows.length}>
            {saving ? 'Importing…' : `Import ${rows.length || ''}`.trim()}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Stat card ───────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="p-4 border-(--color-border)">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <p className="text-xl font-800 leading-none" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        </div>
      </div>
    </Card>
  )
}

// ── Page ────────────────────────────────────────────────────────
export default function ContactsPage() {
  const { orgId, org } = useOrg()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const [colsOpen, setColsOpen]     = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const colsRef = useRef()

  const [visible, setVisible] = useState(() => ({ ...(org?.settings?.contacts_columns || {}) }))
  const [filters, setFilters] = useState({ types: [], stages: [], sources: [], dateFrom: '', dateTo: '' })
  const [selected, setSelected] = useState(new Set())
  const [sort, setSort] = useState({ col: 'created', dir: 'desc' })

  useEffect(() => {
    const h = (e) => { if (colsRef.current && !colsRef.current.contains(e.target)) setColsOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const stages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s, color: '#6366f1' } : s)
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
        custom_data: p.custom_data || {},
        created_at: p.created_at, href: `/patients/${p.id}`,
      }))
      const leadRows = (leads || []).filter(l => !l.patient_id).map(l => ({
        id: l.id, type: 'Lead',
        name: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title || 'Unnamed',
        phone: l.phone || l.contacts?.phone || null, email: l.email || l.contacts?.email || null,
        detail: l.stage || 'New', source: l.source || null, gender: l.gender || null,
        custom_data: l.custom_data || {},
        created_at: l.created_at, href: `/leads/${l.id}`,
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
      if (filters.types.length   && !filters.types.includes(r.type))   return false
      if (filters.stages.length  && !(r.type === 'Lead' && filters.stages.includes(r.detail))) return false
      if (filters.sources.length && !filters.sources.includes(r.source || '')) return false
      if (filters.dateFrom) {
        const d = new Date(r.created_at); d.setHours(0,0,0,0)
        if (d < new Date(filters.dateFrom)) return false
      }
      if (filters.dateTo) {
        const d = new Date(r.created_at); d.setHours(23,59,59,999)
        if (d > new Date(filters.dateTo + 'T23:59:59')) return false
      }
      if (search) {
        const q = search.toLowerCase()
        return r.name.toLowerCase().includes(q) || (r.phone || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)
      }
      return true
    })

    // sort
    result = [...result].sort((a, b) => {
      let va, vb
      if (sort.col === 'name') {
        va = a.name.toLowerCase(); vb = b.name.toLowerCase()
      } else {
        va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime()
      }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1
      if (va > vb) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [rows, filters, search, sort])

  const activeFilterCount = filters.types.length + filters.stages.length + filters.sources.length + (filters.dateFrom || filters.dateTo ? 1 : 0)
  const clearFilters = () => setFilters({ types: [], stages: [], sources: [], dateFrom: '', dateTo: '' })

  const toggleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }
  const SortIcon = ({ col }) => {
    if (sort.col !== col) return <ArrowUpDown size={12} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
    return sort.dir === 'asc' ? <ArrowUp size={12} style={{ color: 'var(--color-brand)' }} /> : <ArrowDown size={12} style={{ color: 'var(--color-brand)' }} />
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
  const handleExport = (onlySelected) => {
    const data = onlySelected ? filtered.filter(r => selected.has(rowKey(r))) : filtered
    if (!data.length) return
    const csv = toCSV(data, visibleCols)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `contacts-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
    URL.revokeObjectURL(url)
    logAudit({ action: AUDIT.DATA_EXPORT, entityType: 'contact', description: `Exported ${data.length} contact record(s) to CSV${onlySelected ? ' (selected only)' : ''}`, metadata: { count: data.length, format: 'csv', scope: onlySelected ? 'selected' : 'all_filtered', columns: visibleCols.map(c => c.label) } })
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

  const patientCount = rows.filter(r => r.type === 'Patient').length
  const leadCount    = rows.filter(r => r.type === 'Lead').length

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
      case 'source':  return <span style={{ color: r.source ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{r.source || '—'}</span>
      case 'gender':  return <span style={{ color: r.gender ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{r.gender || '—'}</span>
      case 'created': return <span style={{ color: 'var(--color-text-muted)' }}>{r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : '—'}</span>
      default: return null
    }
  }

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Users size={20} style={{ color: 'var(--color-brand)' }} /> Contacts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            All leads and patients in one place
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}><Upload size={14} /> Import</Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport(false)}><Download size={14} /> Export</Button>
          <Link href="/leads/new"><Button size="sm"><Plus size={14} /> New Lead</Button></Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total contacts" value={rows.length} icon={Users} color="var(--color-brand)" />
        <StatCard label="Patients" value={patientCount} icon={UserRound} color="#15803d" />
        <StatCard label="Leads" value={leadCount} icon={TrendingUp} color="#1d4ed8" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Search */}
        <div className="relative min-w-48 max-w-72 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            placeholder="Search by name, phone, email…" value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter pills */}
        <MultiSelect
          label="Type"
          icon={Users}
          options={[{ value: 'Lead', label: 'Lead' }, { value: 'Patient', label: 'Patient' }]}
          selected={filters.types}
          onChange={v => setFilters(f => ({ ...f, types: v }))}
        />
        {stages.length > 0 && (
          <MultiSelect
            label="Stage"
            options={stages.map(s => ({ value: s.name, label: s.name, color: s.color }))}
            selected={filters.stages}
            onChange={v => setFilters(f => ({ ...f, stages: v }))}
          />
        )}
        {sources.length > 0 && (
          <MultiSelect
            label="Source"
            options={sources.map(s => ({ value: s, label: s }))}
            selected={filters.sources}
            onChange={v => setFilters(f => ({ ...f, sources: v }))}
          />
        )}
        <DateRangeSelect
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(dateFrom, dateTo) => setFilters(f => ({ ...f, dateFrom, dateTo }))}
        />
        {activeFilterCount > 0 && (
          <button type="button" onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-600 border border-dashed transition-colors hover:bg-(--color-surface-2)"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            <X size={12} /> Clear ({activeFilterCount})
          </button>
        )}

        <div className="flex-1" />

        {/* Column toggle */}
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
                    <span className="w-4 h-4 rounded flex items-center justify-center" style={{ background: isVisible(col) ? 'var(--color-brand)' : 'transparent', border: isVisible(col) ? 'none' : '1.5px solid var(--color-border)' }}>
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

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' + '40' }}>
          <span className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>{selected.size} selected</span>
          <div className="flex-1" />
          <button type="button" onClick={() => handleExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors hover:bg-(--color-surface)"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
            <Download size={13} /> Export Selected
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
          <Users size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {search || activeFilterCount ? 'No contacts match your filters.' : 'No leads or patients yet.'}
          </p>
          {!search && !activeFilterCount && (
            <Link href="/leads/new" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-xs font-600 transition-colors hover:opacity-90"
              style={{ background: 'var(--color-brand)', color: 'white' }}>
              <Plus size={13} /> Add your first lead
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
                  {visibleCols.map(c => (
                    <th key={c.key} className="text-left px-4 py-2.5 border-b border-(--color-border) whitespace-nowrap">
                      {c.key === 'name' || c.key === 'created' ? (
                        <button type="button" onClick={() => toggleSort(c.key === 'name' ? 'name' : 'created')}
                          className="flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-widest transition-colors hover:opacity-80"
                          style={{ color: 'var(--color-text-muted)' }}>
                          {c.label}
                          <SortIcon col={c.key === 'name' ? 'name' : 'created'} />
                        </button>
                      ) : (
                        <span className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{c.label}</span>
                      )}
                    </th>
                  ))}
                  <th className="w-10 border-b border-(--color-border)"></th>
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
              {filtered.length} of {rows.length} contact{rows.length !== 1 ? 's' : ''}
              {activeFilterCount > 0 ? ' (filtered)' : ''}
            </p>
          </div>
        </div>
      )}

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} orgId={orgId}
        onImported={(n) => { alert(`Imported ${n} lead${n !== 1 ? 's' : ''}.`); load() }} />
    </div>
  )
}
