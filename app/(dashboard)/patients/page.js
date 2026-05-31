'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, Eye, EyeOff, X, Trash2, Download, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card, Spinner } from '@/components/ui'
import { getPatients, deletePatient, updatePatient } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, differenceInYears } from 'date-fns'
import clsx from 'clsx'

// ── Constants ──────────────────────────────────────────────────
const GENDERS  = ['Male', 'Female', 'Other']
const STATUSES = ['Active', 'Inactive']

const STATUS_STYLE = {
  Active:   { bg: '#dcfce7', color: '#15803d' },
  Inactive: { bg: '#fee2e2', color: '#b91c1c' },
}
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
  const { orgId, org } = useOrg()
  const router = useRouter()

  const [patients, setPatients] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters]   = useState({ genders: [], statuses: [] })
  const [selected, setSelected] = useState(new Set())

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

  const [visible, setVisible] = useState(() =>
    Object.fromEntries(BASE_COLUMNS.map(c => [c.id, c.defaultVisible]))
  )
  useEffect(() => {
    setVisible(prev => {
      const next = { ...prev }; let changed = false
      allColumns.forEach(col => { if (!(col.id in next)) { next[col.id] = col.defaultVisible; changed = true } })
      return changed ? next : prev
    })
  }, [allColumns])

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
    return true
  })

  const hasFilters  = filters.genders.length || filters.statuses.length
  const clearFilters = () => setFilters({ genders: [], statuses: [] })

  // ── Selection ──
  const toggleOne  = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll  = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)))
  const clearSel   = () => setSelected(new Set())

  // ── Bulk actions ──
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} patient${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map(id => deletePatient(id)))
      setPatients(prev => prev.filter(p => !selected.has(p.id)))
      clearSel()
    } catch (err) { alert(err.message) }
  }

  const handleBulkStatus = async (status) => {
    try {
      await Promise.all([...selected].map(id => updatePatient(id, { status })))
      setPatients(prev => prev.map(p => selected.has(p.id) ? { ...p, status } : p))
      clearSel()
    } catch (err) { alert(err.message) }
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
        <Link href="/patients/new">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 text-white transition-opacity hover:opacity-90" style={{ background: 'var(--color-brand)' }}>
            <Plus size={16} /> New Patient
          </button>
        </Link>
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
          {hasFilters ? <span className="bg-white/30 text-[10px] font-700 px-1.5 py-0.5 rounded-full">{filters.genders.length + filters.statuses.length}</span> : null}
        </button>
        <ColumnToggle allColumns={allColumns} visible={visible} setVisible={setVisible} />
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <Card className="p-4 border-(--color-border) space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <MultiPill label="Gender" options={GENDERS}  selected={filters.genders}  onChange={v => setFilters(f => ({ ...f, genders: v }))} />
            <MultiPill label="Status" options={STATUSES} selected={filters.statuses} onChange={v => setFilters(f => ({ ...f, statuses: v }))} />
          </div>
          {hasFilters && (
            <div className="flex justify-end pt-2 border-t border-(--color-border)">
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                <X size={12} /> Clear All Filters
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
          <button onClick={() => handleBulkStatus('Active')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-green-200 bg-white text-green-700 hover:bg-green-50 transition-colors">
            <ToggleRight size={14} /> Mark Active
          </button>
          <button onClick={() => handleBulkStatus('Inactive')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-(--color-border) bg-white hover:bg-gray-50 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <ToggleLeft size={14} /> Mark Inactive
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-(--color-border) bg-white hover:bg-gray-50 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <Download size={14} /> Export
          </button>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={14} /> Delete
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
                      onChange={toggleAll}
                      className="w-4 h-4 cursor-pointer rounded"
                      style={{ accentColor: 'var(--color-brand)' }}
                    />
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
                      {hasFilters || search ? 'No patients match your filters.' : 'No patients yet. Add your first patient.'}
                    </td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className={clsx('transition-colors', selected.has(p.id) ? 'bg-(--color-brand-50)/60' : 'hover:bg-(--color-brand-50)/30')}>
                    <td className="w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                        className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: 'var(--color-brand)' }} />
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
