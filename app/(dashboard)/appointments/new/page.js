'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Search, Phone, Hash, Plus, ChevronDown, ChevronUp,
  X, IndianRupee, CreditCard, Banknote, CalendarClock, CheckCircle2,
} from 'lucide-react'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { getPatients, createPatient, createAppointment } from '@/lib/supabase/queries'
import { toast } from '@/lib/toast'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']
const BLOOD_GROUPS   = ['', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-700 uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </p>
  )
}

// Toggle pill: two options side by side
function TogglePill({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-600 transition-all"
          style={value === o.value
            ? { background: 'var(--color-brand)', color: '#fff' }
            : { color: 'var(--color-text-muted)', background: 'transparent' }}
        >
          {o.icon && <o.icon size={12} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function NewAppointmentPage() {
  const router         = useRouter()
  const { orgId, org } = useOrg()
  const doctors        = org?.settings?.doctors || []

  // ── Patient search ─────────────────────────────────────────
  const [patients, setPatients]       = useState([])
  const [loadingPats, setLoadingPats] = useState(true)
  const [query, setQuery]             = useState('')
  const [dropOpen, setDropOpen]       = useState(false)
  const [selected, setSelected]       = useState(null)
  const searchRef                     = useRef(null)

  // ── New patient mode ───────────────────────────────────────
  const [newMode, setNewMode]   = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [newPat, setNewPat]     = useState({
    first_name: '', last_name: '', phone: '',
    email: '', gender: '', date_of_birth: '', blood_group: '', address: '',
  })

  // ── Appointment form ───────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm]     = useState({ date: today, time: '10:00', doctor_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  // ── Billing state ──────────────────────────────────────────
  const [billing, setBilling] = useState({
    consultation_fee:    '',
    consult_when:        'due',    // 'now' | 'due'
    payment_mode:        'cash',   // 'cash' | 'online'
    registration_fee:    '',
    reg_when:            'due',    // 'now' | 'due'
  })
  const setB = (key) => (val) => setBilling(b => ({ ...b, [key]: val }))

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  // Auto-fill consultation fee when doctor changes
  useEffect(() => {
    if (!form.doctor_id) { setBilling(b => ({ ...b, consultation_fee: '' })); return }
    const doc = doctors.find(d => (d.id || d.name) === form.doctor_id)
    if (doc?.fee != null) setBilling(b => ({ ...b, consultation_fee: String(doc.fee) }))
  }, [form.doctor_id]) // eslint-disable-line

  useEffect(() => {
    if (!orgId) return
    getPatients({ orgId })
      .then(p => setPatients(p || []))
      .finally(() => setLoadingPats(false))
  }, [orgId])

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const results = query.trim().length < 2 ? [] : patients.filter(p => {
    const q    = query.toLowerCase()
    const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase()
    return name.includes(q) || (p.phone || '').toLowerCase().includes(q) || (p.patient_code || '').toLowerCase().includes(q)
  }).slice(0, 8)

  const selectPatient = (p) => {
    setSelected(p)
    setNewMode(false)
    setDropOpen(false)
    setQuery(`${p.first_name || ''} ${p.last_name || ''}`.trim())
  }

  const clearPatient = () => { setSelected(null); setNewMode(false); setQuery(''); setDropOpen(false) }

  // Derived billing summary
  const cFee     = billing.consultation_fee !== '' ? Number(billing.consultation_fee) : null
  const rFee     = newMode && billing.registration_fee !== '' ? Number(billing.registration_fee) : null
  const cPaidNow = billing.consult_when === 'now'
  const rPaidNow = billing.reg_when === 'now'
  const dueNow   = (cPaidNow && cFee ? cFee : 0) + (rPaidNow && rFee ? rFee : 0)
  const dueLater = (!cPaidNow && cFee ? cFee : 0) + (!rPaidNow && rFee ? rFee : 0)
  const anyPayNow = (cFee && cPaidNow) || (rFee && rPaidNow)
  const hasFees  = cFee != null || rFee != null

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!orgId) return
    if (!selected && !newMode) { alert('Please select or add a patient.'); return }
    if (!form.date)             { alert('Please select a date.'); return }
    if (newMode) {
      if (!newPat.first_name.trim()) { alert('First name is required.'); return }
      if (!newPat.phone.trim())      { alert('Phone number is required.'); return }
    }

    setSaving(true)
    try {
      let patientId = selected?.id
      if (newMode) {
        const created = await createPatient({
          first_name:      newPat.first_name.trim(),
          last_name:       newPat.last_name.trim()  || null,
          phone:           newPat.phone.trim(),
          email:           newPat.email.trim()      || null,
          gender:          newPat.gender            || null,
          date_of_birth:   newPat.date_of_birth     || null,
          address:         newPat.address.trim()    || null,
          custom_data:     newPat.blood_group ? { blood_group: newPat.blood_group } : {},
          organization_id: orgId,
        })
        patientId = created.id
      }

      const scheduledAt = new Date(`${form.date}T${form.time || '10:00'}:00`)
      const appt = await createAppointment({
        organization_id:           orgId,
        patient_id:                patientId,
        doctor_id:                 form.doctor_id || null,
        scheduled_at:              scheduledAt.toISOString(),
        notes:                     form.notes.trim() || null,
        status:                    'confirmed',
        // billing
        consultation_fee:          cFee,
        consultation_fee_status:   cFee != null ? (cPaidNow ? 'paid' : 'due') : null,
        registration_fee:          rFee,
        registration_fee_status:   rFee != null ? (rPaidNow ? 'paid' : 'due') : null,
        payment_mode:              anyPayNow ? billing.payment_mode : null,
      })

      const name = selected
        ? `${selected.first_name || ''} ${selected.last_name || ''}`.trim()
        : `${newPat.first_name} ${newPat.last_name || ''}`.trim()
      toast({ type: 'appointment_created', title: 'Appointment Booked', message: `Appointment for ${name} has been booked.` })
      router.push('/appointments')
    } catch (err) {
      alert('Error: ' + err.message)
      setSaving(false)
    }
  }

  const patientName = selected
    ? `${selected.first_name || ''} ${selected.last_name || ''}`.trim()
    : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sticky header ────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center justify-between"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/appointments"
            className="flex items-center gap-1.5 text-sm font-500 transition-opacity hover:opacity-60"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ArrowLeft size={16} />
            Appointments
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>New Appointment</span>
        </div>
        <div className="flex gap-2">
          <Link href="/appointments"><Button variant="secondary" type="button">Cancel</Button></Link>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || (!selected && !newMode)}
          >
            <Save size={15} />
            {saving ? 'Booking…' : 'Book Appointment'}
          </Button>
        </div>
      </div>

      {/* ── Form body ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">

        {/* Patient search ──────────────────────────────────── */}
        <Card className="p-6 overflow-visible">
          <SectionLabel>Patient</SectionLabel>

          {!selected && !newMode && (
            <div ref={searchRef} className="relative">
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-(--color-border) transition-colors focus-within:border-(--color-brand)"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <Search size={15} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, phone, or patient ID…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setDropOpen(true) }}
                  onFocus={() => setDropOpen(true)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--color-text-primary)' }}
                  autoComplete="off"
                />
              </div>

              {dropOpen && query.trim().length >= 2 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-(--color-border) shadow-xl z-20 overflow-hidden"
                  style={{ background: 'var(--color-surface)' }}
                >
                  {results.length === 0 ? (
                    <div className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      No patients found for "{query}"
                    </div>
                  ) : results.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-(--color-border) last:border-0 transition-colors hover:bg-(--color-surface-2)"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-700"
                        style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                      >
                        {(p.first_name?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {[p.first_name, p.last_name].filter(Boolean).join(' ')}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {p.phone && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              <Phone size={10} /> {p.phone}
                            </span>
                          )}
                          {p.patient_code && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              <Hash size={10} /> {p.patient_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selected && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-700"
                style={{ background: 'var(--color-brand)', color: 'white' }}
              >
                {(selected.first_name?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{patientName}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {selected.phone && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <Phone size={10} /> {selected.phone}
                    </span>
                  )}
                  {selected.patient_code && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <Hash size={10} /> {selected.patient_code}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={clearPatient}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-100 shrink-0"
                title="Change patient"
              >
                <X size={15} style={{ color: '#b91c1c' }} />
              </button>
            </div>
          )}

          {!selected && (
            <div className="mt-4 pt-4 border-t border-(--color-border)">
              {!newMode ? (
                <button
                  type="button"
                  onClick={() => { setNewMode(true); setQuery('') }}
                  className="flex items-center gap-2 text-sm font-500 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-brand)' }}
                >
                  <Plus size={16} />
                  First visit? Add as new patient
                </button>
              ) : (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>New Patient Details</p>
                  <button
                    type="button"
                    onClick={() => setNewMode(false)}
                    className="flex items-center gap-1 text-xs font-500 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <X size={13} /> Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {newMode && (
            <div className="grid grid-cols-4 gap-4">
              <Input label="First Name *" placeholder="Ramesh" value={newPat.first_name}
                onChange={e => setNewPat(p => ({ ...p, first_name: e.target.value }))} />
              <Input label="Last Name" placeholder="Kumar" value={newPat.last_name}
                onChange={e => setNewPat(p => ({ ...p, last_name: e.target.value }))} />
              <Input label="Phone *" type="tel" placeholder="+91 98765 43210" value={newPat.phone}
                onChange={e => setNewPat(p => ({ ...p, phone: e.target.value }))} />
              <div className="space-y-1.5">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Gender</label>
                <div className="flex gap-2 h-9.5">
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} type="button"
                      onClick={() => setNewPat(p => ({ ...p, gender: p.gender === g ? '' : g }))}
                      className="flex-1 rounded-lg text-xs font-500 border transition-all"
                      style={newPat.gender === g
                        ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                        : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-4">
                <button type="button" onClick={() => setMoreOpen(o => !o)}
                  className="flex items-center gap-1.5 text-xs font-600 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-brand)' }}>
                  {moreOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {moreOpen ? 'Less options' : 'More options'}
                </button>
              </div>

              {moreOpen && (
                <>
                  <Input label="Email" type="email" placeholder="ramesh@example.com" value={newPat.email}
                    onChange={e => setNewPat(p => ({ ...p, email: e.target.value }))} />
                  <Input label="Date of Birth" type="date" value={newPat.date_of_birth}
                    onChange={e => setNewPat(p => ({ ...p, date_of_birth: e.target.value }))} />
                  <Select label="Blood Group" value={newPat.blood_group}
                    onChange={e => setNewPat(p => ({ ...p, blood_group: e.target.value }))}
                    options={BLOOD_GROUPS.map(g => ({ value: g, label: g || 'Select…' }))} />
                  <Input label="Address" placeholder="123 MG Road, Mumbai" value={newPat.address}
                    onChange={e => setNewPat(p => ({ ...p, address: e.target.value }))} />
                </>
              )}
            </div>
          )}
        </Card>

        {/* Appointment details ──────────────────────────────── */}
        <Card className="p-6">
          <SectionLabel>Appointment Details</SectionLabel>
          <div className="grid grid-cols-4 gap-4">
            <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
            <Input label="Time" type="time" value={form.time} onChange={set('time')} />
            {doctors.length > 0 && (
              <div className="col-span-2">
                <Select
                  label="Doctor"
                  value={form.doctor_id}
                  onChange={set('doctor_id')}
                  options={[
                    { value: '', label: 'No doctor assigned' },
                    ...doctors.map(doc => ({
                      value: doc.id || doc.name,
                      label: doc.name + (doc.department ? ` — ${doc.department}` : '') + (doc.fee != null ? ` · ₹${Number(doc.fee).toLocaleString()}` : ''),
                    })),
                  ]}
                />
              </div>
            )}
            <div className={doctors.length > 0 ? 'col-span-4' : 'col-span-2'}>
              <Textarea
                label="Notes"
                placeholder="Reason for visit, symptoms, special instructions…"
                value={form.notes}
                onChange={set('notes')}
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Billing & Fees ───────────────────────────────────── */}
        <Card className="p-6">
          <SectionLabel>Billing &amp; Fees</SectionLabel>

          <div className="space-y-6">

            {/* Consultation Fee row */}
            <div className="flex flex-wrap items-start gap-6">
              <div className="w-44 shrink-0">
                <label className="block text-xs font-500 mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Consultation Fee
                </label>
                <div
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-(--color-border) transition-colors focus-within:border-(--color-brand)"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <IndianRupee size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={form.doctor_id ? '0' : 'e.g. 500'}
                    value={billing.consultation_fee}
                    onChange={e => setB('consultation_fee')(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-500 mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  When to collect?
                </p>
                <TogglePill
                  value={billing.consult_when}
                  onChange={setB('consult_when')}
                  options={[
                    { value: 'now', label: 'Pay Now',             icon: CheckCircle2 },
                    { value: 'due', label: 'On Appointment Day',  icon: CalendarClock },
                  ]}
                />
              </div>
            </div>

            {/* Payment Mode — shown whenever any fee is "pay now" */}
            {(billing.consult_when === 'now' || (newMode && billing.reg_when === 'now')) && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-(--color-border)"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <span className="text-xs font-600 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                  Payment Mode
                </span>
                <div className="flex gap-2">
                  {[
                    { value: 'cash',   label: 'Cash',   icon: Banknote },
                    { value: 'online', label: 'Online', icon: CreditCard },
                  ].map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setB('payment_mode')(m.value)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-xs font-600 transition-all"
                      style={billing.payment_mode === m.value
                        ? { background: 'var(--color-brand)', color: '#fff', borderColor: 'var(--color-brand)' }
                        : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <m.icon size={13} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Registration Fee — only for new patients */}
            {newMode && (
              <div
                className="pt-5 border-t border-(--color-border) flex flex-wrap items-start gap-6"
              >
                <div className="w-44 shrink-0">
                  <label className="block text-xs font-500 mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Registration Fee
                  </label>
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-(--color-border) transition-colors focus-within:border-(--color-brand)"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    <IndianRupee size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 200"
                      value={billing.registration_fee}
                      onChange={e => setB('registration_fee')(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--color-text-primary)' }}
                    />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>One-time for new patients</p>
                </div>

                <div>
                  <p className="text-xs font-500 mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    When to collect?
                  </p>
                  <TogglePill
                    value={billing.reg_when}
                    onChange={setB('reg_when')}
                    options={[
                      { value: 'now', label: 'Pay Now',            icon: CheckCircle2 },
                      { value: 'due', label: 'On Appointment Day', icon: CalendarClock },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Summary row */}
            {hasFees && (
              <div
                className="rounded-xl border border-(--color-border) overflow-hidden"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <div className="px-4 py-2.5 border-b border-(--color-border)">
                  <p className="text-xs font-700 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Summary</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {cFee != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Consultation Fee</span>
                      <div className="flex items-center gap-2">
                        <span className="font-600" style={{ color: 'var(--color-text-primary)' }}>
                          ₹{cFee.toLocaleString()}
                        </span>
                        <span
                          className="text-[11px] font-700 px-2 py-0.5 rounded-full"
                          style={cPaidNow
                            ? { background: '#dcfce7', color: '#15803d' }
                            : { background: '#fef9c3', color: '#a16207' }}
                        >
                          {cPaidNow ? `Paid · ${billing.payment_mode}` : 'Due'}
                        </span>
                      </div>
                    </div>
                  )}
                  {rFee != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Registration Fee</span>
                      <div className="flex items-center gap-2">
                        <span className="font-600" style={{ color: 'var(--color-text-primary)' }}>
                          ₹{rFee.toLocaleString()}
                        </span>
                        <span
                          className="text-[11px] font-700 px-2 py-0.5 rounded-full"
                          style={rPaidNow
                            ? { background: '#dcfce7', color: '#15803d' }
                            : { background: '#fef9c3', color: '#a16207' }}
                        >
                          {rPaidNow ? `Paid · ${billing.payment_mode}` : 'Due'}
                        </span>
                      </div>
                    </div>
                  )}

                  {dueLater > 0 && (
                    <div
                      className="flex items-center justify-between pt-2 mt-2 border-t border-(--color-border)"
                    >
                      <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Due on Appointment Day</span>
                      <span className="text-base font-800" style={{ color: 'var(--color-brand)' }}>
                        ₹{dueLater.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {dueNow > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-500" style={{ color: 'var(--color-text-muted)' }}>
                        Collecting now ({billing.payment_mode})
                      </span>
                      <span className="text-sm font-700" style={{ color: '#15803d' }}>
                        ₹{dueNow.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

      </form>
    </div>
  )
}
