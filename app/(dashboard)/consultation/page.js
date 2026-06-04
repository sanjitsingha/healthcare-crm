'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Stethoscope, Search, SlidersHorizontal, Eye, EyeOff, X, Download, UserRound, TrendingUp } from 'lucide-react'
import { Card, Spinner, Avatar } from '@/components/ui'
import { getPatients, getLeads, getAppointments } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import clsx from 'clsx'

const TYPE_FILTERS = ['All', 'Patients', 'Leads']

const BASE_COLUMNS = [
  { id: 'name',         label: 'Name',          defaultVisible: true  },
  { id: 'type',         label: 'Type',          defaultVisible: true  },
  { id: 'phone',        label: 'Phone',         defaultVisible: true  },
  { id: 'email',        label: 'Email',         defaultVisible: false },
  { id: 'detail',       label: 'Stage / Status',defaultVisible: true  },
  { id: 'appointments', label: 'Appointments',  defaultVisible: true  },
  { id: 'created',      label: 'Created',        defaultVisible: true  },
]

// ── Column visibility dropdown ─────────────────────────────────
function ColumnToggle({ columns, visible, setVisible }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const activeCount = Object.values(visible).filter(Boolean).length
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-(--color-border) text-sm font-500 transition-colors hover:bg-(--color-brand-50)"
        style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        {open ? <EyeOff size={15} /> : <Eye size={15} />} Columns
        <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{activeCount}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-(--color-border) shadow-lg z-20 p-2" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[10px] font-600 uppercase tracking-wider px-2 py-1.5" style={{ color: 'var(--color-text-muted)' }}>Show / Hide Columns</p>
          {columns.map(col => (
            <button key={col.id} onClick={() => setVisible(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors hover:bg-(--color-brand-50)"
              style={{ color: 'var(--color-text-primary)' }}>
              {col.label}
              <div className="w-4 h-4 rounded border flex items-center justify-center"
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

export default function ConsultationPage() {
  const { orgId, org } = useOrg()
  const router = useRouter()

  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [typeFilter, setTypeFilter]   = useState('All')
  const [selected, setSelected] = useState(new Set())

  const stages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s, color: '#6366f1' } : s)
  const stageColor = (name) => stages.find(s => s.name === name)?.color || '#6366f1'

  const [visible, setVisible] = useState(() => Object.fromEntries(BASE_COLUMNS.map(c => [c.id, c.defaultVisible])))

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setSelected(new Set())
    try {
      const [patients, leads, appts] = await Promise.all([
        getPatients({ orgId }), getLeads({ orgId }), getAppointments({ orgId }),
      ])
      // appointment counts per entity
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
        created_at: p.created_at, href: `/consultation/${p.id}`,
      }))

      // Leads that have at least one appointment and aren't already patients
      const leadRows = (leads || [])
        .filter(l => apptLeadIds.has(l.id) && !l.patient_id)
        .map(l => ({
          id: l.id, type: 'Lead',
          name: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title || 'Unnamed',
          phone: l.phone || l.contacts?.phone || null, email: l.email || l.contacts?.email || null,
          detail: l.stage || 'New',
          appointments: apptByLead[l.id] || 0,
          created_at: l.created_at, href: `/consultation/${l.id}`,
        }))

      setRows([...patientRows, ...leadRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => rows.filter(r => {
    if (typeFilter === 'Patients' && r.type !== 'Patient') return false
    if (typeFilter === 'Leads'    && r.type !== 'Lead')    return false
    if (search) {
      const q = search.toLowerCase()
      return r.name.toLowerCase().includes(q) || (r.phone || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)
    }
    return true
  }), [rows, typeFilter, search])

  const visibleCols = BASE_COLUMNS.filter(c => visible[c.id])

  const toggleOne = (key) => setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const rowKey = (r) => `${r.type}:${r.id}`
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(rowKey)))

  const handleExport = () => {
    const data = filtered.filter(r => selected.has(rowKey(r)))
    if (!data.length) return
    const header = visibleCols.map(c => c.label)
    const lines = [header, ...data.map(r => visibleCols.map(c => {
      switch (c.id) {
        case 'name': return r.name
        case 'type': return r.type
        case 'phone': return r.phone || ''
        case 'email': return r.email || ''
        case 'detail': return r.detail || ''
        case 'appointments': return r.appointments
        case 'created': return format(new Date(r.created_at), 'yyyy-MM-dd')
        default: return ''
      }
    }))]
    const csv = lines.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `consultations-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    setSelected(new Set())
  }

  const renderCell = (col, r) => {
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
        ? <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={r.detail === 'Active' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#b91c1c' }}>{r.detail}</span>
        : <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: stageColor(r.detail) + '20', color: stageColor(r.detail) }}>{r.detail}</span>
      case 'appointments': return <span className="text-xs font-600" style={{ color: r.appointments ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{r.appointments || '—'}</span>
      case 'created': return <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{format(new Date(r.created_at), 'MMM d, yyyy')}</span>
      default: return null
    }
  }

  const patientCount = rows.filter(r => r.type === 'Patient').length
  const leadCount    = rows.filter(r => r.type === 'Lead').length

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Stethoscope size={22} style={{ color: 'var(--color-brand)' }} /> Consultations
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? '—' : `${filtered.length} in consultation · ${patientCount} patients · ${leadCount} leads`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
            style={{ background: 'var(--color-surface)' }}
            placeholder="Search by name, phone, email..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={13} style={{ color: 'var(--color-text-muted)' }} /></button>}
        </div>

        <button onClick={() => setFiltersOpen(o => !o)}
          className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-500 transition-all',
            filtersOpen || typeFilter !== 'All' ? 'border-(--color-brand) text-white' : 'border-(--color-border) hover:bg-(--color-brand-50)')}
          style={filtersOpen || typeFilter !== 'All' ? { background: 'var(--color-brand)' } : { color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
          <SlidersHorizontal size={15} /> Filters
          {typeFilter !== 'All' && <span className="bg-white/30 text-[10px] font-700 px-1.5 py-0.5 rounded-full">1</span>}
        </button>

        <ColumnToggle columns={BASE_COLUMNS} visible={visible} setVisible={setVisible} />
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <Card className="p-4 border-(--color-border) space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map(t => (
                <button key={t} type="button" onClick={() => setTypeFilter(t)}
                  className="px-2.5 py-1 rounded-full text-xs font-500 border transition-all"
                  style={typeFilter === t ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' } : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }}>
          <span className="text-sm font-600" style={{ color: 'var(--color-brand)' }}>{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs font-500 px-2 py-1 rounded-lg hover:bg-white/50" style={{ color: 'var(--color-brand)' }}>Deselect all</button>
          <div className="flex-1" />
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-(--color-border) bg-white hover:bg-gray-50" style={{ color: 'var(--color-text-secondary)' }}>
            <Download size={14} /> Export
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
                      {search || typeFilter !== 'All' ? 'No one matches your filters.' : 'No patients or appointment-booked leads yet.'}
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
