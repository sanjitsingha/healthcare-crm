'use client'
import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { createPatient } from '@/lib/supabase/queries'
import { toast } from '@/lib/toast'
import { useOrg } from '@/lib/context/OrgContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const GENDERS     = ['Male', 'Female', 'Other']
const BLOOD_GROUPS = ['', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

function SectionLabel({ children }) {
  return <p className="text-xs font-700 uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>{children}</p>
}

export default function NewPatientPage() {
  const { orgId, org } = useOrg()
  const router    = useRouter()

  const [form, setForm] = useState({
    first_name:    '',
    last_name:     '',
    phone:         '',
    email:         '',
    gender:        '',
    date_of_birth: '',
    blood_group:   '',
    address:       '',
    city:          '',
    state:         '',
    pincode:       '',
    notes:         '',
    status:        'Active',
  })
  const [saving, setSaving] = useState(false)
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !orgId) return
    setSaving(true)
    try {
      const patient = await createPatient({
        first_name:      form.first_name.trim(),
        last_name:       form.last_name.trim()  || null,
        phone:           form.phone.trim()      || null,
        email:           form.email.trim()      || null,
        gender:          form.gender            || null,
        date_of_birth:   form.date_of_birth     || null,
        address:         [form.address, form.city, form.state, form.pincode].filter(Boolean).join(', ') || null,
        medical_history: form.notes ? [{ note: form.notes, date: new Date().toISOString() }] : [],
        status:          form.status || 'Active',
        organization_id: orgId,
      })
      toast({ type: 'patient_created', title: 'Patient Created', message: `${[form.first_name, form.last_name].filter(Boolean).join(' ').trim()} was registered.` })
      router.push(`/patients/${patient.id}`)
    } catch (err) {
      alert('Error: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center justify-between" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-4">
          <Link href="/patients" className="flex items-center gap-1.5 text-sm font-500 transition-opacity hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} /> Patients
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>New Patient</span>
        </div>
        <div className="flex gap-2">
          <Link href="/patients"><Button variant="secondary" type="button">Cancel</Button></Link>
          <Button onClick={handleSubmit} disabled={saving || !form.first_name.trim()}>
            <Save size={15} /> {saving ? 'Saving...' : 'Register Patient'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">

        {/* Personal Information */}
        <Card className="p-6">
          <SectionLabel>Personal Information</SectionLabel>
          <div className="grid grid-cols-4 gap-4">
            <Input label="First Name *" placeholder="Priya" value={form.first_name} onChange={set('first_name')} required />
            <Input label="Last Name"    placeholder="Sharma" value={form.last_name}  onChange={set('last_name')} />
            <Input label="Phone"        type="tel"            placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
            <Input label="Email"        type="email"          placeholder="priya@example.com" value={form.email} onChange={set('email')} />
            <Input label="Date of Birth" type="date"          value={form.date_of_birth} onChange={set('date_of_birth')} />
            <Select label="Blood Group" value={form.blood_group} onChange={set('blood_group')}
              options={BLOOD_GROUPS.map(g => ({ value: g, label: g || 'Select...' }))} />
            <Select label="Patient Status" value={form.status} onChange={set('status')}
              options={(org?.settings?.patient_statuses || [{ name: 'Active' }, { name: 'Inactive' }]).map(s => ({ value: typeof s === 'string' ? s : s.name, label: typeof s === 'string' ? s : s.name }))} />
            <div className="col-span-2 space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Gender</label>
              <div className="flex gap-2 h-9.5">
                {GENDERS.map(g => (
                  <button key={g} type="button"
                    onClick={() => setForm(f => ({ ...f, gender: f.gender === g ? '' : g }))}
                    className="flex-1 rounded-lg text-xs font-500 border transition-all"
                    style={form.gender === g
                      ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                      : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                  >{g}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-6">
          <SectionLabel>Location</SectionLabel>
          <div className="grid grid-cols-4 gap-4">
            <Input label="Address" placeholder="123 MG Road" value={form.address} onChange={set('address')} className="col-span-2" />
            <Input label="City"    placeholder="Mumbai"      value={form.city}    onChange={set('city')} />
            <Input label="State"   placeholder="Maharashtra" value={form.state}   onChange={set('state')} />
            <Input label="Pincode" placeholder="400001"      value={form.pincode} onChange={set('pincode')} />
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6">
          <SectionLabel>Notes</SectionLabel>
          <Textarea label="Initial Notes / Medical Background" placeholder="Any relevant medical history, allergies, or notes..." value={form.notes} onChange={set('notes')} rows={3} />
        </Card>

      </form>
    </div>
  )
}
