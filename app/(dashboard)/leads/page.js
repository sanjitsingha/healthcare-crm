'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, Eye, EyeOff, X, Trash2, UserCheck, Download, RefreshCw, ChevronDown, Tag, Check, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Upload, AlertCircle, FileText } from 'lucide-react'
import { Badge, Card, Spinner } from '@/components/ui'
import { getLeads, deleteLead, updateLead, getTags, createLead } from '@/lib/supabase/queries'
import { getPref, setPref } from '@/lib/prefs'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, startOfDay, endOfDay } from 'date-fns'
import { logAudit, AUDIT } from '@/lib/audit'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
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
  const sal = lead.custom_data?.salutation || ''
  let name
  if (lead.first_name)      name = `${lead.first_name} ${lead.last_name || ''}`.trim()
  else if (lead.patients)   name = `${lead.patients.first_name} ${lead.patients.last_name || ''}`.trim()
  else                      name = lead.title || ''
  return sal ? `${sal} ${name}`.trim() : name
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
      className="text-[12px] font-600 px-2 py-0.5 rounded-full"
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
      <button onClick={() => setOpen(o => !o)} className="btn btn-secondary btn-md">
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

// ── CSV Import Modal ───────────────────────────────────────────
const LEAD_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name',  label: 'Last Name'  },
  { key: 'phone',      label: 'Phone'      },
  { key: 'email',      label: 'Email'      },
  { key: 'stage',      label: 'Stage'      },
  { key: 'priority',   label: 'Priority'   },
  { key: 'source',     label: 'Source'     },
  { key: 'gender',     label: 'Gender'     },
  { key: 'address',    label: 'Address'    },
  { key: '__skip',     label: '— Skip —'   },
]

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const parse = (line) => {
    const result = []; let cur = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ; continue }
      if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue }
      cur += c
    }
    result.push(cur.trim())
    return result
  }
  const headers = parse(lines[0])
  const rows = lines.slice(1).map(parse).filter(r => r.some(c => c))
  return { headers, rows }
}

function autoMap(headers) {
  const map = {}
  const norm = s => s.toLowerCase().replace(/[\s_-]+/g, '')
  headers.forEach((h, i) => {
    const n = norm(h)
    const match = LEAD_FIELDS.find(f => f.key !== '__skip' && norm(f.label) === n)
      || LEAD_FIELDS.find(f => f.key !== '__skip' && n.includes(norm(f.label)))
      || LEAD_FIELDS.find(f => f.key !== '__skip' && norm(f.key) === n)
    map[i] = match ? match.key : '__skip'
  })
  return map
}

function ImportModal({ orgId, customFields = [], onClose, onImported }) {
  const [step, setStep]         = useState('upload')   // upload | map | preview | importing | done
  const [headers, setHeaders]   = useState([])
  const [rows, setRows]         = useState([])
  const [mapping, setMapping]   = useState({})
  const [result, setResult]     = useState(null)
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers: h, rows: r } = parseCSV(ev.target.result)
      if (!h.length) { toast({ type: 'error', title: 'Invalid CSV', message: 'No headers found.' }); return }
      setHeaders(h)
      setRows(r)
      setMapping(autoMap(h))
      setStep('map')
    }
    reader.readAsText(file)
  }

  const buildLead = (row) => {
    const lead = { organization_id: orgId, stage: 'New', priority: 'Medium' }
    headers.forEach((_, i) => {
      const key = mapping[i]
      if (!key || key === '__skip') return
      const val = row[i]?.trim()
      if (val) lead[key] = val
    })
    if (!lead.title && (lead.first_name || lead.last_name)) {
      lead.title = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    }
    return lead
  }

  const handleImport = async () => {
    setStep('importing')
    let ok = 0; const errors = []
    for (const row of rows) {
      const lead = buildLead(row)
      try { await createLead(lead); ok++ }
      catch (err) { errors.push({ row, message: err.message }) }
    }
    setResult({ ok, errors })
    setStep('done')
    if (ok > 0) onImported()
  }

  const mappedFieldKeys = Object.values(mapping).filter(k => k && k !== '__skip')
  const hasPhone = mappedFieldKeys.includes('phone')
  const hasName  = mappedFieldKeys.includes('first_name') || mappedFieldKeys.includes('last_name')
  const canImport = (hasName || hasPhone) && rows.length > 0

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const standardHeaders = ['First Name', 'Last Name', 'Phone', 'Email', 'Stage', 'Priority', 'Source', 'Gender', 'Address']
    const customHeaders   = customFields.map(f => f.label)
    const allHeaders      = [...standardHeaders, ...customHeaders]

    const ws = XLSX.utils.aoa_to_sheet([allHeaders])
    ws['!cols'] = allHeaders.map(() => ({ wch: 18 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads-import-template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="relative w-full max-w-3xl flex flex-col rounded-2xl border border-(--color-border) shadow-2xl"
        style={{ background: 'var(--color-surface)', height: '82vh', maxHeight: '740px' }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-7 pt-6 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-brand)' }}>
              <Upload size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-700 leading-tight" style={{ color: 'var(--color-text-primary)' }}>Import Leads</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Bulk-create leads from a CSV file</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadTemplate} className="btn btn-secondary btn-md gap-1.5">
              <Download size={14} /> Download Template
            </button>
            {step !== 'importing' && step !== 'done' && (
              <button
                onClick={() => {
                  if (step === 'map') setStep('preview')
                  else if (step === 'preview') handleImport()
                }}
                disabled={step === 'upload' || (step === 'map' && !canImport)}
                className="btn btn-primary btn-md px-7"
              >
                {step === 'preview' ? `Import ${rows.length}` : 'Save'}
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary btn-md px-7">
              Cancel
            </button>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="shrink-0 border-t border-(--color-border)" />

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* Upload */}
          {step === 'upload' && (
            <div className="h-full flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--color-brand-50)' }}>
                <Upload size={28} style={{ color: 'var(--color-brand)' }} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-600" style={{ color: 'var(--color-text-primary)' }}>Select a CSV file to import</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>UTF-8 encoded, comma-separated</p>
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-primary btn-md px-6">
                <Upload size={14} /> Browse File
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {/* Map */}
          {step === 'map' && (
            <div className="h-full flex flex-col gap-4">
              <div className="shrink-0 flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Match each CSV column to a lead field. Unmapped columns are skipped.
                </p>
                <span className="text-xs font-600 px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                  {rows.length} row{rows.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Column headers */}
              <div className="shrink-0 grid grid-cols-2 gap-x-4 px-1">
                <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>CSV Column</p>
                <p className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Maps to field</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {headers.map((h, i) => {
                  const isMapped = mapping[i] && mapping[i] !== '__skip'
                  return (
                    <div key={i} className="grid grid-cols-2 gap-4 items-center p-3 rounded-xl border transition-colors"
                      style={{ borderColor: isMapped ? 'var(--color-brand)' : 'var(--color-border)', background: isMapped ? 'var(--color-brand-50)' : 'var(--color-surface-2)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: isMapped ? 'var(--color-brand)' : 'var(--color-border)' }} />
                        <span className="text-xs font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{h}</span>
                      </div>
                      <select
                        value={mapping[i] || '__skip'}
                        onChange={e => setMapping(m => ({ ...m, [i]: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-(--color-border) text-xs outline-none focus:border-(--color-brand) transition-colors"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                      >
                        {LEAD_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>

              {!canImport && (
                <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
                  <AlertCircle size={15} className="shrink-0" style={{ color: '#b45309' }} />
                  <p className="text-xs font-500" style={{ color: '#92400e' }}>
                    Map at least a <strong>First Name</strong> or <strong>Phone</strong> column to continue.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && (
            <div className="h-full flex flex-col gap-4">
              <div className="shrink-0 flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Previewing the first 8 rows — all {rows.length} will be imported.
                </p>
                <span className="text-xs font-600 px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                  {rows.length} lead{rows.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex-1 overflow-auto rounded-xl border border-(--color-border)">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr style={{ background: 'var(--color-surface-2)' }}>
                      <th className="px-3 py-2.5 text-left text-[10px] font-700 uppercase tracking-wider whitespace-nowrap border-b border-(--color-border)"
                        style={{ color: 'var(--color-text-muted)' }}>#</th>
                      {headers.map((h, i) => mapping[i] !== '__skip' && (
                        <th key={i} className="px-3 py-2.5 text-left text-[10px] font-700 uppercase tracking-wider whitespace-nowrap border-b border-(--color-border)"
                          style={{ color: 'var(--color-text-muted)' }}>
                          {LEAD_FIELDS.find(f => f.key === mapping[i])?.label || h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--color-border)">
                    {rows.slice(0, 8).map((row, ri) => (
                      <tr key={ri} className="transition-colors hover:bg-(--color-brand-50)/30">
                        <td className="px-3 py-2.5 text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>{ri + 1}</td>
                        {headers.map((_, i) => mapping[i] !== '__skip' && (
                          <td key={i} className="px-3 py-2.5 whitespace-nowrap font-500" style={{ color: row[i] ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                            {row[i] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 8 && (
                <p className="shrink-0 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                  + {rows.length - 8} more row{rows.length - 8 !== 1 ? 's' : ''} not shown
                </p>
              )}
            </div>
          )}

          {/* Importing */}
          {step === 'importing' && (
            <div className="h-full flex flex-col items-center justify-center gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--color-brand-50)' }}>
                <Spinner size={28} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-700" style={{ color: 'var(--color-text-primary)' }}>Importing leads…</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Creating {rows.length} record{rows.length !== 1 ? 's' : ''}, please wait</p>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && result && (
            <div className="h-full flex flex-col gap-5">
              <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: result.ok > 0 ? '#dcfce7' : '#fee2e2' }}>
                  {result.ok > 0
                    ? <Check size={36} style={{ color: '#15803d' }} />
                    : <AlertCircle size={36} style={{ color: '#b91c1c' }} />}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-800" style={{ color: result.ok > 0 ? '#15803d' : '#b91c1c' }}>
                    {result.ok} lead{result.ok !== 1 ? 's' : ''} imported
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-sm" style={{ color: '#b91c1c' }}>
                      {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed to import
                    </p>
                  )}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="shrink-0 rounded-xl border border-red-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-red-100" style={{ background: '#fef2f2' }}>
                    <p className="text-xs font-700 uppercase tracking-wider" style={{ color: '#b91c1c' }}>Failed rows</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-red-100">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <div key={i} className="flex items-start gap-2 px-4 py-2">
                        <span className="text-[10px] font-700 shrink-0 mt-0.5" style={{ color: '#b91c1c' }}>Row {i + 1}</span>
                        <p className="text-xs" style={{ color: '#7f1d1d' }}>{e.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-(--color-border) flex items-center justify-between px-7 py-4"
          style={{ background: 'var(--color-surface-2)' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>
            {step === 'map' && <p className="text-xs">{headers.length} column{headers.length !== 1 ? 's' : ''} detected</p>}
            {step === 'preview' && <p className="text-xs">{rows.length} lead{rows.length !== 1 ? 's' : ''} ready to import</p>}
          </div>
          <div className="flex items-center gap-2">
            {step === 'done' ? (
              <button onClick={onClose} className="btn btn-primary btn-md">Done</button>
            ) : step === 'map' ? (
              <>
                <button onClick={() => setStep('upload')} className="btn btn-secondary btn-md">Back</button>
                <button onClick={() => setStep('preview')} disabled={!canImport} className="btn btn-primary btn-md">Preview →</button>
              </>
            ) : step === 'preview' ? (
              <>
                <button onClick={() => setStep('map')} className="btn btn-secondary btn-md">Back</button>
                <button onClick={handleImport} className="btn btn-primary btn-md">
                  <Upload size={14} /> Import {rows.length} Lead{rows.length !== 1 ? 's' : ''}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function LeadsPage() {
  const { orgId, org, hasPermission } = useOrg()
  const router = useRouter()

  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)

  // filters
  const [search,      setSearch]      = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({ stages: [], priorities: [], sources: [], genders: [], tags: [], dateFrom: '', dateTo: '', custom: {} })

  // column sort (created / modified)
  const [sort,         setSort]        = useState({ field: null, dir: 'desc' })
  const [sortMenuCol,  setSortMenuCol] = useState(null)   // which col's dropdown is open
  const filterRef = useRef()
  const resizingRef = useRef(null)

  const DEFAULT_COL_WIDTHS = { tag: 150, name: 190, phone: 130, email: 200, gender: 90, city: 120, stage: 110, priority: 100, source: 110, created: 120, modified: 120 }
  const [colWidths, setColWidths] = useState(() => getPref('pref_lead_col_widths') || {})
  const colWidthsRef = useRef(colWidths)
  useEffect(() => { colWidthsRef.current = colWidths }, [colWidths])

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
      setColWidths(prev => { setPref('pref_lead_col_widths', prev); return prev })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const getW = (id) => colWidths[id] ?? DEFAULT_COL_WIDTHS[id] ?? 130

  const [availableTags, setAvailableTags] = useState([])
  const [activeCustom, setActiveCustom] = useState([]) // colIds of custom fields shown as filters

  useEffect(() => {
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFiltersOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

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
    const ok = await showConfirm({
      title: `Delete ${selected.size} lead${selected.size !== 1 ? 's' : ''}?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await Promise.all([...selected].map(id => deleteLead(id)))
      setLeads(prev => prev.filter(l => !selected.has(l.id)))
      clearSelection()
      toast({ type: 'success', title: 'Deleted', message: `${selected.size} lead${selected.size !== 1 ? 's' : ''} deleted` })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const handleMoveToPatient = async () => {
    const ok = await showConfirm({
      title: `Convert ${selected.size} lead${selected.size !== 1 ? 's' : ''}?`,
      message: 'Marks them as Converted in the pipeline.',
      confirmLabel: 'Convert',
      variant: 'info',
    })
    if (!ok) return
    try {
      await Promise.all([...selected].map(id => updateLead(id, { stage: 'Converted' })))
      setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, stage: 'Converted' } : l))
      clearSelection()
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
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

  // ── Pagination ──
  const [pageSize, setPageSize] = useState(20)
  const [page,     setPage]     = useState(1)

  // Reset to page 1 whenever filters / search / sort change
  useEffect(() => { setPage(1) }, [search, filters, sort])

  const totalPages   = Math.max(1, Math.ceil(sortedFiltered.length / pageSize))
  const safePage     = Math.min(page, totalPages)
  const pagedLeads   = sortedFiltered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const visibleCols = allColumns.filter(c => visible[c.id])

  const renderCell = (col, lead) => {
    // Custom module field
    if (col.moduleId) {
      const val = lead?.custom_data?.[col.moduleId]?.[col.fieldId]
      return <span style={{ fontSize: 14, color: val ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{val || '—'}</span>
    }
    switch (col.id) {
      case 'name':     return (
        <span style={{ color: 'var(--color-brand)', fontWeight: 500, fontSize: 15 }}>
          {patientName(lead)}
        </span>
      )
      case 'phone':    return <span style={{ color: '#374151', fontSize: 15 }}>{patientPhone(lead)}</span>
      case 'email':    return <span style={{ color: '#374151', fontSize: 15 }} className="truncate max-w-45 block">{patientEmail(lead)}</span>
      case 'gender':   return <span style={{ color: '#374151', fontSize: 15 }}>{patientGender(lead)}</span>
      case 'city':     return <span style={{ color: '#374151', fontSize: 15 }}>{patientCity(lead)}</span>
      case 'stage':    return <StyledBadge label={lead.stage}    styleMap={STAGE_STYLE} />
      case 'priority': return <StyledBadge label={lead.priority} styleMap={PRIORITY_STYLE} />
      case 'source':   return (
        <span style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', fontWeight: 500 }}>
          {lead.source}
        </span>
      )
      case 'created':  return (
        <span style={{ fontSize: 14, color: '#6b7280' }}>
          {format(new Date(lead.created_at), 'MMM d, yyyy')}
        </span>
      )
      case 'modified': return (
        <span style={{ fontSize: 14, color: '#6b7280' }}>
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
            className="btn btn-secondary btn-icon"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {hasPermission('leads.create') && (
            <Link href="/leads/new">
              <button className="btn btn-primary btn-md">
                <Plus size={16} /> New Lead
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none transition-all focus:border-(--color-brand)"
            style={{
              background: 'linear-gradient(180deg,#ffffff 0%,#f9fafb 100%)',
              border: '1px solid #d1d5db',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
              color: 'var(--color-text-primary)',
            }}
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

        {/* Import */}
        <button onClick={() => setImportOpen(true)} className="btn btn-secondary btn-md">
          <Upload size={15} />
          Import
        </button>

        {/* Filters toggle + dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={clsx('btn btn-md', filtersOpen || hasFilters ? 'btn-primary' : 'btn-secondary')}
          >
            <SlidersHorizontal size={15} />
            Filters
            {hasFilters && (
              <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }}>
                {filterCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 z-40 rounded-xl border border-(--color-border) p-3 space-y-2.5"
              style={{ background: 'var(--color-surface)', boxShadow: '0 12px 36px rgba(0,0,0,0.14)', width: '380px', maxWidth: 'calc(100vw - 2rem)', minHeight: '360px' }}
            >
              <div className="grid grid-cols-2 gap-2">
                <MultiSelect label="Stage"    options={opts(stageOptions)} selected={filters.stages}     onChange={v => setFilters(f => ({ ...f, stages: v }))} />
                <MultiSelect label="Priority" options={opts(PRIORITIES)}   selected={filters.priorities} onChange={v => setFilters(f => ({ ...f, priorities: v }))} />
                <MultiSelect label="Source"   options={opts(SOURCES)}      selected={filters.sources}    onChange={v => setFilters(f => ({ ...f, sources: v }))} />
                <MultiSelect label="Gender"   options={opts(GENDERS)}      selected={filters.genders}    onChange={v => setFilters(f => ({ ...f, genders: v }))} />
                <MultiSelect label="Tag" icon={Tag} options={availableTags.map(t => ({ value: t.id, label: t.name, color: t.color }))}
                  selected={filters.tags} onChange={v => setFilters(f => ({ ...f, tags: v }))} />

                {leadModuleFields.length > 0 && (
                  <CustomFieldPicker fields={leadModuleFields} active={activeCustom} onToggle={toggleCustomField} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 items-start">
                <div className="col-span-2 w-full">
                  <DateRangeSelect from={filters.dateFrom} to={filters.dateTo}
                    onChange={(dateFrom, dateTo) => setFilters(f => ({ ...f, dateFrom, dateTo }))} />
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
                  <button onClick={clearFilters} className="btn btn-danger btn-sm">
                    <X size={12} /> Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column toggle */}
        <ColumnToggle allColumns={allColumns} visible={visible} setVisible={setVisible} />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }}
        >
          <span className="text-sm font-600" style={{ color: 'var(--color-brand)' }}>
            {selected.size} lead{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button onClick={clearSelection} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand)' }}>
            Deselect all
          </button>
          <div className="flex-1" />
          <button onClick={handleMoveToPatient} className="btn btn-success btn-sm">
            <UserCheck size={14} /> Move to Patient
          </button>
          <button onClick={handleExport} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export
          </button>
          {hasPermission('leads.delete') && (
            <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size={32} />
        </div>
      ) : (
        <div style={{ border: '1px solid #dde1e7', borderRadius: 4, background: '#fff', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ fontSize: 15, tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: getW('tag') }} />
                {visibleCols.map(col => <col key={col.id} style={{ width: getW(col.id) }} />)}
              </colgroup>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #dde1e7' }}>
                  {/* Select-all */}
                  <th className="sticky left-0 z-20" style={{ width: 40, padding: '0 0 0 14px', background: '#f3f4f6', borderRight: '1px solid #dde1e7' }}>
                    <input
                      type="checkbox"
                      checked={sortedFiltered.length > 0 && selected.size === sortedFiltered.length}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < sortedFiltered.length }}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 cursor-pointer"
                      style={{ accentColor: 'var(--color-brand)' }}
                    />
                  </th>
                  {/* Tag */}
                  <th className="sticky z-20 text-left" style={{ left: 40, width: getW('tag'), padding: '9px 14px 9px 14px', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6b7280', background: '#f3f4f6', borderRight: '1px solid #dde1e7', position: 'sticky', userSelect: 'none', overflow: 'hidden' }}>
                    Tag
                    <div onMouseDown={e => startResize('tag', e)} style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 5, cursor: 'col-resize', zIndex: 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
                  </th>
                  {visibleCols.map(col => {
                    const isSortable = col.id === 'created' || col.id === 'modified'
                    const isActive   = sort.field === col.id
                    return (
                      <th key={col.id} className="text-left" style={{ width: getW(col.id), padding: '9px 14px', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6b7280', borderRight: '1px solid #dde1e7', position: 'relative', userSelect: 'none', overflow: 'hidden' }}>
                        {isSortable ? (
                          <div className="relative inline-flex items-center gap-1">
                            {col.label}
                            <button
                              type="button"
                              onClick={() => setSortMenuCol(sortMenuCol === col.id ? null : col.id)}
                              className="p-0.5 rounded transition-colors"
                              style={{ color: isActive ? 'var(--color-brand)' : '#9ca3af' }}
                              title="Sort"
                            >
                              {isActive
                                ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
                                : <ArrowUpDown size={11} />}
                            </button>
                            {sortMenuCol === col.id && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setSortMenuCol(null)} />
                                <div className="absolute top-full left-0 mt-1 w-36 overflow-hidden z-40" style={{ background: '#fff', border: '1px solid #dde1e7', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}>
                                  {[{ dir: 'asc', label: 'Ascending' }, { dir: 'desc', label: 'Descending' }].map(opt => (
                                    <button key={opt.dir} type="button"
                                      onClick={() => { setSort({ field: col.id, dir: opt.dir }); setSortMenuCol(null) }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-gray-50"
                                      style={{ color: '#374151' }}>
                                      {opt.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                                      {opt.label}
                                      {isActive && sort.dir === opt.dir && <Check size={11} className="ml-auto" style={{ color: 'var(--color-brand)' }} />}
                                    </button>
                                  ))}
                                  {isActive && (
                                    <button type="button"
                                      onClick={() => { setSort({ field: null, dir: 'desc' }); setSortMenuCol(null) }}
                                      className="w-full px-3 py-2 text-xs text-left transition-colors hover:bg-gray-50"
                                      style={{ color: '#9ca3af', borderTop: '1px solid #e5e7eb' }}>
                                      Clear sort
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ) : col.label}
                        <div onMouseDown={e => startResize(col.id, e)} style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 5, cursor: 'col-resize', zIndex: 1 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 2} className="text-center" style={{ padding: '56px 16px', fontSize: 15, color: '#9ca3af' }}>
                      {hasFilters || search ? 'No leads match your filters.' : 'No leads yet. Create your first lead.'}
                    </td>
                  </tr>
                ) : pagedLeads.map((lead, idx) => {
                  const isSelected = selected.has(lead.id)
                  const leadTags   = (lead.tags || []).map(t => t.tags).filter(Boolean)
                  const rowBg      = isSelected ? '#eef3ff' : '#fff'
                  const rowStyle   = { background: rowBg, borderBottom: idx === pagedLeads.length - 1 ? 'none' : '1px solid #f0f0f0' }
                  return (
                    <tr
                      key={lead.id}
                      style={rowStyle}
                      className="group"
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f5f8ff' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
                    >
                      {/* Checkbox */}
                      <td className="sticky left-0 z-10" style={{ width: 40, padding: '0 0 0 14px', background: rowBg, borderRight: '1px solid #f0f0f0' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(lead.id)}
                          className="w-3.5 h-3.5 cursor-pointer"
                          style={{ accentColor: 'var(--color-brand)' }}
                        />
                      </td>
                      {/* Tags */}
                      <td className="sticky z-10 cursor-pointer" style={{ left: 40, padding: '7px 14px', background: rowBg, borderRight: '1px solid #f0f0f0', overflow: 'hidden' }} onClick={() => router.push(`/leads/${lead.id}`)}>
                        {leadTags.length === 0 ? (
                          <span style={{ color: '#d1d5db', fontSize: 14 }}>—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {leadTags.map(tag => {
                              const tc = tag.color || '#135BFB'
                              return (
                                <span key={tag.id} className="relative inline-flex items-center pl-2.5 pr-2 py-0.5 text-[12px] font-600 whitespace-nowrap"
                                  style={{ background: tc, color: 'white', clipPath: 'polygon(7px 0, 100% 0, 100% 100%, 7px 100%, 0 50%)' }}>
                                  <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }} />
                                  {tag.name}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>
                      {/* Data cells */}
                      {visibleCols.map((col, ci) => (
                        <td key={col.id}
                          className="cursor-pointer"
                          style={{ padding: '8px 14px', borderRight: ci === visibleCols.length - 1 ? 'none' : '1px solid #f0f0f0', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => router.push(`/leads/${lead.id}`)}>
                          {renderCell(col, lead)}
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
                {sortedFiltered.length === 0 ? '0 leads' : <>
                  <strong style={{ color: '#374151' }}>{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sortedFiltered.length)}</strong>
                  {' of '}
                  <strong style={{ color: '#374151' }}>{sortedFiltered.length}</strong>
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

      {importOpen && (
        <ImportModal
          orgId={orgId}
          customFields={leadModuleFields}
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); loadLeads() }}
        />
      )}
    </div>
  )
}
