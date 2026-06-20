'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, User, Check, X, IndianRupee, CalendarClock, Hash, Banknote, CreditCard } from 'lucide-react'
import CustomDatePicker from '@/components/crm/CustomDatePicker'

// Shared appointment list — used on lead, patient and consultation detail pages.
// Keeps appointment behaviour (number badge, collect payment, reschedule, complete/cancel)
// in one place so all pages stay in sync with the main Appointments screen.

const ST = {
  booked:    { bg: '#dbeafe', color: '#1d4ed8', label: 'Booked' },
  confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
  completed: { bg: '#f3f4f6', color: '#374151', label: 'Completed' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled' },
}

function ApptRow({ appt, doctors, onStatusChange, onPaymentUpdate, onReschedule }) {
  const st     = ST[appt.status] || ST.booked
  const date   = new Date(appt.scheduled_at)
  const doc    = appt.doctor_id ? doctors.find(d => d.id === appt.doctor_id) : null
  const canAct = appt.status === 'booked' || appt.status === 'confirmed'

  const cFee   = appt.consultation_fee != null ? Number(appt.consultation_fee) : null
  const rFee   = appt.registration_fee != null ? Number(appt.registration_fee) : null
  const cPaid  = appt.consultation_fee_status === 'paid'
  const rPaid  = appt.registration_fee_status === 'paid'
  const dueAmt = (cFee && !cPaid ? cFee : 0) + (rFee && !rPaid ? rFee : 0)
  const hasFees = cFee != null || rFee != null

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
    onPaymentUpdate?.(appt.id, patch)
    setCollecting(null)
  }

  return (
    <div className="rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
          <Calendar size={15} style={{ color: 'var(--color-brand)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>
              {format(date, 'EEE, MMM d yyyy · h:mm a')}
            </span>
            <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
              {st.label}
            </span>
            {appt.appointment_ref && (
              <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full font-mono tracking-tight"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                title="Appointment number">
                <Hash size={9} />{appt.appointment_ref}
              </span>
            )}
            {appt.lead_id && !appt.patient_id && (
              <span className="text-[9px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#1d4ed8' }}>from lead</span>
            )}
          </div>
          {doc && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              <User size={11} /> {doc.name}{doc.department ? ` · ${doc.department}` : ''}
            </p>
          )}
          {appt.notes && (
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{appt.notes}</p>
          )}

          {/* Payment badges */}
          {hasFees && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {cFee != null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full"
                  style={cPaid ? { background: '#dcfce7', color: '#15803d' } : { background: '#fef9c3', color: '#854d0e' }}>
                  <IndianRupee size={9} />{cFee.toLocaleString()} consult · {cPaid ? 'Paid' : 'Due'}
                </span>
              )}
              {rFee != null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full"
                  style={rPaid ? { background: '#dcfce7', color: '#15803d' } : { background: '#fef9c3', color: '#854d0e' }}>
                  <IndianRupee size={9} />{rFee.toLocaleString()} reg · {rPaid ? 'Paid' : 'Due'}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {canAct && (
            collecting ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
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
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {cFee != null && !cPaid && onPaymentUpdate && (
                  <button type="button" onClick={() => setCollecting('consult')}
                    title="Collect consultation fee"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-amber-50"
                    style={{ borderColor: '#fcd34d', color: '#b45309', background: 'var(--color-surface)' }}>
                    <IndianRupee size={10} /> Collect consult
                  </button>
                )}
                {rFee != null && !rPaid && onPaymentUpdate && (
                  <button type="button" onClick={() => setCollecting('reg')}
                    title="Collect registration fee"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-amber-50"
                    style={{ borderColor: '#fcd34d', color: '#b45309', background: 'var(--color-surface)' }}>
                    <IndianRupee size={10} /> Collect reg
                  </button>
                )}
                {onReschedule && (
                  <button type="button" onClick={() => rescheduling ? setRescheduling(false) : openReschedule()}
                    title="Reschedule appointment"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-(--color-surface)"
                    style={rescheduling
                      ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
                      : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
                    <CalendarClock size={11} /> Reschedule
                  </button>
                )}
                {onStatusChange && (
                  <>
                    <button type="button" disabled={dueAmt > 0}
                      onClick={() => dueAmt === 0 && onStatusChange(appt.id, 'completed')}
                      title={dueAmt > 0 ? 'Clear all dues before completing' : 'Mark as completed'}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-all"
                      style={dueAmt > 0
                        ? { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'transparent', cursor: 'not-allowed', opacity: 0.6 }
                        : { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }}>
                      <Check size={11} /> Complete
                    </button>
                    <button type="button" onClick={() => onStatusChange(appt.id, 'cancelled')}
                      title="Cancel appointment"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-red-50"
                      style={{ borderColor: '#fecaca', color: '#b91c1c', background: 'var(--color-surface)' }}>
                      <X size={11} /> Cancel
                    </button>
                  </>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Inline reschedule panel */}
      {rescheduling && (
        <div className="border-t-2 p-3 rounded-b-xl space-y-3"
          style={{ borderColor: 'var(--color-brand)', background: 'var(--color-surface)' }}>
          <p className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>Reschedule — pick a new date &amp; time</p>
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
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors hover:bg-(--color-surface-2)"
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
  )
}

export default function AppointmentList({ appointments = [], doctors = [], onStatusChange, onPaymentUpdate, onReschedule }) {
  // Active appointments (booked/confirmed) on top; completed & cancelled pushed to the bottom.
  const isDone = a => a.status === 'completed' || a.status === 'cancelled'
  const sorted = [...appointments].sort((a, b) =>
    (isDone(a) - isDone(b)) || (new Date(b.scheduled_at) - new Date(a.scheduled_at)))
  return (
    <div className="space-y-2">
      {sorted.map(appt => (
        <ApptRow key={appt.id} appt={appt} doctors={doctors}
          onStatusChange={onStatusChange} onPaymentUpdate={onPaymentUpdate} onReschedule={onReschedule} />
      ))}
    </div>
  )
}
