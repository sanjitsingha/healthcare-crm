'use client'
import { useState } from 'react'
import { Calendar, IndianRupee, CheckCircle2, CalendarClock, Banknote, CreditCard } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import CustomDatePicker from '@/components/crm/CustomDatePicker'

// Shared "Book Appointment" form — used on lead, patient and consultation pages.
// Handles fee auto-fill from the doctor, pay-now vs on-appointment-day, and cash/online.
// onSubmit receives a ready-to-store payload:
//   { scheduled_at, doctor_id, notes, name?, phone?,
//     consultation_fee, consultation_fee_status, payment_mode }
export default function BookAppointmentForm({
  doctors = [], saving = false, onSubmit, onCancel,
  withPatient = false, defaultName = '', defaultPhone = '', note = null,
}) {
  const [date, setDate]         = useState('')        // yyyy-mm-dd
  const [time, setTime]         = useState('10:00')
  const [doctorId, setDoctorId] = useState('')
  const [notes, setNotes]       = useState('')
  const [name, setName]         = useState(defaultName)
  const [phone, setPhone]       = useState(defaultPhone)
  const [fee, setFee]           = useState('')
  const [when, setWhen]         = useState('due')     // 'now' | 'due'
  const [mode, setMode]         = useState('cash')    // 'cash' | 'online'

  // Auto-fill consultation fee from the selected doctor (on change, not in an effect).
  const onDoctorChange = (val) => {
    setDoctorId(val)
    const doc = doctors.find(d => (d.id || d.name) === val)
    setFee(doc?.fee != null ? String(doc.fee) : '')
  }

  const cFee   = fee !== '' ? Number(fee) : null
  const payNow = when === 'now'

  const submit = (e) => {
    e?.preventDefault()
    if (!date) return
    const iso = new Date(`${date}T${time || '10:00'}:00`).toISOString()
    onSubmit({
      scheduled_at: iso,
      doctor_id: doctorId || null,
      notes: notes.trim() || null,
      ...(withPatient ? { name: name.trim(), phone: phone.trim() } : {}),
      consultation_fee: cFee,
      consultation_fee_status: cFee != null ? (payNow ? 'paid' : 'due') : null,
      payment_mode: cFee != null && payNow ? mode : null,
    })
  }

  const fieldLabel = 'block text-xs font-500'
  const inputBox = 'w-full px-3 py-2 rounded-lg border text-sm outline-none'
  const inputStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }

  return (
    <form onSubmit={submit} className="p-4 rounded-xl border border-(--color-border) space-y-3.5" style={{ background: 'var(--color-surface-2)' }}>
      <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>New Appointment</p>

      {note}

      {withPatient && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Patient Name" value={name} placeholder="Full name" onChange={e => setName(e.target.value)} />
          <Input label="Phone" value={phone} placeholder="Phone number" onChange={e => setPhone(e.target.value)} />
        </div>
      )}

      {/* Date (popover calendar) + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={fieldLabel} style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
          <CustomDatePicker popover value={date} onChange={setDate} placeholder="Pick a date" />
        </div>
        <div className="space-y-1.5">
          <label className={fieldLabel} style={{ color: 'var(--color-text-secondary)' }}>Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputBox} style={inputStyle} />
        </div>
      </div>

      {doctors.length > 0 && (
        <div className="space-y-1.5">
          <label className={fieldLabel} style={{ color: 'var(--color-text-secondary)' }}>Doctor</label>
          <select value={doctorId} onChange={e => onDoctorChange(e.target.value)} className={inputBox} style={inputStyle}>
            <option value="">— Doctor —</option>
            {doctors.map(d => (
              <option key={d.id || d.name} value={d.id || d.name}>
                {d.name}{d.department ? ` · ${d.department}` : ''}{d.fee != null ? ` · ₹${Number(d.fee).toLocaleString()}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Consultation fee — auto-filled from doctor, editable */}
      <div className="space-y-1.5">
        <label className={fieldLabel} style={{ color: 'var(--color-text-secondary)' }}>Consultation Fee</label>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-(--color-border) focus-within:border-(--color-brand)" style={{ background: 'var(--color-surface)' }}>
          <IndianRupee size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input type="number" min="0" step="0.01" value={fee} placeholder={doctorId ? '0' : 'e.g. 500'}
            onChange={e => setFee(e.target.value)}
            className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--color-text-primary)' }} />
        </div>
      </div>

      {/* When to collect */}
      {cFee != null && (
        <div className="space-y-1.5">
          <label className={fieldLabel} style={{ color: 'var(--color-text-secondary)' }}>When to collect?</label>
          <div className="inline-flex rounded-lg border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
            {[
              { value: 'now', label: 'Pay Now', icon: CheckCircle2 },
              { value: 'due', label: 'On Appointment Day', icon: CalendarClock },
            ].map(o => (
              <button key={o.value} type="button" onClick={() => setWhen(o.value)}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-600 transition-all"
                style={when === o.value
                  ? { background: 'var(--color-brand)', color: '#fff' }
                  : { color: 'var(--color-text-muted)', background: 'transparent' }}>
                <o.icon size={12} /> {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Payment mode — only when paying now */}
      {cFee != null && payNow && (
        <div className="space-y-1.5">
          <label className={fieldLabel} style={{ color: 'var(--color-text-secondary)' }}>Payment Mode</label>
          <div className="flex gap-2">
            {[
              { value: 'cash', label: 'Cash', icon: Banknote },
              { value: 'online', label: 'Online', icon: CreditCard },
            ].map(m => (
              <button key={m.value} type="button" onClick={() => setMode(m.value)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-[11px] font-600 transition-all"
                style={mode === m.value
                  ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
                  : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                <m.icon size={12} /> {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Textarea label="Notes" placeholder="Reason for visit, special instructions…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

      <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button size="sm" type="submit" disabled={saving || !date}>
          {saving ? 'Booking…' : <><Calendar size={13} /> Book Appointment</>}
        </Button>
      </div>
    </form>
  )
}
