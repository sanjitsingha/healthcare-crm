'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Plus, Calendar, User, UserRound, Link2, Hash,
  Check, X, List, CalendarDays, ChevronLeft, ChevronRight,
  Search, SlidersHorizontal, IndianRupee, CalendarClock, Banknote, CreditCard,
} from 'lucide-react'
import { Button, Card, Spinner } from '@/components/ui'
import CustomDatePicker from '@/components/crm/CustomDatePicker'
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
  confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
  booked:    { bg: '#dbeafe', color: '#1d4ed8', label: 'Booked' },
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
function CalendarView({ appointments, doctors, onStatusChange, onPaymentUpdate, onReschedule }) {
  const [month, setMonth]       = useState(startOfMonth(new Date()))
  const [selected, setSelected] = useState(new Date())

  const wRef         = useRef(getPref('pref_cal_width',  384))
  const hRef         = useRef(getPref('pref_cal_height', 520))
  const [calWidth,  setCalWidthState]  = useState(wRef.current)
  const [calHeight, setCalHeightState] = useState(hRef.current)
  const setCalWidth  = (v) => { wRef.current = v; setCalWidthState(v) }
  const setCalHeight = (v) => { hRef.current = v; setCalHeightState(v) }

  const containerRef = useRef(null)
  const hDrag        = useRef(false)
  const vDrag        = useRef({ active: false, startY: 0, startH: 0 })

  useEffect(() => {
    const onMove = (e) => {
      if (hDrag.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCalWidth(Math.max(260, Math.min(e.clientX - rect.left, rect.width - 300)))
      }
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
        document.body.style.cursor     = ''
        document.body.style.userSelect = ''
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

  const numRows    = Math.ceil(days.length / 7)
  const dayAppts   = (day) => appointments.filter(a => isSameDay(new Date(a.scheduled_at), day))
  const selectedAppts = dayAppts(selected).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))

  return (
    <Card className="overflow-hidden">
      <div ref={containerRef} className="flex" style={{ height: calHeight }}>
        <div className="flex flex-col flex-shrink-0 h-full" style={{ width: calWidth }}>
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

          <div className="grid grid-cols-7 border-b border-(--color-border) shrink-0">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((lbl, i) => (
              <div key={lbl}
                className={clsx('py-2 text-center text-[10px] font-700 uppercase tracking-wider', i < 6 && 'border-r border-(--color-border)')}
                style={{ color: 'var(--color-text-muted)' }}>
                {lbl}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-t border-(--color-border) flex-1 min-h-0"
            style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}>
            {days.map((day, i) => {
              const appts          = dayAppts(day)
              const isSelected     = isSameDay(day, selected)
              const isCurrentMonth = isSameMonth(day, month)
              const isCurrentDay   = isToday(day)
              return (
                <button key={i} type="button" onClick={() => setSelected(day)}
                  className="border-r border-b border-(--color-border) flex flex-col items-start gap-1 p-1.5 transition-colors overflow-hidden"
                  style={{
                    background: isSelected ? 'var(--color-brand)' : isCurrentDay ? 'var(--color-brand-50)' : 'transparent',
                    opacity: isCurrentMonth ? 1 : 0.3,
                  }}>
                  <span className="text-[11px] font-600 leading-none self-end pr-0.5" style={{
                    color: isSelected ? 'white' : isCurrentDay ? 'var(--color-brand)' : 'var(--color-text-primary)',
                  }}>
                    {format(day, 'd')}
                  </span>
                  {appts.length > 0 && (
                    <div className="flex flex-col gap-0.5 w-full">
                      <span className="text-[9px] font-800 px-1.5 py-0.5 rounded self-start leading-none" style={{
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--color-brand)', color: 'white',
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

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-t border-(--color-border) shrink-0">
            {Object.entries(STATUS_STYLE).map(([key, s]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative shrink-0 w-px group cursor-col-resize" style={{ background: 'var(--color-border)' }}
          onMouseDown={(e) => {
            e.preventDefault()
            hDrag.current = true
            document.body.style.cursor    = 'col-resize'
            document.body.style.userSelect = 'none'
          }}>
          <div className="absolute inset-y-0 -left-2 -right-2 flex items-center justify-center z-10">
            <div className="flex flex-col items-center justify-center gap-0.5 w-3.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
              style={{ background: 'var(--color-brand)' }}>
              {[0, 1, 2].map(i => <span key={i} className="w-0.5 h-0.5 rounded-full bg-white block" />)}
            </div>
          </div>
        </div>

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
                <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No appointments on this day.</p>
                <Link href="/appointments/new" className="mt-2 text-xs font-600 transition-opacity hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
                  Book one →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedAppts.map(a => <ApptCard key={a.id} appt={a} doctors={doctors} onStatusChange={onStatusChange} onPaymentUpdate={onPaymentUpdate} onReschedule={onReschedule} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative h-1.75 border-t border-(--color-border) cursor-row-resize group transition-colors hover:bg-(--color-brand-50)"
        onMouseDown={(e) => {
          e.preventDefault()
          vDrag.current = { active: true, startY: e.clientY, startH: hRef.current }
          document.body.style.cursor    = 'row-resize'
          document.body.style.userSelect = 'none'
        }}>
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {[0, 1, 2].map(i => <span key={i} className="h-0.5 w-5 rounded-full" style={{ background: 'var(--color-brand)' }} />)}
        </div>
      </div>
    </Card>
  )
}

// ── Appointment card ───────────────────────────────────────────
function ApptCard({ appt, doctors = [], onStatusChange, onPaymentUpdate, onReschedule }) {
  const st          = STATUS_STYLE[appt.status] || STATUS_STYLE.confirmed
  const date        = new Date(appt.scheduled_at)
  const [rescheduling, setRescheduling] = useState(false)
  const [rDate, setRDate] = useState(format(date, 'yyyy-MM-dd'))
  const [rTime, setRTime] = useState(format(date, 'HH:mm'))

  const openReschedule = () => {
    setRDate(format(date, 'yyyy-MM-dd'))
    setRTime(format(date, 'HH:mm'))
    setRescheduling(true)
  }
  const saveReschedule = () => {
    if (!rDate) return
    const iso = new Date(`${rDate}T${rTime || '10:00'}:00`).toISOString()
    onReschedule?.(appt.id, iso)
    setRescheduling(false)
  }

  // Collecting a fee — confirm cash vs online before marking paid.
  const [collecting, setCollecting] = useState(null) // null | 'consult' | 'reg'
  const confirmCollect = (mode) => {
    const patch = collecting === 'consult'
      ? { consultation_fee_status: 'paid', payment_mode: mode }
      : { registration_fee_status: 'paid', payment_mode: mode }
    onPaymentUpdate(appt.id, patch)
    setCollecting(null)
  }
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

  const canAct = appt.status === 'confirmed' || appt.status === 'booked'

  // Payment info
  const cFee    = appt.consultation_fee != null ? Number(appt.consultation_fee) : null
  const rFee    = appt.registration_fee != null ? Number(appt.registration_fee) : null
  const cPaid   = appt.consultation_fee_status === 'paid'
  const rPaid   = appt.registration_fee_status === 'paid'
  const dueAmt  = (cFee && !cPaid ? cFee : 0) + (rFee && !rPaid ? rFee : 0)
  const hasFees = cFee != null || rFee != null

  return (
    <div className="rounded-2xl border border-(--color-border) overflow-hidden transition-shadow hover:shadow-sm"
      style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-stretch">

        {/* Time column */}
        <div className="w-36 shrink-0 flex flex-col items-center justify-center gap-0.5 p-4 border-r border-(--color-border)"
          style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-brand)' }}>
            {getDateLabel()}
          </p>
          <p className="text-2xl font-800 leading-none" style={{ color: 'var(--color-text-primary)' }}>
            {format(date, 'h:mm')}
          </p>
          <p className="text-xs font-600" style={{ color: 'var(--color-text-muted)' }}>
            {format(date, 'a · MMM d')}
          </p>

          {/* Due amount indicator in time column */}
          {hasFees && (
            <div className="mt-2 pt-2 border-t border-(--color-border) w-full text-center">
              {dueAmt > 0 ? (
                <p className="text-[10px] font-700" style={{ color: '#a16207' }}>
                  ₹{dueAmt.toLocaleString()} due
                </p>
              ) : (
                <p className="text-[10px] font-700" style={{ color: '#15803d' }}>Fully paid</p>
              )}
            </div>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
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
                {appt.appointment_ref && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full shrink-0 font-mono tracking-tight"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                    title="Appointment number">
                    <Hash size={9} />{appt.appointment_ref}
                  </span>
                )}
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

              {/* Payment badges */}
              {hasFees && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {cFee != null && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full"
                      style={cPaid
                        ? { background: '#dcfce7', color: '#15803d' }
                        : { background: '#fef9c3', color: '#854d0e' }}>
                      <IndianRupee size={9} />
                      {cFee.toLocaleString()} consult · {cPaid ? 'Paid' : 'Due'}
                    </span>
                  )}
                  {rFee != null && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full"
                      style={rPaid
                        ? { background: '#dcfce7', color: '#15803d' }
                        : { background: '#fef9c3', color: '#854d0e' }}>
                      <IndianRupee size={9} />
                      {rFee.toLocaleString()} reg · {rPaid ? 'Paid' : 'Due'}
                    </span>
                  )}
                  {appt.payment_mode && (cPaid || rPaid) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-500 px-2 py-0.5 rounded-full capitalize"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                      {appt.payment_mode}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {canAct && (
              <div className="flex flex-col items-end gap-2 shrink-0">
                {collecting ? (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <span className="text-[11px] font-600" style={{ color: 'var(--color-text-secondary)' }}>
                      Collect {collecting === 'consult' ? 'consultation' : 'registration'} fee via
                    </span>
                    <button type="button" onClick={() => confirmCollect('cash')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-green-50"
                      style={{ borderColor: '#86efac', color: '#15803d', background: 'var(--color-surface)' }}>
                      <Banknote size={11} /> Cash
                    </button>
                    <button type="button" onClick={() => confirmCollect('online')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-blue-50"
                      style={{ borderColor: '#93c5fd', color: '#1d4ed8', background: 'var(--color-surface)' }}>
                      <CreditCard size={11} /> Online
                    </button>
                    <button type="button" onClick={() => setCollecting(null)} title="Cancel"
                      className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-(--color-surface-2)"
                      style={{ color: 'var(--color-text-muted)' }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {/* Per-fee pay buttons — shown only when that fee is due */}
                  {cFee != null && !cPaid && (
                    <button type="button"
                      onClick={() => setCollecting('consult')}
                      title="Collect consultation fee"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-amber-50"
                      style={{ borderColor: '#fcd34d', color: '#b45309', background: 'var(--color-surface)' }}>
                      <IndianRupee size={10} /> Collect consult
                    </button>
                  )}
                  {rFee != null && !rPaid && (
                    <button type="button"
                      onClick={() => setCollecting('reg')}
                      title="Collect registration fee"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-amber-50"
                      style={{ borderColor: '#fcd34d', color: '#b45309', background: 'var(--color-surface)' }}>
                      <IndianRupee size={10} /> Collect reg
                    </button>
                  )}

                  {/* Reschedule */}
                  <button type="button" onClick={() => rescheduling ? setRescheduling(false) : openReschedule()}
                    title="Reschedule appointment"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-(--color-surface-2)"
                    style={rescheduling
                      ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
                      : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
                    <CalendarClock size={11} /> Reschedule
                  </button>

                  {/* Complete — blocked until all dues cleared */}
                  <button type="button"
                    disabled={dueAmt > 0}
                    onClick={() => dueAmt === 0 && onStatusChange(appt.id, 'completed')}
                    title={dueAmt > 0 ? 'Clear all dues before completing' : 'Mark as completed'}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-all"
                    style={dueAmt > 0
                      ? { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'transparent', cursor: 'not-allowed', opacity: 0.6 }
                      : { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }}>
                    <Check size={11} /> Complete
                  </button>

                  {/* Cancel */}
                  <button type="button" onClick={() => onStatusChange(appt.id, 'cancelled')}
                    title="Cancel appointment"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-red-50"
                    style={{ borderColor: '#fecaca', color: '#b91c1c', background: 'var(--color-surface)' }}>
                    <X size={11} /> Cancel
                  </button>
                </div>
                )}

                {/* Inline reschedule panel */}
                {rescheduling && (
                  <div className="p-2.5 rounded-xl border space-y-3"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1 w-48">
                        <label className="text-[10px] font-600 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Date</label>
                        <CustomDatePicker popover value={rDate} onChange={setRDate} placeholder="Pick a date" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-600 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Time</label>
                        <input type="time" value={rTime} onChange={e => setRTime(e.target.value)}
                          className="px-2 py-1.5 rounded-lg border text-[12px] outline-none focus:border-(--color-brand)"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setRescheduling(false)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors hover:bg-(--color-surface)"
                        style={{ color: 'var(--color-text-muted)' }}>
                        Cancel
                      </button>
                      <button type="button" onClick={saveReschedule} disabled={!rDate}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-600 transition-opacity hover:opacity-90"
                        style={{ background: 'var(--color-brand)', color: '#fff', opacity: rDate ? 1 : 0.5 }}>
                        <Check size={11} /> Save
                      </button>
                    </div>
                  </div>
                )}
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
  const { orgId, org }                    = useOrg()
  const [appointments, setAppointments]   = useState([])
  const [loading, setLoading]             = useState(true)
  const [tab, setTab]                     = useState('upcoming')
  const [view, setView]                   = useState(() => getPref('pref_appointments_view', 'list'))

  // List-view filters
  const [search,        setSearch]        = useState('')
  const [filterDoctor,  setFilterDoctor]  = useState('')
  const [filterPayment, setFilterPayment] = useState('')   // '' | 'paid' | 'due'
  const [filterFrom,    setFilterFrom]    = useState('')
  const [filterTo,      setFilterTo]      = useState('')
  const [showFilters,   setShowFilters]   = useState(false)

  const doctors = org?.settings?.doctors || []

  const handleViewChange = (v) => { setView(v); setPref('pref_appointments_view', v) }

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

  const handlePaymentUpdate = async (id, patch) => {
    try {
      const updated = await updateAppointment(id, patch)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    } catch (e) { alert(e.message) }
  }

  // Reschedule: changing the date re-generates appointment_ref (DB trigger), so
  // merge the full returned row to reflect the new number immediately.
  const handleReschedule = async (id, scheduledAtIso) => {
    try {
      const updated = await updateAppointment(id, { scheduled_at: scheduledAtIso })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    } catch (e) { alert(e.message) }
  }

  const activeFilters = [filterDoctor, filterPayment, filterFrom, filterTo].filter(Boolean).length

  const filtered = appointments.filter(a => {
    const d = new Date(a.scheduled_at)

    // Tab
    if (tab === 'today')    { if (!isToday(d)) return false }
    if (tab === 'upcoming') { if (!(isFuture(d) || isToday(d)) || a.status === 'cancelled') return false }
    if (tab === 'history')  { if (!(isPast(d) && !isToday(d))) return false }

    // Search
    if (search.trim()) {
      const q    = search.trim().toLowerCase()
      const name = [a.patients?.first_name, a.patients?.last_name].filter(Boolean).join(' ').toLowerCase()
      if (!name.includes(q)) return false
    }

    // Doctor
    if (filterDoctor && a.doctor_id !== filterDoctor) return false

    // Payment
    if (filterPayment === 'paid') {
      const allPaid =
        (a.consultation_fee == null || a.consultation_fee_status === 'paid') &&
        (a.registration_fee == null || a.registration_fee_status === 'paid')
      if (!allPaid) return false
    }
    if (filterPayment === 'due') {
      const hasDue =
        a.consultation_fee_status === 'due' ||
        a.registration_fee_status === 'due'
      if (!hasDue) return false
    }

    // Date range
    if (filterFrom && d < new Date(filterFrom + 'T00:00:00')) return false
    if (filterTo   && d > new Date(filterTo   + 'T23:59:59')) return false

    return true
  })

  const todayCount     = appointments.filter(a => isToday(new Date(a.scheduled_at))).length
  const upcomingCount  = appointments.filter(a => isFuture(new Date(a.scheduled_at)) && a.status !== 'cancelled').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  const clearFilters = () => {
    setSearch(''); setFilterDoctor(''); setFilterPayment(''); setFilterFrom(''); setFilterTo('')
  }

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
          <div className="flex items-center gap-0.5 p-1 rounded-lg border border-(--color-border)"
            style={{ background: 'var(--color-surface-2)' }}>
            {[
              { id: 'list',     Icon: List,         title: 'List view' },
              { id: 'calendar', Icon: CalendarDays,  title: 'Calendar view' },
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
        <CalendarView appointments={appointments} doctors={doctors} onStatusChange={handleStatusChange} onPaymentUpdate={handlePaymentUpdate} onReschedule={handleReschedule} />
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

          {/* Search + Filter bar */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-52 px-3 py-2 rounded-xl border border-(--color-border) transition-colors focus-within:border-(--color-brand)"
              style={{ background: 'var(--color-surface)' }}>
              <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search patient name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="p-0.5 rounded transition-opacity hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filters toggle */}
            <button type="button" onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-500 transition-all"
              style={showFilters || activeFilters > 0
                ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              <SlidersHorizontal size={14} />
              Filters
              {activeFilters > 0 && (
                <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                  {activeFilters}
                </span>
              )}
            </button>

            {activeFilters > 0 && (
              <button type="button" onClick={clearFilters}
                className="text-xs font-500 transition-opacity hover:opacity-60"
                style={{ color: 'var(--color-text-muted)' }}>
                Clear all
              </button>
            )}
          </div>

          {/* Expanded filter row */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-(--color-border)"
              style={{ background: 'var(--color-surface)' }}>

              {/* Doctor */}
              {doctors.length > 0 && (
                <div className="flex flex-col gap-1 min-w-44">
                  <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Doctor</label>
                  <select
                    value={filterDoctor}
                    onChange={e => setFilterDoctor(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-(--color-border) text-sm outline-none"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>
                    <option value="">All doctors</option>
                    {doctors.map(doc => (
                      <option key={doc.id || doc.name} value={doc.id || doc.name}>
                        {doc.name}{doc.department ? ` · ${doc.department}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payment status */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Payment</label>
                <div className="flex gap-1">
                  {[
                    { value: '',     label: 'All' },
                    { value: 'paid', label: 'Fully paid' },
                    { value: 'due',  label: 'Has due' },
                  ].map(o => (
                    <button key={o.value} type="button" onClick={() => setFilterPayment(o.value)}
                      className="px-3 py-2 rounded-lg border text-xs font-600 transition-all"
                      style={filterPayment === o.value
                        ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Date Range</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-(--color-border) text-sm outline-none"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>to</span>
                  <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                    min={filterFrom}
                    className="px-3 py-2 rounded-lg border border-(--color-border) text-sm outline-none"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
                  {(filterFrom || filterTo) && (
                    <button type="button" onClick={() => { setFilterFrom(''); setFilterTo('') }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-(--color-surface-2)"
                      style={{ color: 'var(--color-text-muted)' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
              <Calendar size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
                {search || activeFilters > 0
                  ? 'No appointments match your filters.'
                  : tab === 'today' ? 'No appointments today.'
                  : tab === 'upcoming' ? 'No upcoming appointments.'
                  : 'No appointments found.'}
              </p>
              {!search && !activeFilters && tab !== 'history' && (
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
                .sort((a, b) => {
                  const done = x => (x.status === 'completed' || x.status === 'cancelled') ? 1 : 0
                  return (done(a) - done(b)) || (new Date(a.scheduled_at) - new Date(b.scheduled_at))
                })
                .map(a => <ApptCard key={a.id} appt={a} doctors={doctors} onStatusChange={handleStatusChange} onPaymentUpdate={handlePaymentUpdate} onReschedule={handleReschedule} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
