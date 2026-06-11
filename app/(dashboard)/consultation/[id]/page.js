'use client'

import { useEffect, useState, use, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Stethoscope, Plus, Calendar, Clock, CheckSquare, History,
  Phone, Mail, User, UserRound, TrendingUp, ChevronDown, Check, X,
  MessageSquare, Edit2, Tag, Bell, FileText,
  List, Table2, ArrowUpDown, RotateCcw, PhoneCall,
} from 'lucide-react'
import { Button, Card, Spinner, Avatar, Input, Select, Textarea, Modal } from '@/components/ui'
import {
  getPatient, getLead, getConsultations, createConsultation,
  getAppointments, createAppointment, updateAppointment,
  getTasks, createTask, updateTask,
  getActivities, createActivity,
  getFollowups, createFollowup, updateFollowup,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Timeline from '@/components/crm/Timeline'
import FollowupTable from '@/components/crm/FollowupTable'
import { format, isFuture, isToday, isPast } from 'date-fns'
import clsx from 'clsx'

const CONSULTATION_TYPES = ['Initial', 'Follow-up', 'Urgent', 'Routine', 'Teleconsultation', 'Walk-in']
const STATUSES           = ['Scheduled', 'Completed', 'Cancelled', 'No-Show']

const TYPE_STYLE = {
  'Initial':        { bg: '#dbeafe', color: '#1d4ed8' },
  'Follow-up':      { bg: '#f3e8ff', color: '#7c3aed' },
  'Urgent':         { bg: '#fee2e2', color: '#b91c1c' },
  'Routine':        { bg: '#dcfce7', color: '#15803d' },
  'Teleconsultation': { bg: '#fef9c3', color: '#a16207' },
  'Walk-in':        { bg: '#f3f4f6', color: '#374151' },
}
const C_STATUS_STYLE = {
  'Scheduled':  { bg: '#fef9c3', color: '#a16207' },
  'Completed':  { bg: '#dcfce7', color: '#15803d' },
  'Cancelled':  { bg: '#fee2e2', color: '#b91c1c' },
  'No-Show':    { bg: '#f3f4f6', color: '#6b7280' },
}

const CHANNELS = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Other']
const CHANNEL_OUTCOMES = {
  Call:     ['Connected - Interested','Connected - Not Interested','Connected - Callback Requested','Ringing - No Response','Switched Off','Busy'],
  WhatsApp: ['Replied - Interested','Replied - Not Interested','Message Sent - No Reply','Seen - No Reply'],
  Email:    ['Replied - Interested','Replied - Not Interested','Sent - No Reply','Bounced'],
  Meeting:  ['Attended - Interested','Attended - Not Interested','No Show','Rescheduled'],
  Other:    ['Updated','Waiting for Response','Closed'],
}
const CHANNEL_COLOR = {
  Call:     { color: '#15803d', bg: '#dcfce7' },
  WhatsApp: { color: '#15803d', bg: '#dcfce7' },
  Email:    { color: '#1d4ed8', bg: '#dbeafe' },
  Meeting:  { color: '#7c3aed', bg: '#f3e8ff' },
  Other:    { color: '#374151', bg: '#f3f4f6' },
}
const CHANNEL_ICON = { Call: Phone, WhatsApp: MessageSquare, Email: Mail, Meeting: Calendar, Other: Bell }

const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email']
const FOLLOWUP_STATUS_OPTIONS = {
  Call:     ['Not Connected','Switched Off','Busy','Not Reachable','Connected - Interested','Connected - Not Interested','Connected - Callback Requested','Wrong Number'],
  WhatsApp: ['Sent - No Reply','Delivered - No Reply','Seen - No Reply','Replied - Interested','Replied - Not Interested','Replied - Callback Requested','Number Not on WhatsApp'],
  Email:    ['Sent - No Reply','Opened - No Reply','Replied - Interested','Replied - Not Interested','Bounced','Unsubscribed'],
}
const FU_TYPE_COLOR = {
  Call:     { bg: '#dbeafe', color: '#1d4ed8' },
  WhatsApp: { bg: '#dcfce7', color: '#15803d' },
  Email:    { bg: '#fef9c3', color: '#a16207' },
  Other:    { bg: '#f3f4f6', color: '#374151' },
}
const FU_TYPE_ICON = { Call: Phone, WhatsApp: MessageSquare, Email: Mail, Other: Bell }
const FU_STATUS_STYLE = {
  Scheduled:   { bg: '#fef3c7', color: '#b45309' },
  Completed:   { bg: '#dcfce7', color: '#15803d' },
  Missed:      { bg: '#fee2e2', color: '#b91c1c' },
  Rescheduled: { bg: '#f3f4f6', color: '#6b7280' },
}

// ── Visit details — Excel-style table ─────────────────────────
function VisitDetailsTable({ rows }) {
  if (!rows?.length) return null
  return (
    <div className="rounded-lg border border-(--color-border) overflow-hidden" style={{ fontFamily: 'ui-monospace, monospace' }}>
      <div className="grid border-b border-(--color-border)"
        style={{ gridTemplateColumns: '1fr 1.5fr', background: 'var(--color-surface-2)' }}>
        <span className="px-3 py-1.5 text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Detail</span>
        <span className="px-3 py-1.5 text-[10px] font-700 uppercase tracking-wider border-l border-(--color-border)" style={{ color: 'var(--color-text-muted)' }}>Value</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid border-b border-(--color-border) last:border-0"
          style={{ gridTemplateColumns: '1fr 1.5fr', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)' }}>
          <span className="px-3 py-2 text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>{r.label || '—'}</span>
          <span className="px-3 py-2 text-xs border-l border-(--color-border)" style={{ color: 'var(--color-text-primary)' }}>{r.value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

// ── Single consultation record (expandable) ────────────────────
function ConsultationRecord({ c, doctors }) {
  const [open, setOpen] = useState(false)
  const t = TYPE_STYLE[c.consultation_type]   || TYPE_STYLE.Routine
  const s = C_STATUS_STYLE[c.status]          || C_STATUS_STYLE.Completed
  const doctor = c.doctor_id ? doctors.find(d => d.id === c.doctor_id) : null

  const fields = [
    ['Chief Complaint', c.chief_complaint],
    ['Diagnosis', c.diagnosis],
    ['Clinical Notes', c.clinical_notes],
    ['Treatment Plan', c.treatment_plan],
    ['Prescription', c.prescription],
  ].filter(([, v]) => v)

  return (
    <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      {/* Row */}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-(--color-surface-2) transition-colors">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
          <Stethoscope size={14} style={{ color: 'var(--color-brand)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>
              {format(new Date(c.consulted_at), 'EEE, MMM d yyyy · h:mm a')}
            </span>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: t.bg, color: t.color }}>{c.consultation_type}</span>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{c.status}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
            {doctor && <span className="flex items-center gap-1"><User size={11} />{doctor.name}</span>}
            {c.chief_complaint && <span className="truncate max-w-xs">{c.chief_complaint}</span>}
          </div>
        </div>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
          {/* Clinical fields */}
          {fields.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-4 pb-3">
              {fields.map(([label, v]) => (
                <div key={label}>
                  <p className="text-[10px] font-700 uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                  <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{v}</p>
                </div>
              ))}
            </div>
          )}
          {/* Visit details — Excel table */}
          {Array.isArray(c.visit_details) && c.visit_details.length > 0 && (
            <div className={clsx('px-4', fields.length > 0 ? 'pb-4' : 'py-4')}>
              <p className="text-[10px] font-700 uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Visit Details</p>
              <VisitDetailsTable rows={c.visit_details} />
            </div>
          )}
          {fields.length === 0 && (!c.visit_details?.length) && (
            <p className="px-4 py-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>No details recorded.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Inline "Log Consultation" modal ───────────────────────────
function LogConsultationModal({ open, onClose, entity, orgId, doctors, onCreated }) {
  const blank = () => ({
    consultation_type: 'Initial', status: 'Completed',
    consulted_at_date: format(new Date(), 'yyyy-MM-dd'),
    consulted_at_time: format(new Date(), 'HH:mm'),
    doctor_id: '',
    chief_complaint: '', clinical_notes: '', diagnosis: '',
    treatment_plan: '', prescription: '',
    visit_details: [],
    follow_up_required: false, follow_up_date: '',
  })
  const [form, setForm] = useState(blank())
  const [saving, setSaving] = useState(false)
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const addRow = () => setForm(f => ({ ...f, visit_details: [...f.visit_details, { label: '', value: '' }] }))
  const setRow = (i, k, v) => setForm(f => ({ ...f, visit_details: f.visit_details.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }))
  const delRow = i  => setForm(f => ({ ...f, visit_details: f.visit_details.filter((_, idx) => idx !== i) }))

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const at = new Date(`${form.consulted_at_date}T${form.consulted_at_time || '10:00'}:00`)
      const row = await createConsultation({
        organization_id: orgId,
        patient_id: entity.type === 'patient' ? entity.id : null,
        lead_id:    entity.type === 'lead'    ? entity.id : null,
        doctor_id: form.doctor_id || null,
        consultation_type: form.consultation_type,
        status: form.status,
        consulted_at: at.toISOString(),
        chief_complaint:  form.chief_complaint  || null,
        clinical_notes:   form.clinical_notes   || null,
        diagnosis:        form.diagnosis        || null,
        treatment_plan:   form.treatment_plan   || null,
        prescription:     form.prescription     || null,
        visit_details: form.visit_details.filter(r => (r.label || r.value).trim()),
        follow_up_required: form.follow_up_required,
        follow_up_date: form.follow_up_required && form.follow_up_date ? form.follow_up_date : null,
      })
      onCreated(row)
      setForm(blank())
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Consultation" size="lg">
      <form onSubmit={submit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" value={form.consultation_type} onChange={e => set('consultation_type')(e.target.value)}
            options={CONSULTATION_TYPES.map(t => ({ value: t, label: t }))} />
          <Select label="Status" value={form.status} onChange={e => set('status')(e.target.value)}
            options={STATUSES.map(s => ({ value: s, label: s }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
            <input type="date" required value={form.consulted_at_date} onChange={e => set('consulted_at_date')(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Time</label>
            <input type="time" value={form.consulted_at_time} onChange={e => set('consulted_at_time')(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          </div>
        </div>
        {doctors.length > 0 && (
          <Select label="Doctor" value={form.doctor_id} onChange={e => set('doctor_id')(e.target.value)}
            options={[{ value: '', label: '— No doctor —' }, ...doctors.map(d => ({ value: d.id, label: d.name }))]} />
        )}
        <Input label="Chief Complaint" value={form.chief_complaint} onChange={e => set('chief_complaint')(e.target.value)} placeholder="Main reason for visit" />
        <Textarea label="Clinical Notes" value={form.clinical_notes} onChange={e => set('clinical_notes')(e.target.value)} rows={3} />
        <Input label="Diagnosis" value={form.diagnosis} onChange={e => set('diagnosis')(e.target.value)} />
        <Textarea label="Treatment Plan" value={form.treatment_plan} onChange={e => set('treatment_plan')(e.target.value)} rows={2} />
        <Input label="Prescription" value={form.prescription} onChange={e => set('prescription')(e.target.value)} />

        {/* Visit details - Excel table inline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>Visit Details</label>
            <button type="button" onClick={addRow} className="text-xs font-600 hover:opacity-70" style={{ color: 'var(--color-brand)' }}>+ Add Row</button>
          </div>
          {form.visit_details.length > 0 && (
            <div className="rounded-lg border border-(--color-border) overflow-hidden" style={{ fontFamily: 'ui-monospace, monospace' }}>
              <div className="grid border-b border-(--color-border)" style={{ gridTemplateColumns: '1fr 1.5fr 32px', background: 'var(--color-surface-2)' }}>
                <span className="px-3 py-1.5 text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Detail</span>
                <span className="px-3 py-1.5 text-[10px] font-700 uppercase tracking-wider border-l border-(--color-border)" style={{ color: 'var(--color-text-muted)' }}>Value</span>
                <span />
              </div>
              {form.visit_details.map((r, i) => (
                <div key={i} className="grid border-b border-(--color-border) last:border-0"
                  style={{ gridTemplateColumns: '1fr 1.5fr 32px', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)' }}>
                  <input value={r.label} onChange={e => setRow(i, 'label', e.target.value)} placeholder="e.g. BP"
                    className="px-3 py-2 text-xs border-r border-(--color-border) outline-none bg-transparent"
                    style={{ color: 'var(--color-text-secondary)' }} />
                  <input value={r.value} onChange={e => setRow(i, 'value', e.target.value)} placeholder="e.g. 120/80"
                    className="px-3 py-2 text-xs outline-none bg-transparent"
                    style={{ color: 'var(--color-text-primary)' }} />
                  <button type="button" onClick={() => delRow(i)}
                    className="flex items-center justify-center border-l border-(--color-border) hover:bg-red-50 transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up required */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.follow_up_required} onChange={e => set('follow_up_required')(e.target.checked)}
              className="w-4 h-4" style={{ accentColor: 'var(--color-brand)' }} />
            <span className="text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Follow-up required</span>
          </label>
          {form.follow_up_required && (
            <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date')(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !form.consulted_at_date}>{saving ? 'Saving…' : 'Log Consultation'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Follow-ups tab panel ──────────────────────────────────────
function FollowupCard({ f, onComplete, onMiss, onReschedule }) {
  const [completing,   setCompleting]   = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [outcome,      setOutcome]      = useState('')
  const [nextType,     setNextType]     = useState('Call')
  const [nextDate,     setNextDate]     = useState('')
  const [scheduleNext, setScheduleNext] = useState(false)
  const [saving,       setSaving]       = useState(false)

  const Icon  = FU_TYPE_ICON[f.type]  || Bell
  const typeC = FU_TYPE_COLOR[f.type] || FU_TYPE_COLOR.Other
  const statC = FU_STATUS_STYLE[f.status] || FU_STATUS_STYLE.Scheduled
  const overdue = f.status === 'Scheduled' && isPast(new Date(f.scheduled_at))

  const handleComplete = async () => {
    setSaving(true)
    try {
      await onComplete(f.id, outcome, scheduleNext ? { type: nextType, scheduled_at: nextDate } : null)
      setCompleting(false)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleReschedule = async () => {
    if (!nextDate) return
    setSaving(true)
    try {
      await onReschedule(f.id, nextDate, nextType)
      setRescheduling(false)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: typeC.bg }}>
          <Icon size={16} style={{ color: typeC.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{f.type}</span>
            <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: statC.bg, color: statC.color }}>{f.status}</span>
            {overdue && f.status === 'Scheduled' && (
              <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#b91c1c' }}>Overdue</span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {format(new Date(f.scheduled_at), 'EEE, MMM d yyyy · h:mm a')}
          </p>
          {f.caller_name && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              <User size={11} /> {f.caller_name}
            </p>
          )}
          {f.notes && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{f.notes}</p>}
          {f.outcome && (
            <div className="mt-2 p-2.5 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
              <p className="text-[10px] font-600 uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Response / Outcome</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{f.outcome}</p>
            </div>
          )}
        </div>
        {!completing && !rescheduling && (
          <div className="flex gap-1.5 shrink-0">
            {f.status === 'Scheduled' && (
              <>
                <button onClick={() => setCompleting(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors"
                  style={{ background: '#dcfce7', color: '#15803d' }}>
                  <Check size={12} /> Done
                </button>
                <button onClick={() => { setRescheduling(true); setNextType(f.type); setNextDate('') }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                  style={{ color: 'var(--color-text-muted)' }}>
                  <RotateCcw size={11} /> Reschedule
                </button>
                <button onClick={() => onMiss(f.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-red-50"
                  style={{ borderColor: '#fecaca', color: '#b91c1c' }}>
                  <X size={11} /> Missed
                </button>
              </>
            )}
            {f.status === 'Missed' && (
              <button onClick={() => { setRescheduling(true); setNextType(f.type); setNextDate('') }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                style={{ color: 'var(--color-text-muted)' }}>
                <RotateCcw size={11} /> Reschedule
              </button>
            )}
          </div>
        )}
      </div>

      {completing && (
        <div className="border-t border-(--color-border) p-4 space-y-3" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>What happened?</p>
          <textarea rows={3} className="w-full px-3 py-2.5 text-sm rounded-lg border border-(--color-border) outline-none resize-none"
            style={{ background: 'var(--color-surface)' }}
            placeholder="Patient's response, what was discussed, next steps..."
            value={outcome} onChange={e => setOutcome(e.target.value)} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setScheduleNext(s => !s)}
              className="flex items-center gap-2 text-xs font-500 px-3 py-1.5 rounded-lg border transition-all"
              style={scheduleNext
                ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
              <Plus size={12} /> Schedule next follow-up
            </button>
          </div>
          {scheduleNext && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)' }}
                  value={nextType} onChange={e => setNextType(e.target.value)}>
                  {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Input label="Date & Time" type="datetime-local" value={nextDate} onChange={e => setNextDate(e.target.value)} />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCompleting(false)}>Cancel</Button>
            <Button size="sm" onClick={handleComplete} disabled={saving}>
              {saving ? 'Saving...' : <><Check size={13} /> Mark Complete</>}
            </Button>
          </div>
        </div>
      )}

      {rescheduling && (
        <div className="border-t border-(--color-border) p-4 space-y-3" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>Reschedule to</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)' }}
                value={nextType} onChange={e => setNextType(e.target.value)}>
                {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="New Date & Time *" type="datetime-local" value={nextDate} onChange={e => setNextDate(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" type="button" onClick={() => setRescheduling(false)}>Cancel</Button>
            <Button size="sm" onClick={handleReschedule} disabled={saving || !nextDate}>
              {saving ? 'Saving...' : <><RotateCcw size={13} /> Reschedule</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}


// ── Timeline with inline note ─────────────────────────────────
function TimelinePanel({ activities, setActivities, entity, orgId }) {
  const [adding, setAdding] = useState(false)
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!note.trim() || !entity) return
    setSaving(true)
    try {
      const row = await createActivity({
        organization_id: orgId,
        entity_type: entity.type,
        entity_id:   entity.id,
        type: 'note',
        body: note.trim(),
      })
      setActivities(prev => [row, ...prev])
      setNote('')
      setAdding(false)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {!adding && (
        <div className="flex justify-end">
          <Button size="sm" type="button" onClick={() => setAdding(true)}><Plus size={14} /> Add Note</Button>
        </div>
      )}
      {adding && (
        <form onSubmit={submit} className="space-y-2">
          <Textarea placeholder="Write a note…" rows={3} value={note} onChange={e => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => { setAdding(false); setNote('') }}>Cancel</Button>
            <Button size="sm" type="submit" disabled={saving || !note.trim()}>{saving ? 'Saving…' : 'Save Note'}</Button>
          </div>
        </form>
      )}
      <Timeline activities={activities} maxHeight="22rem" emptyText="No activity yet." />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function ConsultationDetailPage({ params }) {
  const { id } = use(params)
  const { orgId, org } = useOrg()
  const doctors = org?.settings?.doctors || []

  const [loading, setLoading]       = useState(true)
  const [entity, setEntity]         = useState(null)
  const [consultations, setConsultations] = useState([])
  const [appointments, setAppointments]   = useState([])
  const [tasks, setTasks]           = useState([])
  const [activities, setActivities] = useState([])
  const [followups, setFollowups]   = useState([])

  // right tab
  const [rightTab, setRightTab]     = useState('tasks')

  // modals / inline forms
  const [logConsultOpen, setLogConsultOpen] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [taskForm, setTaskForm]     = useState({ title: '', priority: 'Medium', due_date: '' })
  const [savingTask, setSavingTask] = useState(false)
  const [addingAppt, setAddingAppt] = useState(false)
  const [apptForm, setApptForm]     = useState({ date: '', time: '10:00', doctor_id: '', notes: '' })
  const [savingAppt, setSavingAppt] = useState(false)

  const [fuView,     setFuView]     = useState('regular')
  const [fuSort,     setFuSort]     = useState('added')
  const [fuSortOpen, setFuSortOpen] = useState(false)
  const [showFuForm, setShowFuForm] = useState(false)
  const [newFu,      setNewFu]      = useState({ type: 'Call', status_detail: '', scheduled_at: '', response: '', caller: '' })

  useEffect(() => {
    if (!orgId || !id) return
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        let ent = null
        const p = await getPatient(id).catch(() => null)
        if (p) ent = { type: 'patient', id, data: p }
        else {
          const l = await getLead(id).catch(() => null)
          if (l) ent = { type: 'lead', id, data: l }
        }
        if (!active) return
        setEntity(ent)
        if (!ent) { setLoading(false); return }

        const leadIds = ent.type === 'patient' ? (ent.data.leads || []).map(l => l.id) : []
        const allIds  = new Set([id, ...leadIds])
        const [ownCons, appts, ownActs, ownTasks, ownFups, leadConsList, leadActsList, leadTasksList, leadFupsList] = await Promise.all([
          getConsultations(ent.type === 'patient' ? { orgId, patientId: id } : { orgId, leadId: id }),
          getAppointments({ orgId }),
          getActivities(ent.type, id, orgId),
          getTasks({ entityType: ent.type, entityId: id, orgId }),
          getFollowups(ent.type === 'patient' ? { orgId, patientId: id } : { orgId, leadId: id }),
          Promise.all(leadIds.map(lid => getConsultations({ orgId, leadId: lid }))),
          Promise.all(leadIds.map(lid => getActivities('lead', lid, orgId))),
          Promise.all(leadIds.map(lid => getTasks({ entityType: 'lead', entityId: lid, orgId }))),
          Promise.all(leadIds.map(lid => getFollowups({ orgId, leadId: lid }))),
        ])
        if (!active) return

        setConsultations([...(ownCons || []), ...leadConsList.flat()]
          .reduce((acc, c) => acc.some(x => x.id === c.id) ? acc : [...acc, c], [])
          .sort((a, b) => new Date(b.consulted_at) - new Date(a.consulted_at)))
        setAppointments((appts || []).filter(a => allIds.has(a.patient_id) || allIds.has(a.lead_id)))
        setActivities([...(ownActs || []), ...leadActsList.flat()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
        setTasks([...(ownTasks || []), ...leadTasksList.flat()].reduce((acc, t) => acc.some(x => x.id === t.id) ? acc : [...acc, t], []))
        setFollowups([...(ownFups || []), ...leadFupsList.flat()]
          .reduce((acc, f) => acc.some(x => x.id === f.id) ? acc : [...acc, f], [])
          .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)))
      } catch { /* ignore */ }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [orgId, id])

  const handleAddTask = async e => {
    e.preventDefault()
    if (!taskForm.title.trim() || !entity) return
    setSavingTask(true)
    try {
      const t = await createTask({ ...taskForm, organization_id: orgId, entity_type: entity.type, entity_id: id, status: 'Pending' })
      setTasks(prev => [t, ...prev]); setTaskForm({ title: '', priority: 'Medium', due_date: '' }); setAddingTask(false)
    } catch (err) { alert(err.message) } finally { setSavingTask(false) }
  }
  const handleToggleTask = async task => {
    try {
      const u = await updateTask(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })
      setTasks(prev => prev.map(t => t.id === task.id ? u : t))
    } catch (err) { alert(err.message) }
  }
  const handleBookAppt = async e => {
    e.preventDefault()
    if (!apptForm.date || !entity) return
    setSavingAppt(true)
    try {
      const scheduledAt = new Date(`${apptForm.date}T${apptForm.time || '10:00'}:00`)
      const appt = await createAppointment({
        organization_id: orgId,
        patient_id: entity.type === 'patient' ? id : null,
        lead_id:    entity.type === 'lead'    ? id : null,
        doctor_id: apptForm.doctor_id || null,
        scheduled_at: scheduledAt.toISOString(),
        notes: apptForm.notes || null,
        status: 'booked',
      })
      setAppointments(prev => [appt, ...prev]); setApptForm({ date: '', time: '10:00', doctor_id: '', notes: '' }); setAddingAppt(false)
    } catch (err) { alert(err.message) } finally { setSavingAppt(false) }
  }
  const handleApptStatus = async (aid, status) => {
    try {
      const u = await updateAppointment(aid, { status })
      setAppointments(prev => prev.map(a => a.id === aid ? { ...a, status: u.status } : a))
    } catch (err) { alert(err.message) }
  }

  const handleScheduleFollowup = async (e) => {
    e.preventDefault()
    if (!newFu.scheduled_at || !newFu.status_detail || !orgId) return
    try {
      const isFut = new Date(newFu.scheduled_at).getTime() > Date.now()
      const f = await createFollowup({
        type: newFu.type,
        scheduled_at: new Date(newFu.scheduled_at).toISOString(),
        notes: newFu.response || null,
        outcome: newFu.status_detail,
        caller_name: newFu.caller || null,
        status: isFut ? 'Scheduled' : 'Completed',
        organization_id: orgId,
        lead_id:    entity.type === 'lead'    ? id : null,
        patient_id: entity.type === 'patient' ? id : null,
      })
      setFollowups(prev => [f, ...prev])
      setShowFuForm(false)
      setNewFu({ type: 'Call', status_detail: '', scheduled_at: '', response: '', caller: '' })
    } catch (err) { alert(err.message) }
  }

  const handleCompleteFollowup = async (fuId, outcome, next) => {
    try {
      const updated = await updateFollowup(fuId, { status: 'Completed', outcome: outcome || null })
      setFollowups(prev => prev.map(f => f.id === fuId ? updated : f))
      if (next?.scheduled_at) {
        const nf = await createFollowup({
          type: next.type, scheduled_at: next.scheduled_at, organization_id: orgId,
          status: 'Scheduled',
          lead_id:    entity.type === 'lead'    ? id : null,
          patient_id: entity.type === 'patient' ? id : null,
        })
        setFollowups(prev => [nf, ...prev])
      }
    } catch (err) { alert(err.message) }
  }

  const handleMissFollowup = async (fuId) => {
    try {
      const updated = await updateFollowup(fuId, { status: 'Missed' })
      setFollowups(prev => prev.map(f => f.id === fuId ? updated : f))
    } catch (err) { alert(err.message) }
  }

  const handleRescheduleFollowup = async (fuId, newDate, newType) => {
    try {
      const updated = await updateFollowup(fuId, { status: 'Rescheduled', scheduled_at: newDate, type: newType })
      setFollowups(prev => prev.map(f => f.id === fuId ? updated : f))
    } catch (err) { alert(err.message) }
  }

  const handleFollowupField = async (fuId, patch) => {
    const prev = followups.find(f => f.id === fuId)
    setFollowups(list => list.map(f => f.id === fuId ? { ...f, ...patch } : f))
    try {
      const updated = await updateFollowup(fuId, patch)
      setFollowups(list => list.map(f => f.id === fuId ? updated : f))
    } catch (err) {
      setFollowups(list => list.map(f => f.id === fuId ? prev : f))
      alert(err.message)
    }
  }

  const handleCreateFollowupInline = async (patch) => {
    if (!orgId) return
    try {
      const scheduled_at = patch.scheduled_at || new Date().toISOString()
      const isFut = new Date(scheduled_at).getTime() > Date.now()
      const f = await createFollowup({
        type: patch.type || 'Call',
        scheduled_at,
        notes: patch.notes ?? null,
        outcome: patch.outcome ?? null,
        caller_name: patch.caller_name ?? null,
        status: patch.status || (isFut ? 'Scheduled' : 'Completed'),
        organization_id: orgId,
        lead_id:    entity.type === 'lead'    ? id : null,
        patient_id: entity.type === 'patient' ? id : null,
      })
      setFollowups(prev => [f, ...prev])
    } catch (err) { alert(err.message) }
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Spinner size={32} /></div>
  if (!entity)  return <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Not found</div>

  const d = entity.data
  const isPatient = entity.type === 'patient'
  const name   = isPatient ? `${d.first_name} ${d.last_name || ''}`.trim() : ([d.first_name, d.last_name].filter(Boolean).join(' ') || d.title)
  const phone  = d.phone || d.contacts?.phone || null
  const email  = d.email || d.contacts?.email || null
  const detail = isPatient ? (d.status || 'Active') : (d.stage || 'New')
  const stages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s, color: '#6366f1' } : s)
  const detailColor = isPatient ? (detail === 'Active' ? '#15803d' : '#b91c1c') : (stages.find(s => s.name === detail)?.color || '#6366f1')
  const history = isPatient && Array.isArray(d.medical_history) ? d.medical_history : []

  const RIGHT_TABS = [
    { id: 'tasks',    label: 'Tasks',    icon: CheckSquare, count: tasks.filter(t => t.status !== 'Completed').length },
    { id: 'timeline', label: 'Timeline', icon: Clock,       count: null },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-3.5 border-b border-(--color-border) flex items-center justify-between" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/consultation" className="flex items-center gap-1 text-sm hover:opacity-60 transition-opacity shrink-0" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={15} /> Consultations
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{name}</span>
        </div>
        <Button size="sm" onClick={() => setLogConsultOpen(true)}><Plus size={14} /> Log Consultation</Button>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5 items-start">

          {/* ── LEFT ── */}
          <div className="space-y-4 min-w-0">

            {/* Profile */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={name} size="lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-700" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full"
                      style={isPatient ? { background: '#dcfce7', color: '#15803d' } : { background: '#dbeafe', color: '#1d4ed8' }}>
                      {isPatient ? <UserRound size={10} /> : <TrendingUp size={10} />}{isPatient ? 'Patient' : 'Lead'}
                    </span>
                    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: detailColor + '20', color: detailColor }}>{detail}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                    {phone && <span className="flex items-center gap-1"><Phone size={12} />{phone}</span>}
                    {email && <span className="flex items-center gap-1"><Mail size={12} />{email}</span>}
                  </div>
                </div>
                <Link href={isPatient ? `/patients/${id}` : `/leads/${id}`}
                  className="ml-auto text-xs font-600 shrink-0 hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-brand)' }}>View full profile →</Link>
              </div>
            </Card>

            {/* Consultations */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Stethoscope size={13} style={{ color: 'var(--color-brand)' }} />
                  <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    Consultations <span style={{ color: 'var(--color-text-primary)' }}>({consultations.length})</span>
                  </p>
                </div>
                <Button size="sm" type="button" onClick={() => setLogConsultOpen(true)}><Plus size={14} /> New</Button>
              </div>
              {consultations.length === 0 ? (
                <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
                  <Stethoscope size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No consultations logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-150 overflow-y-auto pr-1">
                  {consultations.map(c => <ConsultationRecord key={c.id} c={c} doctors={doctors} />)}
                </div>
              )}
            </Card>

            {/* Follow-ups */}
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-2.5">
                  <p className="text-xs font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Follow-ups</p>
                  <div className="flex items-center gap-0.5">
                    {[{ id: 'regular', Icon: List, title: 'Regular view' }, { id: 'table', Icon: Table2, title: 'Table view' }].map(({ id: vId, Icon, title }) => (
                      <button key={vId} type="button" title={title} onClick={() => setFuView(vId)}
                        className="p-1.5 rounded-md transition-all"
                        style={fuView === vId
                          ? { background: 'var(--color-brand)', color: 'white' }
                          : { color: 'var(--color-text-muted)' }}>
                        <Icon size={14} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fuView === 'table' && (
                    <div className="relative">
                      <button type="button" title="Sort" onClick={() => setFuSortOpen(o => !o)}
                        className="p-1.5 rounded-md border border-(--color-border) transition-colors hover:bg-(--color-surface)"
                        style={{ color: 'var(--color-text-muted)' }}>
                        <ArrowUpDown size={14} />
                      </button>
                      {fuSortOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setFuSortOpen(false)} />
                          <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-(--color-border) py-1"
                            style={{ background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                            {[
                              { id: 'added',         label: 'Date added' },
                              { id: 'modified_desc', label: 'Last modified — newest first' },
                              { id: 'modified_asc',  label: 'Last modified — oldest first' },
                            ].map(o => (
                              <button key={o.id} type="button" onClick={() => { setFuSort(o.id); setFuSortOpen(false) }}
                                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-(--color-surface-2)"
                                style={{ color: 'var(--color-text-primary)' }}>
                                {o.label}
                                {fuSort === o.id && <Check size={13} style={{ color: 'var(--color-brand)' }} />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {!showFuForm && fuView === 'regular' && (
                    <Button size="sm" onClick={() => setShowFuForm(true)}><Plus size={14} /> Add Follow-up</Button>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-3">
                {showFuForm && fuView === 'regular' && (
                  <form onSubmit={handleScheduleFollowup} className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
                    <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>Add Follow-up</p>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {FOLLOWUP_TYPES.map(t => (
                          <button key={t} type="button" onClick={() => setNewFu(f => ({ ...f, type: t, status_detail: '' }))}
                            className="px-3 py-1.5 rounded-full text-[11px] font-600 border transition-all"
                            style={newFu.type === t
                              ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                              : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Select
                      label="Status *"
                      value={newFu.status_detail}
                      onChange={e => setNewFu(f => ({ ...f, status_detail: e.target.value }))}
                      options={[
                        { value: '', label: 'Select status' },
                        ...(FOLLOWUP_STATUS_OPTIONS[newFu.type] || []).map(s => ({ value: s, label: s })),
                      ]}
                    />
                    <div className="grid grid-cols-2 gap-3 items-start">
                      <Input label="Date & Time *" type="datetime-local" value={newFu.scheduled_at}
                        onChange={e => setNewFu(f => ({ ...f, scheduled_at: e.target.value }))} />
                      <div className="space-y-1.5">
                        <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>
                          Called By <span className="font-400" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                          value={newFu.caller} onChange={e => setNewFu(f => ({ ...f, caller: e.target.value }))}>
                          <option value="">— Select —</option>
                          {(org?.settings?.staff_members || []).map(m => (
                            <option key={m.id} value={m.name}>{m.name}{m.designation ? ` (${m.designation})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Textarea label="Response" placeholder="Patient/customer response..." value={newFu.response}
                      onChange={e => setNewFu(f => ({ ...f, response: e.target.value }))} rows={2} />
                    <div className="flex gap-2 justify-end pt-1 border-t border-(--color-border)">
                      <Button variant="secondary" size="sm" type="button"
                        onClick={() => { setShowFuForm(false); setNewFu({ type: 'Call', status_detail: '', scheduled_at: '', response: '', caller: '' }) }}>
                        Cancel
                      </Button>
                      <Button size="sm" type="submit" disabled={!newFu.scheduled_at || !newFu.status_detail}>
                        <Bell size={13} /> Save
                      </Button>
                    </div>
                  </form>
                )}
                {fuView === 'table' ? (
                  <div className="-mx-3 -mb-3 max-h-150 overflow-y-auto">
                    <FollowupTable
                      followups={followups}
                      staff={org?.settings?.staff_members || []}
                      onField={handleFollowupField}
                      onCreate={handleCreateFollowupInline}
                      statusStyle={FU_STATUS_STYLE}
                      typeStyle={FU_TYPE_COLOR}
                      types={FOLLOWUP_TYPES}
                      outcomeOptions={(t) => FOLLOWUP_STATUS_OPTIONS[t] || []}
                      sort={fuSort}
                    />
                  </div>
                ) : followups.length === 0 ? (
                  <div className="-mx-3 -mb-3 py-16 text-center border-t border-(--color-border)">
                    <PhoneCall size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No follow-ups scheduled yet.</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Schedule a call, WhatsApp, or email to keep this moving.</p>
                  </div>
                ) : (
                  <div className="-mx-3 -mb-3 px-2 py-3 space-y-2 max-h-150 overflow-y-auto border-t border-(--color-border)">
                    {[...followups].sort((a, b) => {
                      const order = { Scheduled: 0, Missed: 1, Rescheduled: 2, Completed: 3 }
                      return (order[a.status] ?? 9) - (order[b.status] ?? 9)
                    }).map(f => (
                      <FollowupCard
                        key={f.id}
                        f={f}
                        onComplete={handleCompleteFollowup}
                        onMiss={handleMissFollowup}
                        onReschedule={handleRescheduleFollowup}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Medical History — patients only */}
            {isPatient && (
              <Card className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <History size={13} style={{ color: 'var(--color-brand)' }} />
                  <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Medical History</p>
                </div>
                {history.length === 0 ? (
                  <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
                    <History size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No medical records yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {history.map((rec, i) => (
                      <div key={i} className="p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                        <p className="text-[10px] font-600 uppercase mb-0.5" style={{ color: 'var(--color-brand)' }}>
                          {rec.date ? format(new Date(rec.date), 'MMM d, yyyy') : '—'}
                        </p>
                        <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{rec.diagnosis}</p>
                        {rec.treatment && <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{rec.treatment}</p>}
                        {rec.notes    && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{rec.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Appointments */}
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} style={{ color: 'var(--color-brand)' }} />
                  <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    Appointments <span style={{ color: 'var(--color-text-primary)' }}>({appointments.length})</span>
                  </p>
                </div>
                {!addingAppt && <Button size="sm" type="button" onClick={() => setAddingAppt(true)}><Plus size={14} /> Book</Button>}
              </div>
              <div className="p-3 space-y-2">
                {addingAppt && (
                  <form onSubmit={handleBookAppt} className="p-3 rounded-xl border border-(--color-border) space-y-2.5" style={{ background: 'var(--color-surface-2)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-500" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
                        <input type="date" required value={apptForm.date} onChange={e => setApptForm(f => ({ ...f, date: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-500" style={{ color: 'var(--color-text-secondary)' }}>Time</label>
                        <input type="time" value={apptForm.time} onChange={e => setApptForm(f => ({ ...f, time: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    {doctors.length > 0 && (
                      <select value={apptForm.doctor_id} onChange={e => setApptForm(f => ({ ...f, doctor_id: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                        <option value="">— Doctor (optional) —</option>
                        {doctors.map(dd => <option key={dd.id} value={dd.id}>{dd.name}</option>)}
                      </select>
                    )}
                    <Textarea label="Notes" value={apptForm.notes} onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" type="button" onClick={() => setAddingAppt(false)}>Cancel</Button>
                      <Button size="sm" type="submit" disabled={savingAppt || !apptForm.date}>{savingAppt ? 'Booking…' : 'Book'}</Button>
                    </div>
                  </form>
                )}

                {appointments.length === 0 && !addingAppt ? (
                  <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
                    <Calendar size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No appointments yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...appointments].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)).map(appt => {
                      const ST = { booked: { bg: '#dbeafe', color: '#1d4ed8' }, confirmed: { bg: '#dcfce7', color: '#15803d' }, completed: { bg: '#f3f4f6', color: '#374151' }, cancelled: { bg: '#fee2e2', color: '#b91c1c' } }
                      const st  = ST[appt.status] || ST.booked
                      const doc = appt.doctor_id ? doctors.find(x => x.id === appt.doctor_id) : null
                      const canAct = appt.status === 'booked' || appt.status === 'confirmed'
                      return (
                        <div key={appt.id} className="flex items-start gap-3 p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                            <Calendar size={14} style={{ color: 'var(--color-brand)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{format(new Date(appt.scheduled_at), 'EEE, MMM d · h:mm a')}</span>
                              <span className="text-[10px] font-600 px-2 py-0.5 rounded-full capitalize" style={{ background: st.bg, color: st.color }}>{appt.status}</span>
                            </div>
                            {doc && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{doc.name}{doc.department ? ` · ${doc.department}` : ''}</p>}
                            {appt.notes && <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{appt.notes}</p>}
                            {canAct && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <button type="button" onClick={() => handleApptStatus(appt.id, 'completed')}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600"
                                  style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                                  <Check size={11} /> Complete
                                </button>
                                <button type="button" onClick={() => handleApptStatus(appt.id, 'cancelled')}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border"
                                  style={{ borderColor: '#fecaca', color: '#b91c1c' }}>
                                  <X size={11} /> Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-4 sticky top-16">
            <Card className="border-(--color-border) overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                {RIGHT_TABS.map(tab => (
                  <button key={tab.id} type="button" onClick={() => setRightTab(tab.id)}
                    className={clsx('flex items-center gap-1.5 px-4 py-3 text-xs font-600 border-b-2 flex-1 justify-center transition-colors',
                      rightTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent hover:bg-(--color-brand-50)')}
                    style={rightTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}>
                    <tab.icon size={13} />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full"
                        style={rightTab === tab.id
                          ? { background: 'var(--color-brand)', color: 'white' }
                          : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {/* Tasks */}
                {rightTab === 'tasks' && (
                  <div className="space-y-3">
                    {!addingTask && (
                      <div className="flex justify-end">
                        <Button size="sm" type="button" onClick={() => setAddingTask(true)}><Plus size={14} /> New Task</Button>
                      </div>
                    )}
                    {addingTask && (
                      <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-(--color-border) space-y-2.5" style={{ background: 'var(--color-surface-2)' }}>
                        <Input label="Task *" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required />
                        <div className="grid grid-cols-2 gap-2">
                          <Select label="Priority" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                            options={['Low','Medium','High','Urgent'].map(p => ({ value: p, label: p }))} />
                          <Input label="Due" type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" type="button" onClick={() => setAddingTask(false)}>Cancel</Button>
                          <Button size="sm" type="submit" disabled={savingTask || !taskForm.title.trim()}>{savingTask ? 'Adding…' : 'Add Task'}</Button>
                        </div>
                      </form>
                    )}
                    {tasks.length === 0 && !addingTask ? (
                      <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
                        <CheckSquare size={22} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No tasks yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {tasks.map(task => (
                          <div key={task.id} className={clsx('flex items-start gap-2.5 p-3 rounded-xl border border-(--color-border)', task.status === 'Completed' && 'opacity-50')} style={{ background: 'var(--color-surface-2)' }}>
                            <input type="checkbox" checked={task.status === 'Completed'} onChange={() => handleToggleTask(task)} className="mt-0.5 w-4 h-4 cursor-pointer shrink-0" style={{ accentColor: 'var(--color-brand)' }} />
                            <div className="flex-1 min-w-0">
                              <p className={clsx('text-xs font-500', task.status === 'Completed' && 'line-through')} style={{ color: 'var(--color-text-primary)' }}>{task.title}</p>
                              {task.due_date && <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Clock size={10} />{format(new Date(task.due_date), 'MMM d, h:mm a')}</p>}
                            </div>
                            <span className="text-[9px] font-600 px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>{task.priority}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                {rightTab === 'timeline' && (
                  <TimelinePanel activities={activities} setActivities={setActivities} entity={entity} orgId={orgId} />
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Inline Log Consultation modal */}
      <LogConsultationModal
        open={logConsultOpen}
        onClose={() => setLogConsultOpen(false)}
        entity={entity}
        orgId={orgId}
        doctors={doctors}
        onCreated={row => setConsultations(prev => [row, ...prev])}
      />
    </div>
  )
}
