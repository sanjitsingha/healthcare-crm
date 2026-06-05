'use client'
import { useEffect, useState, use, useRef } from 'react'
import {
  ArrowLeft, Edit2, Trash2, Plus, Phone, Mail, MapPin, User,
  Calendar, Clock, CheckSquare, Bell, Tag, TrendingUp,
  MessageSquare, Check, X, RotateCcw, AlertCircle, PhoneCall, ChevronLeft, ChevronRight, ChevronDown, Search,
} from 'lucide-react'
import { Button, Card, Modal, Input, Select, Textarea, Spinner } from '@/components/ui'
import {
  getLead, updateLead, deleteLead,
  getActivities, createActivity,
  getTasks, createTask, updateTask,
  getFollowups, createFollowup, updateFollowup,
  createPatient, createAppointment, getAppointments, updateAppointment,
  getTags, assignTagToLead, removeTagFromLead,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Timeline from '@/components/crm/Timeline'
import { matchingRules } from '@/lib/rulesEngine'
import { format, formatDistanceToNow, isPast, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isSameMonth, subDays } from 'date-fns'
import clsx from 'clsx'

// ── Constants ──────────────────────────────────────────────────
const DEFAULT_LEAD_STAGES = [
  { name: 'New',        color: '#6366f1' },
  { name: 'Contacted',  color: '#0ea5e9' },
  { name: 'Interested', color: '#f59e0b' },
  { name: 'Follow-up',  color: '#8b5cf6' },
  { name: 'Converted',  color: '#10b981' },
  { name: 'Lost',       color: '#ef4444' },
]

const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email']

const FOLLOWUP_STATUS_OPTIONS = {
  Call: ['Not Connected', 'Switched Off', 'Busy', 'Not Reachable', 'Connected - Interested', 'Connected - Not Interested', 'Connected - Callback Requested', 'Wrong Number'],
  WhatsApp: ['Sent - No Reply', 'Delivered - No Reply', 'Seen - No Reply', 'Replied - Interested', 'Replied - Not Interested', 'Replied - Callback Requested', 'Number Not on WhatsApp'],
  Email: ['Sent - No Reply', 'Bounced', 'Opened - No Reply', 'Replied - Interested', 'Replied - Not Interested', 'Replied - Callback Requested'],
}

const TYPE_ICON = {
  Call:        Phone,
  WhatsApp:    MessageSquare,
  Email:       Mail,
  Meeting:     Calendar,
  'Site Visit': MapPin,
  Other:       Bell,
}

const TYPE_COLOR = {
  Call:        { bg: '#dbeafe', color: '#1d4ed8' },
  WhatsApp:    { bg: '#dcfce7', color: '#15803d' },
  Email:       { bg: '#fce7f3', color: '#be185d' },
  Meeting:     { bg: '#f3e8ff', color: '#7c3aed' },
  'Site Visit': { bg: '#fef3c7', color: '#b45309' },
  Other:       { bg: '#f3f4f6', color: '#374151' },
}

const STATUS_STYLE = {
  Scheduled:   { bg: '#fef3c7', color: '#b45309' },
  Completed:   { bg: '#dcfce7', color: '#15803d' },
  Missed:      { bg: '#fee2e2', color: '#b91c1c' },
  Rescheduled: { bg: '#f3e8ff', color: '#7c3aed' },
}

const ACTIVITY_ICON = {
  comment:       MessageSquare,
  call:          Phone,
  email:         Mail,
  meeting:       Calendar,
  note:          Edit2,
  status_change: Tag,
  whatsapp:      MessageSquare,
}

// ── Custom field components (unchanged) ─────────────────────
function CustomFieldInput({ field, value, onChange }) {
  if (field.type === 'textarea')
    return <Textarea label={field.label} value={value || ''} onChange={e => onChange(e.target.value)} rows={2} />
  if (field.type === 'select') {
    const opts = (field.options || '').split(',').map(s => s.trim()).filter(Boolean)
    return (
      <Select label={field.label} value={value || ''} onChange={e => onChange(e.target.value)}
        options={[{ value: '', label: 'Select...' }, ...opts.map(o => ({ value: o, label: o }))]} />
    )
  }
  if (field.type === 'boolean') return (
    <div className="space-y-1.5">
      <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{field.label}</label>
      <div className="flex gap-2">
        {['Yes', 'No'].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className="flex-1 py-1.5 rounded-lg text-xs font-500 border transition-all"
            style={value === opt
              ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
              : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
          >{opt}</button>
        ))}
      </div>
    </div>
  )
  const typeMap = { phone: 'tel', email: 'email', number: 'number', date: 'date', text: 'text' }
  return <Input label={field.label} type={typeMap[field.type] || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} />
}

function CustomModuleCard({ module, data, onSave }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues]   = useState({ ...data })
  const [saving, setSaving]   = useState(false)
  const handleSave = async () => {
    setSaving(true)
    try { await onSave(values); setEditing(false) }
    catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }
  return (
    <Card className="p-5 border-(--color-border)">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{module.name}</p>
        {!editing && (
          <button onClick={() => { setValues({ ...data }); setEditing(true) }}
            className="text-xs font-500 px-2.5 py-1 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-brand-50)"
            style={{ color: 'var(--color-brand)' }}
          ><Edit2 size={12} className="inline mr-1" />Edit</button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          {module.fields.map(f => (
            <CustomFieldInput key={f.id} field={f} value={values[f.id]} onChange={v => setValues(p => ({ ...p, [f.id]: v }))} />
          ))}
          <div className="flex gap-2 justify-end pt-2 border-t border-(--color-border)">
            <Button variant="secondary" size="sm" type="button" onClick={() => { setValues({ ...data }); setEditing(false) }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      ) : Object.values(data).some(Boolean) ? (
        <div className="space-y-2">
          {module.fields.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-4">
              <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>{f.label}</span>
              <span className="text-xs font-500 text-right truncate" style={{ color: 'var(--color-text-primary)' }}>{data[f.id] || '—'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data filled yet. Click Edit to fill.</p>
      )}
    </Card>
  )
}

function CustomDateTimePicker({ value, onChange, label = 'Date & Time *' }) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(value) : new Date()
  const [month, setMonth] = useState(startOfMonth(selected))

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = []
  let pointer = gridStart
  while (pointer <= gridEnd) {
    days.push(pointer)
    pointer = new Date(pointer.getFullYear(), pointer.getMonth(), pointer.getDate() + 1)
  }

  const setDatePart = (date) => {
    const next = new Date(date)
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
    onChange(next.toISOString())
  }

  const setTimePart = (key, val) => {
    const next = new Date(selected)
    if (key === 'hour') next.setHours(Number(val))
    if (key === 'minute') next.setMinutes(Number(val))
    onChange(next.toISOString())
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full px-3 py-2 rounded-lg border text-left text-sm"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        >
          {format(selected, 'MMM d, yyyy · h:mm a')}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div
              className="absolute top-full left-0 mt-1.5 w-68 rounded-xl border p-3 space-y-3 z-20"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <button type="button" className="p-1 rounded hover:bg-(--color-surface-2)" onClick={() => setMonth(m => subMonths(m, 1))}><ChevronLeft size={15} /></button>
                <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{format(month, 'MMMM yyyy')}</p>
                <button type="button" className="p-1 rounded hover:bg-(--color-surface-2)" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight size={15} /></button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-[11px] text-center">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <span key={day} style={{ color: 'var(--color-text-muted)' }}>{day}</span>
                ))}
                {days.map((day, i) => {
                  const active = isSameDay(day, selected)
                  const inMonth = isSameMonth(day, month)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDatePart(day)}
                      className="py-1.5 rounded text-xs"
                      style={active
                        ? { background: 'var(--color-brand)', color: 'white' }
                        : { color: inMonth ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2">
                <select value={selected.getHours()} onChange={e => setTimePart('hour', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                  {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
                </select>
                <span style={{ color: 'var(--color-text-muted)' }}>:</span>
                <select value={selected.getMinutes()} onChange={e => setTimePart('minute', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                  {Array.from({ length: 60 }).map((_, m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
                <Button type="button" variant="secondary" size="sm" onClick={() => onChange(new Date().toISOString())}>Now</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Date-only picker (same absolute pattern as CustomDateTimePicker) ─────────
function CustomDatePicker({ value, onChange, label = 'Date *' }) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(value) : new Date()
  const [month, setMonth] = useState(startOfMonth(selected))

  const monthStart = startOfMonth(month)
  const monthEnd   = endOfMonth(month)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 1 })

  const days = []
  let pointer = gridStart
  while (pointer <= gridEnd) {
    days.push(pointer)
    pointer = new Date(pointer.getFullYear(), pointer.getMonth(), pointer.getDate() + 1)
  }

  const selectDate = (date) => {
    const next = new Date(date)
    next.setHours(12, 0, 0, 0)
    onChange(next.toISOString())
    setOpen(false)
  }

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full px-3 py-2 rounded-lg border text-left text-sm"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
        >
          {value ? format(selected, 'EEE, MMM d yyyy') : 'Select date'}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div
              className="absolute top-full left-0 mt-1.5 w-68 rounded-xl border p-3 space-y-3 z-20"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <button type="button" className="p-1 rounded hover:bg-(--color-surface-2)" onClick={() => setMonth(m => subMonths(m, 1))}><ChevronLeft size={15} /></button>
                <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{format(month, 'MMMM yyyy')}</p>
                <button type="button" className="p-1 rounded hover:bg-(--color-surface-2)" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight size={15} /></button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-[11px] text-center">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                  <span key={d} style={{ color: 'var(--color-text-muted)' }}>{d}</span>
                ))}
                {days.map((day, i) => {
                  const active = value && isSameDay(day, selected)
                  const inMonth = isSameMonth(day, month)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectDate(day)}
                      className="py-1.5 rounded text-xs"
                      style={active
                        ? { background: 'var(--color-brand)', color: 'white' }
                        : { color: inMonth ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Follow-up card ─────────────────────────────────────────────
function FollowupCard({ f, onComplete, onMiss, onReschedule }) {
  const [completing, setCompleting]   = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [outcome,      setOutcome]    = useState('')
  const [nextType,     setNextType]   = useState('Call')
  const [nextDate,     setNextDate]   = useState('')
  const [scheduleNext, setScheduleNext] = useState(false)
  const [saving, setSaving]           = useState(false)

  const Icon  = TYPE_ICON[f.type]  || Bell
  const typeC = TYPE_COLOR[f.type] || TYPE_COLOR.Other
  const statC = STATUS_STYLE[f.status] || STATUS_STYLE.Scheduled
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
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: typeC.bg }}>
          <Icon size={16} style={{ color: typeC.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{f.type}</span>
            <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: statC.bg, color: statC.color }}>
              {f.status}
            </span>
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

        {/* Action buttons */}
        {!completing && !rescheduling && (
          <div className="flex gap-1.5 shrink-0">
            {f.status === 'Scheduled' && (
              <>
                <button onClick={() => setCompleting(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors"
                  style={{ background: '#dcfce7', color: '#15803d' }}
                >
                  <Check size={12} /> Done
                </button>
                <button onClick={() => { setRescheduling(true); setNextType(f.type); setNextDate('') }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <RotateCcw size={11} /> Reschedule
                </button>
                <button onClick={() => onMiss(f.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-red-50"
                  style={{ borderColor: '#fecaca', color: '#b91c1c' }}
                >
                  <X size={11} /> Missed
                </button>
              </>
            )}
            {f.status === 'Missed' && (
              <button onClick={() => { setRescheduling(true); setNextType(f.type); setNextDate('') }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <RotateCcw size={11} /> Reschedule
              </button>
            )}
          </div>
        )}
      </div>

      {/* Outcome form (inline) */}
      {completing && (
        <div className="border-t border-(--color-border) p-4 space-y-3" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>What happened?</p>
          <textarea
            rows={3}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-(--color-border) outline-none resize-none"
            style={{ background: 'var(--color-surface)' }}
            placeholder={`Patient's response, what was discussed, next steps...`}
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
          />

          {/* Schedule next toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScheduleNext(s => !s)}
              className="flex items-center gap-2 text-xs font-500 px-3 py-1.5 rounded-lg border transition-all"
              style={scheduleNext
                ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
            >
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

      {/* Reschedule form (inline) */}
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

// ── Main page ──────────────────────────────────────────────────
export default function LeadDetailPage({ params }) {
  const { id }         = use(params)
  const router         = useRouter()
  const { orgId, org } = useOrg()

  const [lead,       setLead]       = useState(null)
  const [activities, setActivities] = useState([])
  const [tasks,      setTasks]      = useState([])
  const [followups,  setFollowups]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('tasks')

  const [changingStage,  setChangingStage]  = useState(false)
  const [assigningLead,  setAssigningLead]  = useState(false)
  const [editOpen,  setEditOpen]  = useState(false)
  const [editForm,  setEditForm]  = useState({})
  const [taskOpen,  setTaskOpen]  = useState(false)
  const [newTask,   setNewTask]   = useState({ title: '', priority: 'Medium', due_date: '' })
  const [showFuForm,   setShowFuForm]   = useState(false)
  const [newFu,        setNewFu]        = useState({ type: 'Call', status_detail: '', scheduled_at: '', response: '', caller: '' })
  const [appointments,    setAppointments]    = useState([])
  const [showBookForm,    setShowBookForm]    = useState(false)
  const [newAppt,         setNewAppt]         = useState({ date: '', name: '', phone: '', notes: '', doctor_id: '' })
  const [bookingSaving,   setBookingSaving]   = useState(false)
  const [reschedulingId,  setReschedulingId]  = useState(null)
  const [rescheduleDate,  setRescheduleDate]  = useState('')
  const [rescheduleSaving, setRescheduleSaving] = useState(false)
  const [availableTags, setAvailableTags] = useState([])
  const [addingTag, setAddingTag]   = useState(false)
  const [tagSearch, setTagSearch]   = useState('')
  const tagBtnRef = useRef(null)
  const [tagMenuPos, setTagMenuPos] = useState({ top: 0, left: 0 })

  const logActivity = (type, content) =>
    orgId && createActivity({ organization_id: orgId, entity_type: 'lead', entity_id: id, type, content })

  const refreshActivities = async () =>
    setActivities(await getActivities('lead', id, orgId))

  const loadAll = async () => {
    setLoading(true)
    try {
      const l = await getLead(id)
      const pid = l?.patient_id || null   // linked patient (after conversion)
      const allIds = new Set([id, pid].filter(Boolean))

      const [a, t, f, appts, pa, pt, pf] = await Promise.all([
        getActivities('lead', id, orgId),
        getTasks({ entityType: 'lead', entityId: id, orgId }),
        getFollowups({ leadId: id, orgId }),
        getAppointments({ orgId }),
        pid ? getActivities('patient', pid, orgId)            : Promise.resolve([]),
        pid ? getTasks({ entityType: 'patient', entityId: pid, orgId }) : Promise.resolve([]),
        pid ? getFollowups({ patientId: pid, orgId })         : Promise.resolve([]),
      ])

      const mergedActs = [...(a || []), ...(pa || [])].sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
      const mergedTasks = [...(t || []), ...(pt || [])].reduce((acc, x) => acc.some(y => y.id === x.id) ? acc : [...acc, x], [])
      const mergedFus  = [...(f || []), ...(pf || [])].reduce((acc, x) => acc.some(y => y.id === x.id) ? acc : [...acc, x], [])

      setLead(l)
      setActivities(mergedActs)
      setTasks(mergedTasks)
      setFollowups(mergedFus)
      setAppointments((appts || []).filter(ap => allIds.has(ap.lead_id) || allIds.has(ap.patient_id)))
      try { setAvailableTags(await getTags(orgId, 'leads') || []) } catch { setAvailableTags([]) }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  // ── Tag handlers ──
  const linkedTagIds = (lead?.tags || []).map(t => t.tags?.id).filter(Boolean)
  const unlinkedTags = availableTags.filter(t => !linkedTagIds.includes(t.id))

  const handleAddTag = async (tagId) => {
    try {
      await assignTagToLead(id, tagId)
      const updated = await getLead(id)
      setLead(prev => ({ ...prev, tags: updated.tags }))
      await applyRules('tag_added')
    } catch (err) { alert(err.message) }
  }

  const handleRemoveTag = async (tagId) => {
    try {
      await removeTagFromLead(id, tagId)
      const updated = await getLead(id)
      setLead(prev => ({ ...prev, tags: updated.tags }))
    } catch (err) { alert(err.message) }
  }

  const openTagMenu = () => {
    const r = tagBtnRef.current?.getBoundingClientRect()
    if (r) setTagMenuPos({ top: r.bottom + 6, left: r.left })
    setTagSearch('')
    setAddingTag(true)
  }

  // Close the tag menu on scroll (it's fixed-positioned)
  useEffect(() => {
    if (!addingTag) return
    const close = () => setAddingTag(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [addingTag])

  // ── Lead handlers ──
  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      const updated = await updateLead(id, editForm)
      setLead(prev => ({ ...prev, ...updated }))
      await logActivity('note', `Lead details updated`)
      await refreshActivities()
      setEditOpen(false)
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    await deleteLead(id); router.push('/leads')
  }

  const handleAssignLead = async (memberId) => {
    if (memberId === lead.assigned_to) { setAssigningLead(false); return }
    try {
      const updated = await updateLead(id, { assigned_to: memberId || null })
      setLead(prev => ({ ...prev, assigned_to: updated.assigned_to }))
      const staff = org?.settings?.staff_members || []
      const member = staff.find(m => m.id === memberId)
      await logActivity('note', memberId
        ? `Lead assigned to ${member?.name || 'team member'}`
        : 'Lead unassigned')
      await refreshActivities()
    } catch (err) { alert(err.message) }
    setAssigningLead(false)
  }

  const handleStageChange = async (stage) => {
    if (stage === lead.stage) { setChangingStage(false); return }
    try {
      const updated = await updateLead(id, { stage })
      setLead(prev => ({ ...prev, stage: updated.stage }))
      await logActivity('status_change', `Stage changed to ${stage}`)
      await refreshActivities()
      setChangingStage(false)
      await applyRules('stage_changed')
    } catch (err) { alert(err.message) }
  }

  // Apply configured automation rules (Settings → Rules) for a lead event.
  const applyRules = async (eventKey) => {
    if (!lead) return
    const rules = matchingRules(org?.settings?.rules || [], { target: 'lead', event: eventKey, entity: lead })
    let changed = false
    for (const rule of rules) {
      const { type, value } = rule.action || {}
      if (type === 'set_stage' && value) {
        const orgStages = (org?.settings?.lead_stages || DEFAULT_LEAD_STAGES).map(s => typeof s === 'string' ? s : s.name)
        if (orgStages.includes(value) && !['Converted', 'Lost', value].includes(lead.stage)) {
          try {
            const updated = await updateLead(id, { stage: value })
            setLead(prev => ({ ...prev, stage: updated.stage }))
            await logActivity('status_change', `Stage auto-updated to ${value}`)
            changed = true
          } catch { /* ignore */ }
        }
      } else if (type === 'add_tag' && value) {
        const already = (lead.tags || []).some(t => t.tags?.id === value)
        if (!already) {
          try {
            await assignTagToLead(id, value)
            const updated = await getLead(id)
            setLead(prev => ({ ...prev, tags: updated.tags }))
            const tag = availableTags.find(t => t.id === value)
            await logActivity('note', `Tag "${tag?.name || 'tag'}" auto-added by rule${rule.name ? ` "${rule.name}"` : ''}`)
            changed = true
          } catch { /* ignore */ }
        }
      }
    }
    if (changed) await refreshActivities()
  }

  const handleConvertToPatient = async () => {
    if (lead.patient_id) { router.push(`/patients/${lead.patient_id}`); return }
    if (!confirm('Create a Patient record from this lead?')) return
    try {
      const pat = await createPatient({
        first_name: lead.first_name || lead.title, last_name: lead.last_name || null,
        phone: lead.phone || null, email: lead.email || null,
        gender: lead.gender || null, date_of_birth: lead.date_of_birth || null,
        address: lead.address || null, organization_id: orgId,
        assigned_to: lead.assigned_to || null,
      })
      await updateLead(id, { patient_id: pat.id, stage: 'Converted' })
      setLead(prev => ({ ...prev, patient_id: pat.id, stage: 'Converted' }))
      await logActivity('status_change', `Lead converted to patient`)
      await refreshActivities()
    } catch (err) { alert(err.message) }
  }

  // ── Task handlers ──
  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim() || !orgId) return
    try {
      const t = await createTask({ ...newTask, organization_id: orgId, entity_type: 'lead', entity_id: id })
      setTasks(prev => [t, ...prev])
      await logActivity('note', `Task added: ${newTask.title}`)
      await refreshActivities()
      setTaskOpen(false)
      setNewTask({ title: '', priority: 'Medium', due_date: '' })
      await applyRules('task_added')
    } catch (e) { alert(e.message) }
  }

  const handleTaskToggle = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed'
    const updated = await updateTask(task.id, { status: newStatus })
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    await logActivity('note', `Task "${task.title}" marked ${newStatus}`)
    await refreshActivities()
    if (newStatus === 'Completed') await applyRules('task_completed')
  }

  // ── Follow-up handlers ──
  const handleScheduleFollowup = async (e) => {
    e.preventDefault()
    if (!newFu.scheduled_at || !newFu.status_detail || !orgId) return
    try {
      const isFuture = new Date(newFu.scheduled_at).getTime() > Date.now()
      const f = await createFollowup({
        type: newFu.type,
        scheduled_at: newFu.scheduled_at,
        notes: newFu.response || null,
        outcome: newFu.status_detail,
        caller_name: newFu.caller || null,
        status: isFuture ? 'Scheduled' : 'Completed',
        organization_id: orgId,
        lead_id: id,
        patient_id: lead?.patient_id || null,
      })
      setFollowups(prev => [f, ...prev])

      await logActivity(newFu.type.toLowerCase() === 'call' ? 'call' : 'note',
        `${newFu.type} logged: ${newFu.status_detail}${newFu.response ? ` | Response: ${newFu.response}` : ''}`)
      await refreshActivities()
      setShowFuForm(false)
      setNewFu({ type: 'Call', status_detail: '', scheduled_at: '', response: '', caller: '' })
      // Event-based automation (configured in Settings → Rules)
      await applyRules('followup_logged')
    } catch (e) { alert(e.message) }
  }

  const handleCompleteFollowup = async (fuId, outcome, next) => {
    const updated = await updateFollowup(fuId, { status: 'Completed', outcome: outcome || null })
    setFollowups(prev => prev.map(f => f.id === fuId ? updated : f))
    const fu = followups.find(f => f.id === fuId)
    await logActivity(fu?.type?.toLowerCase() === 'call' ? 'call' : 'note',
      `${fu?.type || 'Follow-up'} completed${outcome ? `: ${outcome}` : ''}`)
    if (next?.scheduled_at) {
      const nf = await createFollowup({
        type: next.type, scheduled_at: next.scheduled_at, organization_id: orgId,
        lead_id: id, patient_id: lead?.patient_id || null,
      })
      setFollowups(prev => [nf, ...prev])

      // Auto-create task for next follow-up
      const nt = await createTask({
        title:           `Follow-up: ${next.type} on ${format(new Date(next.scheduled_at), 'MMM d, h:mm a')}`,
        priority:        'Medium',
        due_date:        next.scheduled_at,
        status:          'Pending',
        organization_id: orgId,
        entity_type:     'lead',
        entity_id:       id,
      })
      setTasks(prev => [nt, ...prev])

      await logActivity('note', `Next follow-up scheduled: ${next.type} on ${format(new Date(next.scheduled_at), 'MMM d, h:mm a')}`)
    }
    await refreshActivities()
  }

  const handleMissFollowup = async (fuId) => {
    const updated = await updateFollowup(fuId, { status: 'Missed' })
    setFollowups(prev => prev.map(f => f.id === fuId ? updated : f))
    const fu = followups.find(f => f.id === fuId)
    await logActivity('note', `Missed: ${fu?.type || 'Follow-up'} on ${fu?.scheduled_at ? format(new Date(fu.scheduled_at), 'MMM d') : ''}`)
    await refreshActivities()
  }

  const handleRescheduleFollowup = async (fuId, newDate, newType) => {
    const updated = await updateFollowup(fuId, { status: 'Rescheduled', scheduled_at: newDate, type: newType })
    setFollowups(prev => prev.map(f => f.id === fuId ? updated : f))
    await logActivity('note', `Follow-up rescheduled to ${format(new Date(newDate), 'MMM d, h:mm a')}`)
    await refreshActivities()
  }

  const handleRescheduleAppointment = async () => {
    if (!rescheduleDate || !reschedulingId) return
    setRescheduleSaving(true)
    try {
      const updated = await updateAppointment(reschedulingId, { scheduled_at: rescheduleDate, status: 'booked' })
      setAppointments(prev => prev.map(a => a.id === reschedulingId ? updated : a))
      await logActivity('meeting', `Appointment rescheduled to ${format(new Date(rescheduleDate), 'MMM d, yyyy')}`)
      await refreshActivities()
      setReschedulingId(null)
      setRescheduleDate('')
    } catch (err) { alert(err.message) }
    finally { setRescheduleSaving(false) }
  }

  const handleBookAppointment = async (e) => {
    e.preventDefault()
    if (!newAppt.date || !orgId) return
    setBookingSaving(true)
    try {
      let patientId = lead.patient_id
      if (!patientId) {
        const nameParts = (newAppt.name || '').trim().split(/\s+/)
        const pat = await createPatient({
          first_name: nameParts[0] || lead.first_name || lead.title,
          last_name:  nameParts.slice(1).join(' ') || lead.last_name || null,
          phone: newAppt.phone || lead.phone || null,
          email: lead.email || null,
          gender: lead.gender || null, date_of_birth: lead.date_of_birth || null,
          address: lead.address || null, organization_id: orgId,
          assigned_to: lead.assigned_to || null,
        })
        await updateLead(id, { patient_id: pat.id })
        setLead(prev => ({ ...prev, patient_id: pat.id }))
        patientId = pat.id
      }
      const appt = await createAppointment({
        organization_id: orgId,
        patient_id: patientId,
        lead_id: id,
        scheduled_at: newAppt.date,
        doctor_id: newAppt.doctor_id || null,
        notes: newAppt.notes || null,
        status: 'booked',
      })
      setAppointments(prev => [appt, ...prev])

      // Auto-task: reminder 5 days before appointment
      const apptDate = new Date(newAppt.date)
      const reminderDate = subDays(apptDate, 5)
      const reminderTask = await createTask({
        title: `Appointment Reminder — ${newAppt.name || displayName} on ${format(apptDate, 'MMM d, yyyy')}`,
        priority: 'High',
        due_date: reminderDate.toISOString(),
        status: 'Pending',
        organization_id: orgId,
        entity_type: 'lead',
        entity_id: id,
      })
      setTasks(prev => [reminderTask, ...prev])

      await logActivity('meeting', `Appointment booked for ${format(apptDate, 'MMM d, yyyy')}`)
      await refreshActivities()
      setShowBookForm(false)
      setNewAppt({ date: '', name: '', phone: '', notes: '', doctor_id: '' })
      // Event-based automation (configured in Settings → Rules)
      await applyRules('appointment_booked')
    } catch (err) { alert(err.message) }
    finally { setBookingSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Spinner size={32} /></div>
  if (!lead)   return <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Lead not found</div>

  const pat          = lead.patients
  const displayName  = [lead.first_name || pat?.first_name, lead.last_name || pat?.last_name].filter(Boolean).join(' ') || lead.title
  const displayPhone = lead.phone    || pat?.phone    || null
  const displayEmail = lead.email    || pat?.email    || null
  const displayGender= lead.gender   || pat?.gender   || null
  const displayDOB   = lead.date_of_birth || pat?.date_of_birth || null
  const displayAddr  = lead.address  || pat?.address  || null

  const stages = (org?.settings?.lead_stages || DEFAULT_LEAD_STAGES).map(s =>
    typeof s === 'string' ? { name: s, color: '#6366f1' } : s
  )
  const stageC = stages.find(s => s.name === lead.stage)?.color || '#6366f1'
  const staffMembers = org?.settings?.staff_members || []
  const doctors      = org?.settings?.doctors      || []
  const assignee = lead.assigned_to ? staffMembers.find(m => m.id === lead.assigned_to) : null
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length
  const leadCreatedEntry = {
    type: 'note',
    content: 'Lead Created',
    created_at: lead.created_at,
  }
  const timelineActivities = [...activities]
  const hasLeadCreated = timelineActivities.some(a => {
    if (!a?.content) return false
    const c = String(a.content).toLowerCase()
    return c.includes('lead created')
  })
  if (!hasLeadCreated) timelineActivities.push(leadCreatedEntry)
  timelineActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const TABS = [
    { id: 'tasks',     label: 'Tasks',      icon: CheckSquare, count: pendingTasks },
    { id: 'timeline',  label: 'Timeline',   icon: Clock },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center justify-between" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-3">
          <Link href="/leads" className="flex items-center gap-1.5 text-sm hover:opacity-60 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} /> Leads
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-600 truncate max-w-xs" style={{ color: 'var(--color-text-primary)' }}>{displayName}</span>

          {/* Stage pill with dropdown */}
          <div className="relative shrink-0">
            {changingStage && <div className="fixed inset-0 z-10" onClick={() => setChangingStage(false)} />}
            <button
              type="button"
              onClick={() => setChangingStage(s => !s)}
              className="relative z-20 flex items-center gap-1.5 text-[11px] font-700 px-2.5 py-1 rounded-md transition-opacity hover:opacity-85"
              style={{ background: stageC + '22', color: stageC }}
            >
              {lead.stage}
              <ChevronDown size={12} style={{ transform: changingStage ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>
            {changingStage && (
              <div className="absolute top-full left-0 mt-1.5 w-44 rounded-xl border border-(--color-border) overflow-hidden z-20"
                style={{ background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                {stages.map(({ name, color }) => (
                  <button key={name} type="button" onClick={() => handleStageChange(name)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-600 text-left transition-colors hover:bg-(--color-surface-2)">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="flex-1" style={{ color: 'var(--color-text-primary)' }}>{name}</span>
                    {name === lead.stage && <Check size={12} style={{ color, flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">

          {/* Assign Lead */}
          <div className="relative">
            {assigningLead && <div className="fixed inset-0 z-10" onClick={() => setAssigningLead(false)} />}
            <button
              type="button"
              onClick={() => setAssigningLead(s => !s)}
              className="relative z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-600 transition-colors hover:bg-(--color-surface-2)"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              {assignee ? (
                <>
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-700 flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                  >
                    {assignee.name[0].toUpperCase()}
                  </span>
                  <span className="max-w-24 truncate">{assignee.name}</span>
                </>
              ) : (
                <>
                  <User size={13} />
                  Assign Lead
                </>
              )}
              <ChevronDown size={12} style={{ transform: assigningLead ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>

            {assigningLead && (
              <div
                className="absolute top-full right-0 mt-1.5 w-52 rounded-xl border border-(--color-border) overflow-hidden z-20"
                style={{ background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              >
                <div className="px-3 py-2 border-b border-(--color-border)">
                  <p className="text-[10px] font-600 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Assign to</p>
                </div>
                {staffMembers.length === 0 ? (
                  <p className="px-3 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    No team members yet. Add them in Settings → People.
                  </p>
                ) : (
                  <>
                    {staffMembers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleAssignLead(m.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-500 text-left transition-colors hover:bg-(--color-surface-2)"
                      >
                        <span
                          className="w-6 h-6 rounded-full text-[10px] font-700 flex items-center justify-center shrink-0"
                          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                        >
                          {m.name[0].toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate" style={{ color: 'var(--color-text-primary)' }}>{m.name}</p>
                          {m.designation && <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{m.designation}</p>}
                        </div>
                        {lead.assigned_to === m.id && <Check size={12} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />}
                      </button>
                    ))}
                    {lead.assigned_to && (
                      <>
                        <div className="border-t border-(--color-border)" />
                        <button
                          type="button"
                          onClick={() => handleAssignLead(null)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-500 text-left transition-colors hover:bg-red-50"
                          style={{ color: '#b91c1c' }}
                        >
                          <X size={13} />
                          Unassign
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={() => { setEditForm({ stage: lead.stage, priority: lead.priority, source: lead.source, description: lead.description || '' }); setEditOpen(true) }}>
            <Edit2 size={14} /> Edit
          </Button>
          <button onClick={handleDelete} className="p-2 rounded-lg border border-(--color-border) hover:bg-red-50 hover:border-red-200 transition-colors">
            <Trash2 size={15} className="text-red-500" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-5 items-start">

          {/* ── Left col ── */}
          <div className="space-y-4">

            {/* Lead Profile */}
            <Card className="p-5 border-(--color-border)">
              <p className="text-[10px] font-700 uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>Lead Profile</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-800 shrink-0" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                  {(displayName[0] || '?').toUpperCase()}{displayName.split(' ')[1]?.[0]?.toUpperCase() || ''}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-700 truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</p>
                  {displayGender && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{displayGender}</p>}
                </div>
              </div>

              {/* Tags */}
              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(lead.tags || []).map(t => t.tags).filter(Boolean).map(tag => {
                    const tc = tag.color || '#6366f1'
                    return (
                      <span key={tag.id}
                        className="relative inline-flex items-center gap-1.5 pl-4 pr-2.5 py-1 text-xs font-600"
                        style={{ background: tc, color: 'white', clipPath: 'polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%)' }}>
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }} />
                        {tag.name}
                        <button type="button" onClick={() => handleRemoveTag(tag.id)} className="opacity-70 hover:opacity-100 transition-opacity">
                          <X size={11} />
                        </button>
                      </span>
                    )
                  })}

                  {/* Add Tag + searchable dropdown (fixed-positioned so it never gets clipped) */}
                  <button ref={tagBtnRef} type="button" onClick={() => addingTag ? setAddingTag(false) : openTagMenu()}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed text-[10px] font-600 transition-colors hover:bg-(--color-surface-2)"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <Plus size={10} /> Add Tag
                  </button>
                  {addingTag && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAddingTag(false)} />
                      <div className="fixed w-56 rounded-lg border border-(--color-border) overflow-hidden z-50"
                        style={{ top: tagMenuPos.top, left: tagMenuPos.left, background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                        <div className="p-2 border-b border-(--color-border)">
                          <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                              autoFocus
                              value={tagSearch}
                              onChange={e => setTagSearch(e.target.value)}
                              placeholder="Search tags…"
                              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-(--color-border) outline-none"
                              style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                            />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto py-1">
                          {unlinkedTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 ? (
                            <p className="px-3 py-3 text-[11px] text-center" style={{ color: 'var(--color-text-muted)' }}>
                              {availableTags.length === 0 ? 'No lead tags. Create them in Settings → Tags.' : 'No matching tags.'}
                            </p>
                          ) : (
                            unlinkedTags
                              .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                              .map(tag => (
                                <button key={tag.id} type="button" onClick={() => handleAddTag(tag.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-(--color-surface-2)">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tag.color }} />
                                  <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{tag.name}</span>
                                  <Plus size={11} style={{ color: 'var(--color-text-muted)' }} />
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {displayPhone && <div className="flex items-center gap-2"><Phone size={13} style={{ color: 'var(--color-text-muted)' }} /><span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{displayPhone}</span></div>}
                {displayEmail && <div className="flex items-center gap-2"><Mail size={13} style={{ color: 'var(--color-text-muted)' }} /><span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{displayEmail}</span></div>}
                {displayDOB   && <div className="flex items-center gap-2"><User size={13} style={{ color: 'var(--color-text-muted)' }} /><span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>DOB: {format(new Date(displayDOB), 'MMM d, yyyy')}</span></div>}
                {displayAddr  && <div className="flex items-center gap-2"><MapPin size={13} style={{ color: 'var(--color-text-muted)' }} /><span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{displayAddr}</span></div>}
                {!displayPhone && !displayEmail && !displayDOB && !displayAddr && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No contact details on record.</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-(--color-border)">
                {lead.patient_id ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-600" style={{ background: '#dcfce7', color: '#15803d' }}>
                      <Check size={12} /> Converted to Patient
                    </div>
                    <Link href={`/patients/${lead.patient_id}`}
                      className="flex items-center justify-center gap-2 text-xs font-600 py-2 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-brand-50)"
                      style={{ color: 'var(--color-brand)' }}
                    ><User size={13} /> View Patient Profile</Link>
                  </div>
                ) : (
                  <button onClick={handleConvertToPatient}
                    className="w-full flex items-center justify-center gap-2 text-xs font-600 py-2 rounded-lg transition-all hover:opacity-90"
                    style={{ background: 'var(--color-brand)', color: 'white' }}
                  ><User size={13} /> Convert to Patient</button>
                )}
              </div>
            </Card>

            {/* Lead Info */}
            <Card className="p-5 border-(--color-border)">
              <p className="text-[10px] font-700 uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>Lead Info</p>
              <div className="space-y-3">
                {[
                  { label: 'Priority', value: lead.priority,  icon: Tag },
                  { label: 'Source',   value: lead.source,    icon: TrendingUp },
                  { label: 'Created',  value: format(new Date(lead.created_at), 'MMM d, yyyy'), icon: Clock },
                  ...(lead.expected_close_date ? [{ label: 'Expected Close', value: format(new Date(lead.expected_close_date), 'MMM d, yyyy'), icon: Calendar }] : []),
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Icon size={13} style={{ color: 'var(--color-text-muted)' }} /><span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span></div>
                    <span className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Notes */}
            {lead.description && (
              <Card className="p-5 border-(--color-border)">
                <p className="text-[10px] font-700 uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Notes</p>
                <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{lead.description}</p>
              </Card>
            )}

            {/* Custom modules */}
            {(org?.settings?.modules || []).filter(m => m.page === 'leads' && m.active).map(m => (
              <CustomModuleCard key={m.id} module={m} data={lead?.custom_data?.[m.id] || {}}
                onSave={async (values) => {
                  const custom_data = { ...(lead.custom_data || {}), [m.id]: values }
                  const updated = await updateLead(id, { custom_data })
                  setLead(prev => ({ ...prev, custom_data: updated.custom_data }))
                  await logActivity('note', `${m.name} details updated`)
                  await refreshActivities()
                }}
              />
            ))}
          </div>

          {/* ── Right col ── */}
          <div className="col-span-2 space-y-5">
            <Card className="border-(--color-border) overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center justify-between border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex">
                  {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={clsx('flex items-center gap-2 px-5 py-3.5 text-xs font-600 border-b-2 transition-all',
                        activeTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent hover:bg-(--color-surface)'
                      )}
                      style={activeTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
                      )}
                    </button>
                  ))}
                </div>
                {activeTab === 'tasks' && !taskOpen && (
                  <Button size="sm" className="mr-3 shrink-0" onClick={() => setTaskOpen(true)}><Plus size={14} /> New Task</Button>
                )}
              </div>

              <div className="p-5 max-h-140 overflow-y-auto">

                {/* ── Tasks ── */}
                {activeTab === 'tasks' && (
                  <div className="space-y-3">
                    {taskOpen && (
                      <form onSubmit={handleCreateTask} className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
                        <Input label="Task *" placeholder="e.g. Send treatment plan, Follow up on insurance" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} required />
                        <div className="grid grid-cols-2 gap-3">
                          <Select label="Priority" value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))}
                            options={['Low','Medium','High','Urgent'].map(s => ({ value: s, label: s }))} />
                          <Input label="Due Date" type="datetime-local" value={newTask.due_date} onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))} />
                        </div>
                        <div className="flex gap-2 justify-end pt-1 border-t border-(--color-border)">
                          <Button variant="secondary" size="sm" type="button" onClick={() => { setTaskOpen(false); setNewTask({ title: '', priority: 'Medium', due_date: '' }) }}>Cancel</Button>
                          <Button size="sm" type="submit" disabled={!newTask.title.trim()}>Create Task</Button>
                        </div>
                      </form>
                    )}
                    {tasks.length === 0 ? (
                      <div className="py-16 text-center border border-dashed rounded-xl border-(--color-border)">
                        <CheckSquare size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No tasks yet.</p>
                      </div>
                    ) : tasks.map(task => (
                      <div key={task.id}
                        className={clsx('flex items-start gap-3 p-4 rounded-xl border border-(--color-border) transition-all', task.status === 'Completed' ? 'opacity-50' : '')}
                        style={{ background: 'var(--color-surface-2)' }}
                      >
                        <input type="checkbox" checked={task.status === 'Completed'} className="mt-0.5 w-4 h-4 cursor-pointer"
                          style={{ accentColor: 'var(--color-brand)' }}
                          onChange={() => handleTaskToggle(task)} />
                        <div className="flex-1 min-w-0">
                          <p className={clsx('text-sm font-500', task.status === 'Completed' && 'line-through')} style={{ color: 'var(--color-text-primary)' }}>{task.title}</p>
                          {task.due_date && (
                            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                              <Calendar size={10} /> {format(new Date(task.due_date), 'MMM d, h:mm a')}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Timeline (system-generated, read-only) ── */}
                {activeTab === 'timeline' && (
                  <Timeline activities={timelineActivities} emptyText="Activity will appear here automatically." />
                )}

              </div>
            </Card>

            {/* ── Appointments ── */}
            <Card className={clsx('border-(--color-border)', !reschedulingId && 'overflow-hidden')}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: 'var(--color-brand)' }} />
                  <p className="text-xs font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Appointments</p>
                </div>
                {!showBookForm && (
                  <Button size="sm" onClick={() => {
                    setNewAppt({ date: '', name: displayName, phone: displayPhone || '', notes: '', doctor_id: '' })
                    setShowBookForm(true)
                  }}>
                    <Plus size={14} /> Book Appointment
                  </Button>
                )}
              </div>

              <div className={clsx('p-5 space-y-3', !showBookForm && !reschedulingId && 'max-h-140 overflow-y-auto')}>
                {showBookForm && (
                  <form onSubmit={handleBookAppointment} className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
                    <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>New Appointment</p>

                    {!lead.patient_id && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#fef9c3', color: '#92400e' }}>
                        <AlertCircle size={13} />
                        No patient record yet — one will be created automatically on booking.
                      </div>
                    )}

                    {/* Name + Phone — auto-filled, editable */}
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Patient Name"
                        value={newAppt.name}
                        onChange={e => setNewAppt(f => ({ ...f, name: e.target.value }))}
                        placeholder="Full name"
                      />
                      <Input
                        label="Phone"
                        value={newAppt.phone}
                        onChange={e => setNewAppt(f => ({ ...f, phone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>

                    {/* Date */}
                    <CustomDatePicker
                      label="Date *"
                      value={newAppt.date}
                      onChange={v => setNewAppt(f => ({ ...f, date: v }))}
                    />

                    {/* Doctor */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Doctor</label>
                      {doctors.length === 0 ? (
                        <div className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                          No doctors added — add them in Settings → People
                        </div>
                      ) : (
                        <select
                          value={newAppt.doctor_id}
                          onChange={e => setNewAppt(f => ({ ...f, doctor_id: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                        >
                          <option value="">— Select doctor —</option>
                          {doctors.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name}{d.department ? ` · ${d.department}` : ''}{d.qualification ? ` (${d.qualification})` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <Textarea
                      label="Notes"
                      placeholder="Reason for visit, special instructions..."
                      value={newAppt.notes}
                      onChange={e => setNewAppt(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />

                    <div className="flex gap-2 justify-end pt-1 border-t border-(--color-border)">
                      <Button variant="secondary" size="sm" type="button" onClick={() => { setShowBookForm(false); setNewAppt({ date: '', name: '', phone: '', notes: '', doctor_id: '' }) }}>Cancel</Button>
                      <Button size="sm" type="submit" disabled={bookingSaving || !newAppt.date}>
                        {bookingSaving ? 'Booking...' : <><Calendar size={13} /> Book Appointment</>}
                      </Button>
                    </div>
                  </form>
                )}

                {appointments.length === 0 && !showBookForm ? (
                  <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
                    <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No appointments booked yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appointments.map(appt => {
                      const ST = { booked: { bg: '#dbeafe', color: '#1d4ed8' }, confirmed: { bg: '#dcfce7', color: '#15803d' }, completed: { bg: '#f3f4f6', color: '#374151' }, cancelled: { bg: '#fee2e2', color: '#b91c1c' } }
                      const s = ST[appt.status] || ST.booked
                      const apptDoctor = appt.doctor_id ? doctors.find(d => d.id === appt.doctor_id) : null
                      const isRescheduling = reschedulingId === appt.id
                      const canReschedule = appt.status !== 'cancelled' && appt.status !== 'completed'
                      return (
                        <div
                          key={appt.id}
                          className={clsx('rounded-xl border border-(--color-border)', !isRescheduling && 'overflow-hidden')}
                          style={{ background: 'var(--color-surface-2)' }}
                        >
                          {/* Card row */}
                          <div className="flex items-start gap-3 p-4">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                              <Calendar size={15} style={{ color: 'var(--color-brand)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>
                                  {format(new Date(appt.scheduled_at), 'EEE, MMM d yyyy')}
                                </span>
                                <span className="text-[10px] font-600 px-2 py-0.5 rounded-full capitalize" style={{ background: s.bg, color: s.color }}>{appt.status}</span>
                              </div>
                              {apptDoctor && (
                                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                                  <User size={11} /> {apptDoctor.name}{apptDoctor.department ? ` · ${apptDoctor.department}` : ''}
                                </p>
                              )}
                              {appt.notes && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{appt.notes}</p>}
                            </div>
                            {canReschedule && !isRescheduling && (
                              <button
                                type="button"
                                onClick={() => { setReschedulingId(appt.id); setRescheduleDate('') }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors shrink-0"
                                style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                              >
                                <RotateCcw size={11} /> Reschedule
                              </button>
                            )}
                          </div>

                          {/* Inline reschedule form */}
                          {isRescheduling && (
                            <div
                              className="border-t-2 p-4 space-y-3 rounded-b-xl"
                              style={{ borderColor: 'var(--color-brand)', background: 'var(--color-surface)' }}
                            >
                              <p className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>Reschedule — pick a new date</p>
                              <CustomDatePicker
                                label=""
                                value={rescheduleDate}
                                onChange={setRescheduleDate}
                              />
                              <div className="flex gap-2 justify-end">
                                <Button variant="secondary" size="sm" type="button" onClick={() => { setReschedulingId(null); setRescheduleDate('') }}>Cancel</Button>
                                <Button size="sm" type="button" onClick={handleRescheduleAppointment} disabled={rescheduleSaving || !rescheduleDate}>
                                  {rescheduleSaving ? 'Saving...' : <><RotateCcw size={12} /> Confirm Reschedule</>}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Full-width Follow-ups section ── */}
        <Card className="border-(--color-border) overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Follow-ups</p>
            {!showFuForm && (
              <Button size="sm" onClick={() => setShowFuForm(true)}><Plus size={14} /> Add</Button>
            )}
          </div>
          <div className="p-5 space-y-3">
            {showFuForm && (
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
                          : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                      >{t}</button>
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
                  <CustomDateTimePicker value={newFu.scheduled_at || new Date().toISOString()} onChange={v => setNewFu(f => ({ ...f, scheduled_at: v }))} />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>
                      Called By <span className="font-400" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                      value={newFu.caller}
                      onChange={e => setNewFu(f => ({ ...f, caller: e.target.value }))}
                    >
                      <option value="">— Select —</option>
                      {(org?.settings?.staff_members || []).map(m => (
                        <option key={m.id} value={m.name}>
                          {m.name}{m.designation ? ` (${m.designation})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Textarea label="Response" placeholder="Patient/customer response..." value={newFu.response} onChange={e => setNewFu(f => ({ ...f, response: e.target.value }))} rows={2} />
                <div className="flex gap-2 justify-end pt-1 border-t border-(--color-border)">
                  <Button variant="secondary" size="sm" type="button" onClick={() => { setShowFuForm(false); setNewFu({ type: 'Call', status_detail: '', scheduled_at: '', response: '', caller: '' }) }}>Cancel</Button>
                  <Button size="sm" type="submit" disabled={!newFu.scheduled_at || !newFu.status_detail}><Bell size={13} /> Save</Button>
                </div>
              </form>
            )}

            {followups.length === 0 ? (
              <div className="py-16 text-center border border-dashed rounded-xl border-(--color-border)">
                <PhoneCall size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No follow-ups scheduled yet.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Schedule a call, WhatsApp, or email log to keep this lead moving.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-150 overflow-y-auto pr-1">
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
      </div>

      {/* Edit Lead modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Lead">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Stage" value={editForm.stage || ''} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))}
              options={stages.map(({ name }) => ({ value: name, label: name }))} />
            <Select label="Priority" value={editForm.priority || ''} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
              options={['Low','Medium','High','Urgent'].map(s => ({ value: s, label: s }))} />
          </div>
          <Select label="Source" value={editForm.source || ''} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
            options={['WhatsApp','Meta Ads','Website','Referral','Call','Email','Walk-in','Event','Other'].map(s => ({ value: s, label: s }))} />
          <Textarea label="Notes" value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
            <Button variant="secondary" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
