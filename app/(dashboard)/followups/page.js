'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Bell, Calendar, Phone, Mail, Users, Video, MapPin, Search } from 'lucide-react'
import { Button, Card, Badge, Modal, Input, Select, Textarea, EmptyState, Spinner } from '@/components/ui'
import { getFollowups, createFollowup, updateFollowup, getLeads, getContacts } from '@/lib/supabase/queries'
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns'
import clsx from 'clsx'

const TYPE_ICONS = { Call: Phone, Email: Mail, Meeting: Users, Demo: Video, 'Site Visit': MapPin, Other: Bell }
const FOLLOWUP_TYPES = ['Call', 'Email', 'Meeting', 'Demo', 'Site Visit', 'Other']

function CreateFollowupModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ type: 'Call', scheduled_at: '', notes: '', lead_id: '', contact_id: '' })
  const [leads, setLeads] = useState([])
  const [contacts, setContacts] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getLeads().then(setLeads).catch(() => [])
      getContacts().then(setContacts).catch(() => [])
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.scheduled_at) return
    setSaving(true)
    try {
      const f = await createFollowup({
        ...form,
        lead_id: form.lead_id || null,
        contact_id: form.contact_id || null,
        status: 'Scheduled',
      })
      onCreated(f)
      setForm({ type: 'Call', scheduled_at: '', notes: '', lead_id: '', contact_id: '' })
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule Follow-up" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          options={FOLLOWUP_TYPES.map(t => ({ value: t, label: t }))} />
        <Input label="Scheduled Date & Time *" type="datetime-local" value={form.scheduled_at}
          onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required />
        <Select label="Linked Lead" value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
          options={[{ value: '', label: 'No lead' }, ...leads.map(l => ({ value: l.id, label: l.title }))]} />
        <Select label="Contact" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
          options={[{ value: '', label: 'No contact' }, ...contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}`.trim() }))]} />
        <Textarea label="Notes / Agenda" placeholder="What's the purpose of this follow-up?" rows={3}
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Scheduling...' : 'Schedule'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function OutcomeModal({ open, followup, onClose, onSave }) {
  const [outcome, setOutcome] = useState('')
  const [status, setStatus] = useState('Completed')

  const handleSave = async () => {
    await onSave(followup.id, { status, outcome })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Mark Follow-up Outcome" size="sm">
      <div className="space-y-4">
        <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}
          options={[
            { value: 'Completed', label: 'Completed' },
            { value: 'Missed', label: 'Missed' },
            { value: 'Rescheduled', label: 'Rescheduled' },
          ]} />
        <Textarea label="Outcome / Notes" placeholder="What happened? Key takeaways..." rows={3}
          value={outcome} onChange={e => setOutcome(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={handleSave}>Save Outcome</Button>
        </div>
      </div>
    </Modal>
  )
}

function FollowupCard({ followup, onUpdate }) {
  const [outcomeOpen, setOutcomeOpen] = useState(false)
  const Icon = TYPE_ICONS[followup.type] || Bell
  const scheduled = new Date(followup.scheduled_at)
  const isOverdue = isPast(scheduled) && followup.status === 'Scheduled'

  const getTimeLabel = () => {
    if (isToday(scheduled)) return `Today at ${format(scheduled, 'h:mm a')}`
    if (isTomorrow(scheduled)) return `Tomorrow at ${format(scheduled, 'h:mm a')}`
    return format(scheduled, 'EEE, d MMM · h:mm a')
  }

  return (
    <>
      <div className={clsx(
        'flex items-start gap-4 p-4 rounded-xl border bg-white transition-all',
        isOverdue ? 'border-red-200 bg-red-50/20' : followup.status === 'Completed' ? 'opacity-60 border-[var(--color-border)]' : 'border-[var(--color-border)] hover:shadow-sm'
      )}>
        <div className={clsx('p-2.5 rounded-xl flex-shrink-0')}
          style={{ background: isOverdue ? '#fee2e2' : 'var(--color-brand-50)' }}>
          <Icon size={16} style={{ color: isOverdue ? '#ef4444' : 'var(--color-brand)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{followup.type}</span>
                <Badge>{followup.status}</Badge>
                {isOverdue && <span className="text-xs font-500 text-red-500">Overdue</span>}
              </div>
              <p className="text-xs mt-0.5" style={{ color: isOverdue ? '#ef4444' : 'var(--color-text-muted)' }}>
                <Calendar size={10} className="inline mr-1" />
                {getTimeLabel()}
              </p>
            </div>
          </div>

          {followup.leads && (
            <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-500" style={{ color: 'var(--color-brand)' }}>Lead:</span> {followup.leads.title}
            </p>
          )}
          {followup.contacts && (
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-500" style={{ color: 'var(--color-brand)' }}>Contact:</span> {followup.contacts.first_name} {followup.contacts.last_name || ''}
            </p>
          )}
          {followup.notes && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{followup.notes}</p>}
          {followup.outcome && (
            <div className="mt-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--color-surface-2)', borderLeft: '2px solid var(--color-brand)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="font-500">Outcome:</span> {followup.outcome}
              </p>
            </div>
          )}
        </div>

        {followup.status === 'Scheduled' && (
          <Button size="sm" variant="secondary" onClick={() => setOutcomeOpen(true)}>
            Mark Done
          </Button>
        )}
      </div>

      <OutcomeModal
        open={outcomeOpen}
        followup={followup}
        onClose={() => setOutcomeOpen(false)}
        onSave={async (id, updates) => {
          const updated = await onUpdate(id, updates)
          setOutcomeOpen(false)
        }}
      />
    </>
  )
}

export default function FollowupsPage() {
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Scheduled')
  const [createOpen, setCreateOpen] = useState(false)

  const loadFollowups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getFollowups({ status: filter !== 'All' ? filter : '' })
      setFollowups(data || [])
    } catch { setFollowups([]) }
    setLoading(false)
  }, [filter])

  useEffect(() => { loadFollowups() }, [loadFollowups])

  const handleUpdate = async (id, updates) => {
    const updated = await updateFollowup(id, updates)
    setFollowups(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f))
    return updated
  }

  // Group by date
  const today = followups.filter(f => isToday(new Date(f.scheduled_at)))
  const tomorrow = followups.filter(f => isTomorrow(new Date(f.scheduled_at)))
  const thisWeek = followups.filter(f => {
    const d = new Date(f.scheduled_at)
    return isThisWeek(d) && !isToday(d) && !isTomorrow(d) && !isPast(d)
  })
  const overdue = followups.filter(f => isPast(new Date(f.scheduled_at)) && f.status === 'Scheduled')
  const later = followups.filter(f => {
    const d = new Date(f.scheduled_at)
    return !isThisWeek(d) && !isPast(d)
  })
  const completed = followups.filter(f => f.status !== 'Scheduled' && f.status !== 'Rescheduled')

  const Section = ({ title, items, color }) => items.length === 0 ? null : (
    <div>
      <h2 className="text-xs font-700 mb-3 flex items-center gap-2" style={{ color }}>
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
        {title} ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map(f => <FollowupCard key={f.id} followup={f} onUpdate={handleUpdate} />)}
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Follow-ups</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {followups.filter(f => f.status === 'Scheduled').length} scheduled
            {overdue.length > 0 && ` · `}
            {overdue.length > 0 && <span className="text-red-500">{overdue.length} overdue</span>}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Schedule Follow-up</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Today', count: today.length, color: 'var(--color-brand)' },
          { label: 'Tomorrow', count: tomorrow.length, color: '#3b82f6' },
          { label: 'This Week', count: thisWeek.length, color: '#8b5cf6' },
          { label: 'Overdue', count: overdue.length, color: '#ef4444' },
        ].map(({ label, count, color }) => (
          <Card key={label} className="p-3 text-center">
            <p className="text-2xl font-700" style={{ color }}>{count}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1">
        {['All', 'Scheduled', 'Completed', 'Missed', 'Rescheduled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-500 border transition-all"
            style={filter === s
              ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' }
              : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', background: 'white' }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : followups.length === 0 ? (
        <EmptyState icon={Bell} title="No follow-ups" description="Schedule follow-ups to stay on top of your leads"
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} /> Schedule Follow-up</Button>} />
      ) : (
        <div className="space-y-6">
          <Section title="OVERDUE" items={overdue} color="#ef4444" />
          <Section title="TODAY" items={today} color="var(--color-brand)" />
          <Section title="TOMORROW" items={tomorrow} color="#3b82f6" />
          <Section title="THIS WEEK" items={thisWeek} color="#8b5cf6" />
          <Section title="LATER" items={later} color="#9ca3af" />
          <Section title="COMPLETED / MISSED" items={completed} color="#d1d5db" />
        </div>
      )}

      <CreateFollowupModal open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={f => { setFollowups(prev => [f, ...prev]); setCreateOpen(false) }} />
    </div>
  )
}
