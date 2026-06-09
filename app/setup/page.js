'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, ChevronRight, CheckCircle, Building2, Phone, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit, AUDIT } from '@/lib/audit'

const ORG_TYPES = [
  'Clinic', 'Hospital', 'Pharmacy', 'Lab', 'Dental Clinic',
  'Diagnostic Center', 'Wellness Center', 'Other',
]

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Orthopaedics',
  'ENT', 'Paediatrics', 'Gynaecology & Obstetrics', 'Neurology',
  'Oncology', 'Ophthalmology', 'Dental', 'Psychiatry', 'Urology',
  'Gastroenterology', 'Pulmonology', 'Nephrology', 'Endocrinology', 'Other',
]

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Other',
]

const STEPS = [
  { id: 1, label: 'Organization', icon: Building2 },
  { id: 2, label: 'Contact & Location', icon: MapPin },
]

function Field({ label, required, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all"

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const [form, setForm] = useState({
    name: '', type: 'Clinic', specialty: '',
    registration_number: '', staff_count: '',
    phone: '', email: '', website: '',
    address: '', city: '', state: '', pincode: '', country: 'India',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
      if (!form.email) set('email', user.email || '')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showSpecialty = ['Clinic', 'Hospital', 'Dental Clinic', 'Diagnostic Center', 'Wellness Center'].includes(form.type)
  const step1Valid = form.name.trim().length > 0
  const step2Valid = form.phone.trim().length > 0 && form.city.trim().length > 0

  const handleComplete = async () => {
    if (!step2Valid) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Create organization
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: form.name.trim(),
          type: form.type,
          email: form.email || userEmail || null,
          phone: form.phone.trim(),
          website: form.website.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim(),
          state: form.state || null,
          pincode: form.pincode.trim() || null,
          country: form.country,
          status: 'Active',
          settings: {
            specialty: form.specialty || null,
            registration_number: form.registration_number.trim() || null,
            staff_count: form.staff_count ? parseInt(form.staff_count) : null,
          },
        })
        .select()
        .single()

      if (orgErr) throw orgErr

      // Create profile linking this user to the org
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          organization_id: org.id,
          full_name: user.user_metadata?.full_name || user.email,
          avatar_url: user.user_metadata?.avatar_url || null,
        })

      if (profileErr) throw profileErr

      // Audit: account + organization created during onboarding.
      await logAudit({
        action: AUDIT.USER_CREATE,
        description: `Account created and joined organization "${org.name}"`,
        metadata: { organization_id: org.id, organization_name: org.name },
        actor: { userId: user.id, email: user.email, name: user.user_metadata?.full_name || user.email, orgId: org.id },
      })

      setStep(3)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: 'var(--color-surface-2)' }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
            <Heart size={18} className="text-white" />
          </div>
          <span className="font-700 text-lg tracking-tight" style={{ color: 'var(--color-text-primary)' }}>HealthCRM</span>
        </div>

        {/* Step progress */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {STEPS.map((s, i) => {
              const done = step > s.id
              const active = step === s.id
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-600 transition-all"
                    style={done || active
                      ? { background: 'var(--color-brand)', color: 'white' }
                      : { background: '#e5e7eb', color: '#9ca3af' }}
                  >
                    {done ? <CheckCircle size={14} /> : s.id}
                  </div>
                  <span className="text-xs font-500 hidden sm:block"
                    style={{ color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={14} className="mx-1" style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-border)] p-8">
          {/* Step 3 — Success */}
          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-brand-50)' }}>
                <CheckCircle size={32} style={{ color: 'var(--color-brand)' }} />
              </div>
              <h2 className="text-xl font-700 mb-2" style={{ color: 'var(--color-text-primary)' }}>
                You&apos;re all set!
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {/* Step 1 — Organization info */}
          {step === 1 && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-700 mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Set up your organization
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Tell us about your healthcare practice
                </p>
              </div>

              <div className="space-y-4">
                <Field label="Organization / Clinic Name" required>
                  <input
                    className={inputCls}
                    placeholder="e.g. City Heart Clinic"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    autoFocus
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Organization Type" required>
                    <select
                      className={inputCls + ' cursor-pointer'}
                      value={form.type}
                      onChange={e => set('type', e.target.value)}
                    >
                      {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>

                  <Field label="Number of Staff">
                    <select
                      className={inputCls + ' cursor-pointer'}
                      value={form.staff_count}
                      onChange={e => set('staff_count', e.target.value)}
                    >
                      <option value="">Select size</option>
                      <option value="1">Just me</option>
                      <option value="5">2–5</option>
                      <option value="15">6–15</option>
                      <option value="50">16–50</option>
                      <option value="100">51–100</option>
                      <option value="500">100+</option>
                    </select>
                  </Field>
                </div>

                {showSpecialty && (
                  <Field label="Primary Specialty / Department">
                    <select
                      className={inputCls + ' cursor-pointer'}
                      value={form.specialty}
                      onChange={e => set('specialty', e.target.value)}
                    >
                      <option value="">Select specialty (optional)</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                )}

                <Field label="Registration / License Number">
                  <input
                    className={inputCls}
                    placeholder="e.g. MCI-12345 (optional)"
                    value={form.registration_number}
                    onChange={e => set('registration_number', e.target.value)}
                  />
                </Field>
              </div>

              <button
                onClick={() => step1Valid && setStep(2)}
                disabled={!step1Valid}
                className="mt-6 w-full py-2.5 text-sm font-600 text-white rounded-xl transition-all disabled:opacity-40 hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-brand)' }}
              >
                Next: Contact & Location <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Step 2 — Contact & Location */}
          {step === 2 && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-700 mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Contact & Location
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Where is your practice located?
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone Number" required>
                    <input
                      className={inputCls}
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      autoFocus
                    />
                  </Field>
                  <Field label="Clinic Email">
                    <input
                      className={inputCls}
                      type="email"
                      placeholder="clinic@example.com"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Website">
                  <input
                    className={inputCls}
                    type="url"
                    placeholder="https://yourclinic.com (optional)"
                    value={form.website}
                    onChange={e => set('website', e.target.value)}
                  />
                </Field>

                <Field label="Street Address">
                  <input
                    className={inputCls}
                    placeholder="123, Main Street (optional)"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" required>
                    <input
                      className={inputCls}
                      placeholder="Mumbai"
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                    />
                  </Field>
                  <Field label="Pincode">
                    <input
                      className={inputCls}
                      placeholder="400001"
                      value={form.pincode}
                      onChange={e => set('pincode', e.target.value)}
                      maxLength={10}
                    />
                  </Field>
                </div>

                <Field label="State">
                  <select
                    className={inputCls + ' cursor-pointer'}
                    value={form.state}
                    onChange={e => set('state', e.target.value)}
                  >
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-sm font-500 rounded-xl border border-[var(--color-border)] hover:bg-gray-50 transition-all"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!step2Valid || saving}
                  className="flex-1 py-2.5 text-sm font-600 text-white rounded-xl transition-all disabled:opacity-40 hover:opacity-90"
                  style={{ background: 'var(--color-brand)' }}
                >
                  {saving ? 'Setting up...' : 'Complete Setup'}
                </button>
              </div>
            </>
          )}
        </div>

        {step < 3 && (
          <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
            You can update all this information later in Settings.
          </p>
        )}
      </div>
    </div>
  )
}
