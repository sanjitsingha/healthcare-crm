'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Plus, Calendar, User, UserRound, Link2,
  Check, X, List, CalendarDays, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button, Card, Spinner } from '@/components/ui'
import { getAppointments, updateAppointment } from '@/lib/supabase/queries'
import { getPref, setPref } from '@/lib/prefs'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import {
  format, isToday, isFuture, isPast, isTomorrow,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, isSameDay, isSameMonth, addDays,
} from 'date-fns'
import clsx from 'clsx'

const STATUS_STYLE = {
  booked:    { bg: '#dbeafe', color: '#1d4ed8', label: 'Booked' },
  confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
  completed: { bg: '#f3f4f6', color: '#374151', label: 'Completed' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled' },
}

const TABS = [
  { id: 'today',    label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'history',  label: 'History' },
  { id: 'all',      label: 'All' },
]

// ── Calendar view ──────────────────────────────────────────────
function CalendarView({ appointments, doctors, onStatusChange }) {
  const [month, setMonth]       = useState(startOfMonth(new Date()))
  const [selected, setSelected] = useState(new Date())

  // Persist dimensions — refs track live value during drag so onUp can save
  const wRef         = useRef(getPref('pref_cal_width',  384))
  const hRef         = useRef(getPref('pref_cal_height', 520))
  const [calWidth,  setCalWidthState]  = useState(wRef.current)
  const [calHeight, setCalHeightState] = useState(hRef.current)
  const setCalWidth  = (v) => { wRef.current = v; setCalWidthState(v) }
  const setCalHeight = (v) => { hRef.current = v; setCalHeightState(v) }

  const containerRef = useRef(null)
  const hDrag        = useRef(false)                  // horizontal drag active
  const vDrag        = useRef({ active: false, startY: 0, startH: 0 })

  useEffect(() => {
    const onMove = (e) => {
      // horizontal
      if (hDrag.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCalWidth(Math.max(260, Math.min(e.clientX - rect.left, rect.width - 300)))
      }
      // vertical
      if (vDrag.current.active) {
        const delta = e.clientY - vDrag.current.startY
        setCalHeight(Math.max(380, Math.min(vDrag.current.startH + delta, 1000)))
      }
    }
    const onUp = () => {
      const anyActive = hDrag.current || vDrag.current.active
      hDrag.current        = false
      vDrag.current.active = false
      if (anyActive) {
        document.body.style.cursor    = ''
        document.body.style.userSelect = ''
        // save both to prefs on drag end
        setPref('pref_cal_width',  wRef.current)
        setPref('pref_cal_height', hRef.current)
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  const monthStart = startOfMonth(month)
  const monthEnd   = endOfMonth(month)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })

  const days = []
  let d = gridStart
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1) }

  const numRows = Math.ceil(days.length / 7)   // 5 or 6

  const dayAppts = (day) =>
    appointments.filter(a => isSameDay(new Date(a.scheduled_at), day))

  const selectedAppts = dayAppts(selected)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))

  return (
    <Card className="overflow-hidden">

      {/* ── Main panel (resizable height) ────────────────── */}
      <div ref={containerRef} className="flex" style={{ height: calHeight }}>

        {/* ── Left: calendar grid ─────────────────────────── */}
        <div className="flex flex-col flex-shrink-0 h-full" style={{ width: calWidth }}>

          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border) shrink-0">
            <button type="button" onClick={() => setMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded-lg transition-colors hover:bg-(--color-surface-2)"
              style={{ color: 'var(--color-text-secondary)' }}>
              <ChevronLeft size={15} />
            </button>
            <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>
              {format(month, 'MMMM yyyy')}
            </p>
            <button type="button" onClick={() => setMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded-lg transition-colors hover:bg-(--color-surface-2)"
              style={{ color: 'var(--color-text-secondary)' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-(--color-border) shrink-0">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((lbl, i) => (
              <div key={lbl}
                className={clsx('py-2 text-center text-[10px] font-700 uppercase tracking-wider',
                  i < 6 && 'border-r border-(--color-border)')}
                style={{ color: 'var(--color-text-muted)' }}>
                {lbl}
              </div>
            ))}
          </div>

          {/* Day grid — fills remaining height; rows grow proportionally */}
          <div
            className="grid grid-cols-7 border-l border-t border-(--color-border) flex-1 min-h-0"
            style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}
          >
            {days.map((day, i) => {
              const appts          = dayAppts(day)
              const isSelected     = isSameDay(day, selected)
              const isCurrentMonth = isSameMonth(day, month)
              const isCurrentDay   = isToday(day)

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(day)}
                  className="border-r border-b border-(--color-border) flex flex-col items-start gap-1 p-1.5 transition-colors overflow-hidden"
                  style={{
                    background: isSelected ? 'var(--color-brand)' : isCurrentDay ? 'var(--color-brand-50)' : 'transparent',
                    opacity: isCurrentMonth ? 1 : 0.3,
                  }}
                >
                  <span className="text-[11px] font-600 leading-none self-end pr-0.5" style={{
                    color: isSelected ? 'white' : isCurrentDay ? 'var(--color-brand)' : 'var(--color-text-primary)',
                  }}>
                    {format(day, 'd')}
                  </span>

                  {appts.length > 0 && (
                    <div className="flex flex-col gap-0.5 w-full">
                      <span className="text-[9px] font-800 px-1.5 py-0.5 rounded self-start leading-none" style={{
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--color-brand)',
                        color: 'white',
                      }}>
                        {appts.length}
                      </span>
                      <div className="flex gap-0.5 flex-wrap">
                        {appts.slice(0, 6).map((a, j) => (
                          <span key={j} className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                            background: isSelected ? 'rgba(255,255,255,0.7)' : STATUS_STYLE[a.status]?.color || '#6366f1',
                          }} />
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-t border-(--color-border) shrink-0">
            {Object.entries(STATUS_STYLE).map(([key, s]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Horizontal drag handle ───────────────────────── */}
        <div
          className="relative flex-shrink-0 w-px group cursor-col-resize"
          style={{ background: 'var(--color-border)' }}
          onMouseDown={(e) => {
            e.preventDefault()
            hDrag.current = true
            document.body.style.cursor    = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
        >
          <div className="absolute inset-y-0 -left-2 -right-2 flex items-center justify-center z-10">
            <div className="flex flex-col items-center justify-center gap-0.5 w-3.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
              style={{ background: 'var(--color-brand)' }}>
              {[0, 1, 2].map(i => <span key={i} className="w-0.5 h-0.5 rounded-full bg-white block" />)}
            </div>
          </div>
        </div>

        {/* ── Right: selected-day appointments ────────────── */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <div className="px-5 py-3.5 border-b border-(--color-border) shrink-0" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>
              {format(selected, 'EEEE, MMMM d')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {selectedAppts.length} appointment{selectedAppts.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {selectedAppts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Calendar size={28} className="mb-3 opacity-15" />
                <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
                  No appointments on this day.
                </p>
                <Link href="/appointments/new"
                  className="mt-2 text-xs font-600 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-brand)' }}>
                  Book one →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedAppts.map(a => (
                  <ApptCard key={a.id} appt={a} doctors={doctors} onStatusChange={onStatusChange} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Vertical (bottom) drag handle ────────────────── */}
      <div
        className="relative h-[7px] border-t border-(--color-border) cursor-row-resize group transition-colors hover:bg-(--color-brand-50)"
        onMouseDown={(e) => {
          e.preventDefault()
          vDrag.current = { active: true, startY: e.clientY, startH: hRef.current }
          document.body.style.cursor    = 'row-resize'
          document.body.style.userSelect = 'none'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {[0, 1, 2].map(i => (
            <span key={i} className="h-0.5 w-5 rounded-full" style={{ background: 'var(--color-brand)' }} />
          ))}
        </div>
      </div>

    </Card>
  )
}

// ── Appointment card ───────────────────────────────────────────
function ApptCard({ appt, doctors = [], onStatusChange }) {
  const st          = STATUS_STYLE[appt.status] || STATUS_STYLE.booked
  const date        = new Date(appt.scheduled_at)
  const patientName = [appt.patients?.first_name, appt.patients?.last_name].filter(Boolean).join(' ') || 'Unknown Patient'
  const leadName    = appt.leads
    ? ([appt.leads.first_name, appt.leads.last_name].filter(Boolean).join(' ') || appt.leads.title || 'Lead')
    : null
  const doctor = appt.doctor_id ? doctors.find(d => d.id === appt.doctor_id) : null

  const getDateLabel = () => {
    if (isToday(date))    return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE, MMM d yyyy')
  }

  const canAct = appt.status === 'booked' || appt.status === 'confirmed'

  return (
    <div
      className="rounded-2xl border border-(--color-border) overflow-hidden transition-shadow hover:shadow-sm"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="flex items-stretch">
        <div
          className="w-36 shrink-0 flex flex-col items-center justify-center gap-0.5 p-4 border-r border-(--color-border)"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-brand)' }}>
            {getDateLabel()}
          </p>
          <p className="text-2xl font-800 leading-none" style={{ color: 'var(--color-text-primary)' }}>
            {format(date, 'h:mm')}
          </p>
          <p className="text-xs font-600" style={{ color: 'var(--color-text-muted)' }}>
            {format(date, 'a · MMM d')}
          </p>
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {appt.patients?.id ? (
                  <Link href={`/patients/${appt.patients.id}`}
                    className="text-sm font-700 hover:underline truncate"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {patientName}
                  </Link>
                ) : (
                  <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{patientName}</span>
                )}
                <span className="text-[10px] font-700 px-2 py-0.5 rounded-full shrink-0 capitalize"
                  style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <UserRound size={12} /> Patient
                </span>
                {doctor && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <User size={12} />
                    {doctor.name}{doctor.department ? ` · ${doctor.department}` : ''}
                  </span>
                )}
                {leadName && appt.leads?.id && (
                  <Link href={`/leads/${appt.leads.id}`}
                    className="flex items-center gap-1 text-xs font-500 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-brand)' }}>
                    <Link2 size={11} /> {leadName}
                  </Link>
                )}
              </div>

              {appt.notes && (
                <p className="mt-2 text-xs italic border-l-2 pl-3"
                  style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                  "{appt.notes}"
                </p>
              )}
            </div>

            {canAct && (
              <div className="flex items-center gap-1.5 shrink-0">
                {appt.status === 'booked' && (
                  <button type="button" onClick={() => onStatusChange(appt.id, 'confirmed')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors"
                    style={{ background: '#dcfce7', color: '#15803d' }}>
                    <Check size={11} /> Confirm
                  </button>
                )}
                <button type="button" onClick={() => onStatusChange(appt.id, 'completed')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors"
                  style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                  <Check size={11} /> Complete
                </button>
                <button type="button" onClick={() => onStatusChange(appt.id, 'cancelled')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-red-50"
                  style={{ borderColor: '#fecaca', color: '#b91c1c' }}>
                  <X size={11} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { orgId, org } = useOrg()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState('upcoming')
  const [view, setView]                 = useState(() => getPref('pref_appointments_view', 'list'))

  const doctors = org?.settings?.doctors || []

  const handleViewChange = (v) => {
    setView(v)
    setPref('pref_appointments_view', v)
  }

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    getAppointments({ orgId })
      .then(data => { if (active) setAppointments(data || []) })
      .catch(() => { if (active) setAppointments([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orgId])

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await updateAppointment(id, { status })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: updated.status } : a))
    } catch (e) { alert(e.message) }
  }

  const filtered = appointments.filter(a => {
    const d = new Date(a.scheduled_at)
    if (tab === 'today')    return isToday(d)
    if (tab === 'upcoming') return (isFuture(d) || isToday(d)) && a.status !== 'cancelled'
    if (tab === 'history')  return isPast(d) && !isToday(d)
    return true
  })

  const todayCount     = appointments.filter(a => isToday(new Date(a.scheduled_at))).length
  const upcomingCount  = appointments.filter(a => isFuture(new Date(a.scheduled_at)) && a.status !== 'cancelled').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Appointments</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {todayCount} today · {upcomingCount} upcoming · {completedCount} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-1 rounded-lg border border-(--color-border)"
            style={{ background: 'var(--color-surface-2)' }}>
            {[
              { id: 'list',     Icon: List,        title: 'List view' },
              { id: 'calendar', Icon: CalendarDays, title: 'Calendar view' },
            ].map(({ id, Icon, title }) => (
              <button key={id} type="button" title={title} onClick={() => handleViewChange(id)}
                className="p-1.5 rounded-md transition-all"
                style={view === id
                  ? { background: 'var(--color-brand)', color: 'white' }
                  : { color: 'var(--color-text-muted)' }}>
                <Icon size={15} />
              </button>
            ))}
          </div>
          <Link href="/appointments/new">
            <Button><Plus size={16} /> Book Appointment</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : view === 'calendar' ? (
        <CalendarView appointments={appointments} doctors={doctors} onStatusChange={handleStatusChange} />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-(--color-border)">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx('px-5 py-3 text-xs font-600 border-b-2 transition-all',
                  tab === t.id ? 'border-(--color-brand)' : 'border-transparent hover:border-(--color-border)')}
                style={tab === t.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}>
                {t.label}
                {t.id === 'today' && todayCount > 0 && (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-700"
                    style={{ background: 'var(--color-brand)', color: 'white' }}>
                    {todayCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
              <Calendar size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
                {tab === 'today' ? 'No appointments today.' : tab === 'upcoming' ? 'No upcoming appointments.' : 'No appointments found.'}
              </p>
              {tab !== 'history' && (
                <Link href="/appointments/new"
                  className="mt-2 text-xs font-600 transition-opacity hover:opacity-70 block"
                  style={{ color: 'var(--color-brand)' }}>
                  Book one now →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered
                .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                .map(a => (
                  <ApptCard key={a.id} appt={a} doctors={doctors} onStatusChange={handleStatusChange} />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
