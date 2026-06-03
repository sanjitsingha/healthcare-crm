'use client'
import { useEffect, useState } from 'react'
import {
  Plus, Stethoscope, User, UserRound, Calendar, Clock,
  ChevronDown, Check, X, Edit2, Trash2, Search, Activity,
  FileText, Link2, RotateCcw,
} from 'lucide-react'
import { Button, Card, Modal, Input, Select, Textarea, Spinner } from '@/components/ui'
import {
  getConsultations, createConsultation, updateConsultation, deleteConsultation,
  getPatients, getLeads,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { format, formatDistanceToNow, isToday } from 'date-fns'
import clsx from 'clsx'

const CONSULTATION_TYPES = ['Initial', 'Follow-up', 'Urgent', 'Routine', 'Teleconsultation', 'Walk-in']
const STATUSES           = ['Scheduled', 'Completed', 'Cancelled', 'No-Show']

const TYPE_STYLE = {
  'Initial':         { bg: '#dbeafe', color: '#1d4ed8' },
  'Follow-up':       { bg: '#f3e8ff', color: '#7c3aed' },
  'Urgent':          { bg: '#fee2e2', color: '#b91c1c' },
  'Routine':         { bg: '#dcfce7', color: '#15803d' },
  'Teleconsultation':{ bg: '#fef9c3', color: '#a16207' },
  'Walk-in':         { bg: '#f3f4f6', color: '#374151' },
}

const STATUS_STYLE = {
  'Scheduled':  { bg: '#fef9c3', color: '#a16207' },
  'Completed':  { bg: '#dcfce7', color: '#15803d' },
  'Cancelled':  { bg: '#fee2e2', color: '#b91c1c' },
  'No-Show':    { bg: '#f3f4f6', color: '#6b7280' },
}

const BLANK_FORM = () => ({
  patient_id: '', lead_id: '', doctor_id: '',
  consultation_type: 'Initial', status: 'Completed',
  consulted_at_date: format(new Date(), 'yyyy-MM-dd'),
  consulted_at_time: format(new Date(), 'HH:mm'),
  chief_complaint: '', clinical_notes: '', diagnosis: '',
  treatment_plan: '', prescription: '',
  vitals: { bp_sys: '', bp_dia: '', pulse: '', temp: '', weight: '', spo2: '' },
  follow_up_required: false, follow_up_date: '',
  duration_minutes: 30, amount: '',
})

// ── Vitals mini-display ────────────────────────────────────────
function VitalsBadges({ vitals = {} }) {
  const items = [
    vitals.bp_sys && vitals.bp_dia && { label: 'BP', value: `${vitals.bp_sys}/${vitals.bp_dia}` },
    vitals.pulse  && { label: 'Pulse', value: `${vitals.pulse} bpm` },
    vitals.temp   && { label: 'Temp', value: `${vitals.temp}°C` },
    vitals.weight && { label: 'Weight', value: `${vitals.weight} kg` },
    vitals.spo2   && { label: 'SpO₂', value: `${vitals.spo2}%` },
  ].filter(Boolean)

  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map(({ label, value }) => (
        <span key={label} className="flex items-center gap-1 text-[10px] font-600 px-2 py-0.5 rounded-full border border-(--color-border)" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>{label}</span> {value}
        </span>
      ))}
    </div>
  )
}

// ── Consultation Form (shared create + edit) ───────────────────
function ConsultationForm({ form, setForm, patients, leads, doctors }) {
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setVital = (key, val) => setForm(f => ({ ...f, vitals: { ...f.vitals, [key]: val } }))

  return (
    <div className="space-y-5">
      {/* ── Who ── */}
      <div>
        <p className="text-[10px] font-700 uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Patient / Lead</p>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Patient" value={form.patient_id} onChange={e => set('patient_id', e.target.value)}
            options={[{ value: '', label: '— None —' }, ...patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name || ''}`.trim() }))]} />
          <Select label="Lead (optional)" value={form.lead_id} onChange={e => set('lead_id', e.target.value)}
            options={[{ value: '', label: '— None —' }, ...leads.map(l => ({ value: l.id, label: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title }))]} />
        </div>
      </div>

      {/* ── When + Doctor ── */}
      <div>
        <p className="text-[10px] font-700 uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Date & Doctor</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
            <input type="date" required value={form.consulted_at_date} onChange={e => set('consulted_at_date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Time</label>
            <input type="time" value={form.consulted_at_time} onChange={e => set('consulted_at_time', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Doctor</label>
            {doctors.length === 0 ? (
              <div className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                No doctors — add in Settings → People
              </div>
            ) : (
              <select value={form.doctor_id} onChange={e => set('doctor_id', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                <option value="">— Select —</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}{d.department ? ` · ${d.department}` : ''}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── Type + Status + Duration + Amount ── */}
      <div className="grid grid-cols-4 gap-3">
        <Select label="Type" value={form.consultation_type} onChange={e => set('consultation_type', e.target.value)}
          options={CONSULTATION_TYPES.map(t => ({ value: t, label: t }))} />
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={STATUSES.map(s => ({ value: s, label: s }))} />
        <div className="space-y-1.5">
          <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Duration (min)</label>
          <input type="number" min="5" step="5" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Amount (₹)</label>
          <input type="number" min="0" value={form.amount} onChange={e => set('amount', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
        </div>
      </div>

      {/* ── Chief Complaint ── */}
      <Input label="Chief Complaint" placeholder="Why the patient visited today…" value={form.chief_complaint} onChange={e => set('chief_complaint', e.target.value)} />

      {/* ── Clinical fields ── */}
      <div className="grid grid-cols-2 gap-3">
        <Textarea label="Clinical Notes" placeholder="Observations, history, symptoms…" value={form.clinical_notes} onChange={e => set('clinical_notes', e.target.value)} rows={3} />
        <Textarea label="Diagnosis" placeholder="Confirmed or provisional diagnosis…" value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} rows={3} />
        <Textarea label="Treatment Plan" placeholder="Procedures, referrals, lifestyle advice…" value={form.treatment_plan} onChange={e => set('treatment_plan', e.target.value)} rows={3} />
        <Textarea label="Prescription" placeholder="Medications, dosage, duration…" value={form.prescription} onChange={e => set('prescription', e.target.value)} rows={3} />
      </div>

      {/* ── Vitals ── */}
      <div>
        <p className="text-[10px] font-700 uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Vitals (optional)</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { key: 'bp_sys',  label: 'BP Sys',    placeholder: '120', unit: 'mmHg' },
            { key: 'bp_dia',  label: 'BP Dia',    placeholder: '80',  unit: 'mmHg' },
            { key: 'pulse',   label: 'Pulse',     placeholder: '72',  unit: 'bpm'  },
            { key: 'temp',    label: 'Temp',      placeholder: '37',  unit: '°C'   },
            { key: 'weight',  label: 'Weight',    placeholder: '70',  unit: 'kg'   },
            { key: 'spo2',    label: 'SpO₂',      placeholder: '98',  unit: '%'    },
          ].map(({ key, label, placeholder, unit }) => (
            <div key={key} className="space-y-1">
              <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>{label} <span style={{ color: 'var(--color-text-muted)' }}>({unit})</span></label>
              <input type="number" placeholder={placeholder} value={form.vitals[key]} onChange={e => setVital(key, e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Follow-up ── */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.follow_up_required} onChange={e => set('follow_up_required', e.target.checked)}
            className="w-4 h-4" style={{ accentColor: 'var(--color-brand)' }} />
          <span className="text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Follow-up required</span>
        </label>
        {form.follow_up_required && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Date</label>
            <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Consultation card ──────────────────────────────────────────
function ConsultationCard({ c, doctors, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  const typeS   = TYPE_STYLE[c.consultation_type]   || TYPE_STYLE.Routine
  const statusS = STATUS_STYLE[c.status]             || STATUS_STYLE.Completed
  const doctor  = c.doctor_id ? doctors.find(d => d.id === c.doctor_id) : null

  const patientName = c.patients ? `${c.patients.first_name} ${c.patients.last_name || ''}`.trim() : null
  const leadName    = c.leads    ? ([c.leads.first_name, c.leads.last_name].filter(Boolean).join(' ') || c.leads.title) : null
  const entityName  = patientName || leadName || 'Unknown'
  const entityHref  = c.patient_id ? `/patients/${c.patient_id}` : c.lead_id ? `/leads/${c.lead_id}` : null

  return (
    <div className="rounded-2xl border border-(--color-border) overflow-hidden transition-shadow hover:shadow-sm" style={{ background: 'var(--color-surface)' }}>
      {/* Summary row */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
          <Stethoscope size={18} style={{ color: 'var(--color-brand)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {entityHref ? (
              <Link href={entityHref} className="text-sm font-700 hover:underline truncate" style={{ color: 'var(--color-text-primary)' }}>
                {entityName}
              </Link>
            ) : (
              <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{entityName}</span>
            )}
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: typeS.bg, color: typeS.color }}>
              {c.consultation_type}
            </span>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: statusS.bg, color: statusS.color }}>
              {c.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {isToday(new Date(c.consulted_at)) ? 'Today' : format(new Date(c.consulted_at), 'MMM d, yyyy')}
              {' · '}{format(new Date(c.consulted_at), 'h:mm a')}
            </span>
            {doctor && <span className="flex items-center gap-1"><User size={11} /> {doctor.name}{doctor.department ? ` · ${doctor.department}` : ''}</span>}
            {c.duration_minutes && <span className="flex items-center gap-1"><Clock size={11} /> {c.duration_minutes} min</span>}
            {c.amount > 0 && <span>₹{Number(c.amount).toLocaleString('en-IN')}</span>}
          </div>

          {c.chief_complaint && (
            <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
              {c.chief_complaint}
            </p>
          )}
          <VitalsBadges vitals={c.vitals || {}} />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={() => setExpanded(o => !o)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
            style={{ color: 'var(--color-text-muted)' }}>
            {expanded ? 'Less' : 'View'}
            <ChevronDown size={11} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          <button type="button" onClick={() => onEdit(c)}
            className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
            style={{ color: 'var(--color-text-muted)' }}>
            <Edit2 size={13} />
          </button>
          <button type="button" onClick={() => onDelete(c.id)}
            className="p-1.5 rounded-lg border border-(--color-border) hover:bg-red-50 hover:text-red-500 transition-colors text-gray-400">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-(--color-border) p-4 grid grid-cols-2 gap-4" style={{ background: 'var(--color-surface-2)' }}>
          {[
            { label: 'Chief Complaint', value: c.chief_complaint },
            { label: 'Diagnosis',       value: c.diagnosis },
            { label: 'Clinical Notes',  value: c.clinical_notes },
            { label: 'Treatment Plan',  value: c.treatment_plan },
            { label: 'Prescription',    value: c.prescription },
            c.follow_up_required && {
              label: 'Follow-up',
              value: c.follow_up_date ? `Required · ${format(new Date(c.follow_up_date), 'MMM d, yyyy')}` : 'Required'
            },
          ].filter(Boolean).map(({ label, value }) => value && (
            <div key={label}>
              <p className="text-[10px] font-700 uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function ConsultationPage() {
  const { orgId, org } = useOrg()
  const [consultations, setConsultations] = useState([])
  const [patients,      setPatients]      = useState([])
  const [leads,         setLeads]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState('All')
  const [filterType,    setFilterType]    = useState('All')
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editTarget,    setEditTarget]    = useState(null)
  const [form,          setForm]          = useState(BLANK_FORM())
  const [saving,        setSaving]        = useState(false)

  const doctors = org?.settings?.doctors || []

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    Promise.all([
      getConsultations({ orgId }),
      getPatients({ orgId }),
      getLeads({ orgId }),
    ]).then(([c, p, l]) => {
      if (!active) return
      setConsultations(c || [])
      setPatients(p || [])
      setLeads(l || [])
    }).catch(() => {}).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orgId])

  const openCreate = () => { setEditTarget(null); setForm(BLANK_FORM()); setModalOpen(true) }
  const openEdit   = (c) => {
    setEditTarget(c)
    const d = new Date(c.consulted_at)
    setForm({
      patient_id: c.patient_id || '', lead_id: c.lead_id || '', doctor_id: c.doctor_id || '',
      consultation_type: c.consultation_type, status: c.status,
      consulted_at_date: format(d, 'yyyy-MM-dd'),
      consulted_at_time: format(d, 'HH:mm'),
      chief_complaint: c.chief_complaint || '', clinical_notes: c.clinical_notes || '',
      diagnosis: c.diagnosis || '', treatment_plan: c.treatment_plan || '', prescription: c.prescription || '',
      vitals: { bp_sys: '', bp_dia: '', pulse: '', temp: '', weight: '', spo2: '', ...(c.vitals || {}) },
      follow_up_required: c.follow_up_required || false,
      follow_up_date: c.follow_up_date || '',
      duration_minutes: c.duration_minutes || 30, amount: c.amount || '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)
    try {
      const scheduledAt = new Date(`${form.consulted_at_date}T${form.consulted_at_time || '10:00'}:00`)
      // Clean up vitals — remove empty strings
      const vitals = Object.fromEntries(Object.entries(form.vitals).filter(([, v]) => v !== ''))
      const payload = {
        organization_id: orgId,
        patient_id:      form.patient_id || null,
        lead_id:         form.lead_id    || null,
        doctor_id:       form.doctor_id  || null,
        consultation_type: form.consultation_type,
        status:          form.status,
        consulted_at:    scheduledAt.toISOString(),
        chief_complaint: form.chief_complaint || null,
        clinical_notes:  form.clinical_notes  || null,
        diagnosis:       form.diagnosis       || null,
        treatment_plan:  form.treatment_plan  || null,
        prescription:    form.prescription    || null,
        vitals,
        follow_up_required: form.follow_up_required,
        follow_up_date:  form.follow_up_required && form.follow_up_date ? form.follow_up_date : null,
        duration_minutes: Number(form.duration_minutes) || 30,
        amount:          form.amount !== '' ? Number(form.amount) : 0,
      }
      if (editTarget) {
        const updated = await updateConsultation(editTarget.id, payload)
        setConsultations(prev => prev.map(c => c.id === editTarget.id ? { ...c, ...updated } : c))
      } else {
        const created = await createConsultation(payload)
        setConsultations(prev => [created, ...prev])
      }
      setModalOpen(false)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this consultation? This cannot be undone.')) return
    try {
      await deleteConsultation(id)
      setConsultations(prev => prev.filter(c => c.id !== id))
    } catch (err) { alert(err.message) }
  }

  // Filter + search
  const filtered = consultations.filter(c => {
    if (filterStatus !== 'All' && c.status !== filterStatus) return false
    if (filterType   !== 'All' && c.consultation_type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      const patName = c.patients ? `${c.patients.first_name} ${c.patients.last_name || ''}` : ''
      const leadName = c.leads ? `${c.leads.first_name || ''} ${c.leads.last_name || ''} ${c.leads.title || ''}` : ''
      if (!patName.toLowerCase().includes(q) && !leadName.toLowerCase().includes(q) &&
          !(c.chief_complaint || '').toLowerCase().includes(q) &&
          !(c.diagnosis || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  // Stats
  const totalCount     = consultations.length
  const todayCount     = consultations.filter(c => isToday(new Date(c.consulted_at))).length
  const followUpCount  = consultations.filter(c => c.follow_up_required && c.status === 'Completed').length

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Stethoscope size={20} style={{ color: 'var(--color-brand)' }} />
            Consultations
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {totalCount} total · {todayCount} today · {followUpCount} need follow-up
          </p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> New Consultation</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            placeholder="Search patient, diagnosis…" value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['All', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-500 border transition-all"
              style={filterStatus === s
                ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' }
                : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {['All', ...CONSULTATION_TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-500 border transition-all"
              style={filterType === t
                ? { ...TYPE_STYLE[t] || { background: 'var(--color-brand)', color: 'white' }, borderColor: 'transparent' }
                : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
          <Stethoscope size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {search || filterStatus !== 'All' || filterType !== 'All' ? 'No consultations match your filters.' : 'No consultations yet.'}
          </p>
          {!search && filterStatus === 'All' && filterType === 'All' && (
            <button onClick={openCreate} className="mt-2 text-xs font-600 transition-opacity hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
              Log the first consultation →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <ConsultationCard key={c.id} c={c} doctors={doctors} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Consultation' : 'New Consultation'}>
        <form onSubmit={handleSave} className="space-y-0">
          <ConsultationForm form={form} setForm={setForm} patients={patients} leads={leads} doctors={doctors} />
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-(--color-border)">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.consulted_at_date}>
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Log Consultation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
