'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BellRing, CheckSquare, PhoneCall, Calendar, UserRound, RefreshCw,
  AlertTriangle, Clock, CalendarClock, Sparkles, Check, ArrowRight,
} from 'lucide-react'
import { Card, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { getTasks, getFollowups, getAppointments, getPatients, updateTask } from '@/lib/supabase/queries'
import { format, isToday, startOfToday, addDays, formatDistanceToNow } from 'date-fns'

const FOLLOWUP_OPEN = ['Scheduled', 'Rescheduled']
const APPT_OPEN = ['booked', 'confirmed']
const UPCOMING_DAYS = 7

const KIND = {
  task:        { label: 'Task',        icon: CheckSquare, color: '#6366f1' },
  followup:    { label: 'Follow-up',   icon: PhoneCall,   color: '#0ea5e9' },
  appointment: { label: 'Appointment', icon: Calendar,    color: '#8b5cf6' },
  patient:     { label: 'New patient', icon: UserRound,   color: '#10b981' },
}

const FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'task',        label: 'Tasks' },
  { id: 'followup',    label: 'Follow-ups' },
  { id: 'appointment', label: 'Appointments' },
  { id: 'patient',     label: 'Patients' },
]

function Group({ icon: Icon, title, color, items, onDone }) {
  if (!items.length) return null
  return (
    <Card className="p-0 overflow-hidden border-(--color-border)">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
        <Icon size={14} style={{ color }} />
        <p className="text-xs font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
        <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>{items.length}</span>
      </div>
      <div>
        {items.map(it => {
          const K = KIND[it.kind]
          return (
            <div key={it.id} className="flex items-center gap-3 px-4 py-3 border-b border-(--color-border) last:border-b-0 hover:bg-(--color-surface-2) transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: K.color + '18' }}>
                <K.icon size={15} style={{ color: K.color }} />
              </div>
              <Link href={it.href} className="flex-1 min-w-0">
                <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{it.title}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="font-600" style={{ color: it.urgencyColor || 'var(--color-text-muted)' }}>{it.whenLabel}</span>
                  {it.sub ? ` · ${it.sub}` : ''}
                </p>
              </Link>
              {it.kind === 'task' && (
                <button type="button" onClick={() => onDone(it.id)} title="Mark done"
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-600 px-2 py-1 rounded-lg border border-(--color-border) hover:bg-(--color-surface) transition-colors"
                  style={{ color: '#15803d' }}>
                  <Check size={12} /> Done
                </button>
              )}
              <Link href={it.href} className="shrink-0 p-1.5 rounded-lg hover:bg-(--color-surface)" style={{ color: 'var(--color-text-muted)' }}>
                <ArrowRight size={14} />
              </Link>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function RemindersPage() {
  const { orgId } = useOrg()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [data, setData] = useState({ tasks: [], followups: [], appts: [], patients: [] })

  const load = () => {
    if (!orgId) return
    setLoading(true)
    Promise.all([
      getTasks({ orgId, status: 'Pending' }),
      getFollowups({ orgId }),
      getAppointments({ orgId }),
      getPatients({ orgId }),
    ]).then(([tasks, followups, appts, patients]) => {
      setData({ tasks: tasks || [], followups: followups || [], appts: appts || [], patients: patients || [] })
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [orgId])

  const markDone = async (taskId) => {
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== taskId) }))
    try { await updateTask(taskId, { status: 'Completed' }) } catch { load() }
  }

  const items = useMemo(() => {
    const today0 = startOfToday()
    const horizon = addDays(today0, UPCOMING_DAYS)
    const out = []

    const bucket = (when) => {
      if (when < today0) return 'overdue'
      if (isToday(when)) return 'today'
      if (when <= horizon) return 'upcoming'
      return 'later'
    }
    const whenText = (when, b) => {
      if (b === 'overdue') return `Overdue · ${formatDistanceToNow(when, { addSuffix: true })}`
      if (b === 'today') return `Today · ${format(when, 'h:mm a')}`
      return format(when, 'EEE, MMM d · h:mm a')
    }
    const uColor = (b) => b === 'overdue' ? '#dc2626' : b === 'today' ? '#b45309' : '#2563eb'

    // Tasks (pending, with due date)
    for (const t of data.tasks) {
      if (!t.due_date) continue
      const when = new Date(t.due_date)
      const b = bucket(when)
      if (b === 'later') continue
      out.push({
        id: `task-${t.id}`, kind: 'task', bucket: b, when,
        title: t.title || 'Task',
        sub: t.priority ? `${t.priority} priority` : '',
        whenLabel: whenText(when, b), urgencyColor: uColor(b),
        href: t.entity_type === 'lead' ? `/leads/${t.entity_id}` : `/patients/${t.entity_id}`,
        _tid: t.id,
      })
    }

    // Follow-ups (open)
    for (const f of data.followups) {
      if (!FOLLOWUP_OPEN.includes(f.status) || !f.scheduled_at) continue
      const when = new Date(f.scheduled_at)
      const b = bucket(when)
      if (b === 'later') continue
      const who = f.leads?.title || [f.patients?.first_name, f.patients?.last_name].filter(Boolean).join(' ') || ''
      out.push({
        id: `fu-${f.id}`, kind: 'followup', bucket: b, when,
        title: `${f.type || 'Follow-up'}${who ? ` — ${who}` : ''}`,
        sub: f.outcome || '',
        whenLabel: whenText(when, b), urgencyColor: uColor(b),
        href: f.lead_id ? `/leads/${f.lead_id}` : `/patients/${f.patient_id}`,
      })
    }

    // Appointments (open)
    for (const a of data.appts) {
      if (!APPT_OPEN.includes(a.status) || !a.scheduled_at) continue
      const when = new Date(a.scheduled_at)
      const b = bucket(when)
      if (b === 'later') continue
      const who = [a.patients?.first_name, a.patients?.last_name].filter(Boolean).join(' ') || a.leads?.title || 'Appointment'
      out.push({
        id: `appt-${a.id}`, kind: 'appointment', bucket: b, when,
        title: `Appointment — ${who}`,
        sub: a.status,
        whenLabel: whenText(when, b), urgencyColor: uColor(b),
        href: a.patient_id ? `/patients/${a.patient_id}` : a.lead_id ? `/leads/${a.lead_id}` : '#',
      })
    }

    // New patients (registered in the last UPCOMING_DAYS) — informational
    for (const p of data.patients) {
      const when = new Date(p.created_at)
      if (when < addDays(today0, -UPCOMING_DAYS)) continue
      out.push({
        id: `pat-${p.id}`, kind: 'patient', bucket: 'recent', when,
        title: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'New patient',
        sub: 'Registered',
        whenLabel: isToday(when) ? 'Added today' : formatDistanceToNow(when, { addSuffix: true }),
        href: `/patients/${p.id}`,
      })
    }

    return out
  }, [data])

  const shown = filter === 'all' ? items : items.filter(i => i.kind === filter)
  const byBucket = (b) => shown.filter(i => i.bucket === b).sort((a, c) => a.when - c.when)
  const recent = shown.filter(i => i.bucket === 'recent').sort((a, c) => c.when - a.when)

  const total = items.length
  const overdueN = items.filter(i => i.bucket === 'overdue').length
  const todayN = items.filter(i => i.bucket === 'today').length

  if (loading) return <div className="p-6 flex items-center justify-center h-[60vh]"><Spinner /></div>

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
            <BellRing size={18} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Reminders</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {overdueN > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>{overdueN} overdue</span>}
              {overdueN > 0 && todayN > 0 && ' · '}
              {todayN > 0 && <span style={{ color: '#b45309', fontWeight: 600 }}>{todayN} due today</span>}
              {overdueN === 0 && todayN === 0 && `${total} reminder${total !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button type="button" onClick={load} title="Refresh"
          className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2)" style={{ color: 'var(--color-text-muted)' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-600 border transition-all"
            style={filter === f.id
              ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
              : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-2xl border-(--color-border)">
          <BellRing size={30} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>You're all caught up — no reminders here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Group icon={AlertTriangle} title="Overdue"   color="#dc2626" items={byBucket('overdue')} onDone={markDone} />
          <Group icon={Clock}         title="Today"     color="#b45309" items={byBucket('today')}   onDone={markDone} />
          <Group icon={CalendarClock} title="Upcoming"  color="#2563eb" items={byBucket('upcoming')} onDone={markDone} />
          <Group icon={Sparkles}      title="Recently added" color="#10b981" items={recent} onDone={markDone} />
        </div>
      )}
    </div>
  )
}
