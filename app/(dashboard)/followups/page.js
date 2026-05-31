'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Bell, Phone, Mail, MessageCircle, Users, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Card, Badge, Modal, Select, Textarea, EmptyState, Spinner } from '@/components/ui'
import { getFollowups, createFollowup, getLeads, getPatients } from '@/lib/supabase/queries'
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import clsx from 'clsx'

const CHANNELS = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Other']

const CHANNEL_OUTCOMES = {
  Call: [
    'Ringing - No Response',
    'Switched Off',
    'Busy',
    'Not Reachable',
    'Connected - Interested',
    'Connected - Not Interested',
    'Connected - Callback Requested',
    'Connected - Wrong Number',
  ],
  WhatsApp: [
    'Message Sent - No Reply',
    'Delivered - No Reply',
    'Seen - No Reply',
    'Replied - Interested',
    'Replied - Not Interested',
    'Replied - Callback Requested',
    'Number Not on WhatsApp',
  ],
  Email: [
    'Sent - No Reply',
    'Bounced',
    'Opened - No Reply',
    'Replied - Interested',
    'Replied - Not Interested',
    'Replied - Callback Requested',
  ],
  Meeting: [
    'Attended - Interested',
    'Attended - Not Interested',
    'Rescheduled',
    'No Show',
    'Cancelled',
  ],
  Other: ['Updated', 'Waiting for Response', 'Closed'],
}

const TYPE_ICONS = {
  Call: Phone,
  WhatsApp: MessageCircle,
  Email: Mail,
  Meeting: Users,
  Other: Bell,
}

function DateTimePicker({ value, onChange }) {
  const parsed = value ? new Date(value) : new Date()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(startOfMonth(parsed))
  const ref = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selected = value ? new Date(value) : new Date()
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = []
  let d = gridStart
  while (d <= gridEnd) {
    days.push(d)
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  }

  const updateDate = (date) => {
    const next = new Date(date)
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
    onChange(next.toISOString())
  }

  const updateTime = (key, val) => {
    const next = new Date(selected)
    if (key === 'hour') next.setHours(Number(val))
    if (key === 'minute') next.setMinutes(Number(val))
    onChange(next.toISOString())
  }

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Date & Time *</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-lg border px-3 py-2 text-left text-sm"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', background: 'white' }}
      >
        {format(selected, 'EEE, d MMM yyyy · hh:mm a')}
      </button>

      {open && (
        <div className="rounded-xl border p-3 space-y-3 relative z-30" style={{ borderColor: 'var(--color-border)', background: 'white' }}>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-gray-100"><ChevronLeft size={16} /></button>
            <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{format(month, 'MMMM yyyy')}</p>
            <button type="button" onClick={() => setMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-gray-100"><ChevronRight size={16} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(w => <div key={w} className="py-1">{w}</div>)}
            {days.map((day, idx) => {
              const active = isSameDay(day, selected)
              const inMonth = isSameMonth(day, month)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => updateDate(day)}
                  className={clsx('py-1.5 rounded text-xs', active && 'text-white')}
                  style={active ? { background: 'var(--color-brand)' } : { color: inMonth ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <select value={selected.getHours()} onChange={(e) => updateTime('hour', e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" style={{ borderColor: 'var(--color-border)' }}>
              {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
            </select>
            <span>:</span>
            <select value={selected.getMinutes()} onChange={(e) => updateTime('minute', e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" style={{ borderColor: 'var(--color-border)' }}>
              {Array.from({ length: 60 }).map((_, m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
            </select>
            <Button type="button" variant="secondary" className="ml-auto" onClick={() => onChange(new Date().toISOString())}>Today</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function LogInteractionModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    type: 'Call',
    scheduled_at: new Date().toISOString(),
    lead_id: '',
    patient_id: '',
    outcome: '',
    notes: '',
  })
  const [leads, setLeads] = useState([])
  const [patients, setPatients] = useState([])
  const [saving, setSaving] = useState(false)

  const outcomes = CHANNEL_OUTCOMES[form.type] || []

  useEffect(() => {
    if (!open) return
    getLeads().then(setLeads).catch(() => setLeads([]))
    getPatients().then(setPatients).catch(() => setPatients([]))
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const when = new Date(form.scheduled_at)
      const isFuture = when.getTime() > Date.now()
      const payload = {
        ...form,
        lead_id: form.lead_id || null,
        patient_id: form.patient_id || null,
        outcome: form.outcome || null,
        status: isFuture && !form.outcome ? 'Scheduled' : 'Completed',
      }
      const row = await createFollowup(payload)
      onCreated(row)
      setForm({ type: 'Call', scheduled_at: new Date().toISOString(), lead_id: '', patient_id: '', outcome: '', notes: '' })
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Interaction" size="md">
      <form className="space-y-4" onSubmit={submit}>
        <Select
          label="Channel"
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value, outcome: '' }))}
          options={CHANNELS.map(c => ({ value: c, label: c }))}
        />

        <DateTimePicker value={form.scheduled_at} onChange={(v) => setForm(f => ({ ...f, scheduled_at: v }))} />

        <Select
          label="Outcome"
          value={form.outcome}
          onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
          options={[{ value: '', label: 'Select outcome (optional)' }, ...outcomes.map(o => ({ value: o, label: o }))]}
        />

        <Select
          label="Linked Lead"
          value={form.lead_id}
          onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
          options={[{ value: '', label: 'No lead' }, ...leads.map(l => ({ value: l.id, label: l.title }))]}
        />

        <Select
          label="Linked Patient"
          value={form.patient_id}
          onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
          options={[{ value: '', label: 'No patient' }, ...patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name || ''}`.trim() }))]}
        />

        <Textarea
          label="Patient Response / Notes"
          placeholder="What did the patient/customer say?"
          rows={4}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Interaction'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function FollowupLogCard({ item }) {
  const Icon = TYPE_ICONS[item.type] || Bell
  const when = new Date(item.scheduled_at)
  const isScheduled = item.status === 'Scheduled'

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg" style={{ background: 'var(--color-brand-50)' }}>
          <Icon size={16} style={{ color: 'var(--color-brand)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{item.type}</p>
            <Badge>{isScheduled ? 'Scheduled' : 'Logged'}</Badge>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            <Calendar size={11} className="inline mr-1" />
            {format(when, 'EEE, d MMM yyyy · hh:mm a')}
          </p>

          {item.leads?.title && <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}><span className="font-600">Lead:</span> {item.leads.title}</p>}
          {item.patients?.first_name && <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}><span className="font-600">Patient:</span> {item.patients.first_name} {item.patients.last_name || ''}</p>}

          {item.outcome && <p className="text-xs mt-2 px-2.5 py-1 rounded-lg inline-block" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}><span className="font-600">Outcome:</span> {item.outcome}</p>}
          {item.notes && <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{item.notes}</p>}
        </div>
      </div>
    </Card>
  )
}

export default function FollowupsPage() {
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    let active = true
    const run = async () => {
      if (active) setLoading(true)
      try {
        const data = await getFollowups()
        if (active) setFollowups(data || [])
      } catch {
        if (active) setFollowups([])
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => { active = false }
  }, [])

  const sorted = useMemo(() => {
    return [...followups].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
  }, [followups])

  const scheduledCount = followups.filter(f => f.status === 'Scheduled').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Follow-ups</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Interaction log for call / WhatsApp / email responses · {scheduledCount} upcoming
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Log Interaction</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No interactions yet"
          description="Start logging patient/customer responses from calls, WhatsApp, and emails"
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} /> Log Interaction</Button>}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map(item => <FollowupLogCard key={item.id} item={item} />)}
        </div>
      )}

      <LogInteractionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          setFollowups(prev => [row, ...prev])
          setCreateOpen(false)
        }}
      />
    </div>
  )
}
