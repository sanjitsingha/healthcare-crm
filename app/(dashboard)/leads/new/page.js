'use client'
import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { ModuleFields } from '@/components/crm/CustomModule'
import { createLead } from '@/lib/supabase/queries'
import { toast } from '@/lib/toast'
import { useOrg } from '@/lib/context/OrgContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STAGES = [
  { label: 'New',        color: '#6366f1' },
  { label: 'Contacted',  color: '#0ea5e9' },
  { label: 'Interested', color: '#f59e0b' },
  { label: 'Follow-up',  color: '#8b5cf6' },
  { label: 'Converted',  color: '#10b981' },
  { label: 'Lost',       color: '#ef4444' },
]

const PRIORITIES = [
  { label: 'Low',    color: '#10b981' },
  { label: 'Medium', color: '#f59e0b' },
  { label: 'High',   color: '#ef4444' },
  { label: 'Urgent', color: '#7c3aed' },
]

const SOURCES    = ['WhatsApp', 'Meta Ads', 'Website', 'Referral', 'Call', 'Email', 'Walk-in', 'Event', 'Other']
const GENDERS    = ['Male', 'Female', 'Other']
const BLOOD_GROUPS = ['', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']
const DEPARTMENTS  = [
  '', 'General Medicine', 'Cardiology', 'Dermatology', 'ENT', 'Gastroenterology',
  'Gynecology & Obstetrics', 'Nephrology', 'Neurology', 'Oncology', 'Ophthalmology',
  'Orthopedics', 'Pediatrics', 'Psychiatry', 'Pulmonology', 'Urology', 'Dental', 'Other',
]

function PillSelector({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ label, color }) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(label)}
          className="px-3 py-1.5 rounded-full text-xs font-500 border transition-all"
          style={value === label
            ? { background: color, color: 'white', borderColor: color }
            : { background: 'transparent', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-700 uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </p>
  )
}


export default function NewLeadPage() {
  const { orgId, org } = useOrg()
  const router         = useRouter()

  const leadModules = (org?.settings?.modules || []).filter(m => m.page === 'leads' && m.active)

  const [customData, setCustomData] = useState({})
  const setCustomField = (moduleId, fieldId, value) =>
    setCustomData(prev => ({ ...prev, [moduleId]: { ...(prev[moduleId] || {}), [fieldId]: value } }))

  const [form, setForm] = useState({
    first_name:   '',
    last_name:    '',
    phone:        '',
    email:        '',
    gender:       '',
    date_of_birth:'',
    blood_group:  '',
    address:      '',
    city:         '',
    state:        '',
    pincode:      '',
    department:   '',
    reason:       '',
    referred_by:  '',
    stage:        'New',
    priority:     'Medium',
    source:       'Other',
    notes:        '',
  })
  const [saving, setSaving] = useState(false)

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !orgId) return
    setSaving(true)
    try {
      const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ').trim()

      // Structured fields go into custom_data; only free-text notes go into description
      const extraFields = {
        ...(form.blood_group  ? { blood_group:  form.blood_group  } : {}),
        ...(form.reason       ? { reason:       form.reason       } : {}),
        ...(form.department   ? { department:   form.department   } : {}),
        ...(form.referred_by  ? { referred_by:  form.referred_by  } : {}),
      }
      const mergedCustomData = { ...customData, ...extraFields }

      const lead = await createLead({
        title:           fullName,
        first_name:      form.first_name.trim(),
        last_name:       form.last_name.trim()  || null,
        phone:           form.phone.trim()      || null,
        email:           form.email.trim()      || null,
        gender:          form.gender            || null,
        date_of_birth:   form.date_of_birth     || null,
        address:         [form.address, form.city, form.state, form.pincode].filter(Boolean).join(', ') || null,
        description:     form.notes             || null,
        stage:           form.stage,
        priority:        form.priority,
        source:          form.source,
        organization_id: orgId,
        custom_data:     Object.keys(mergedCustomData).length ? mergedCustomData : null,
      })

      toast({ type: 'lead_created', title: 'Lead Created', message: `${fullName} was added as a new lead.` })
      router.push(`/leads/${lead.id}`)
    } catch (err) {
      alert('Error: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Page header */}
      <div
        className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center justify-between"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/leads"
            className="flex items-center gap-1.5 text-sm font-500 transition-opacity hover:opacity-60"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ArrowLeft size={16} />
            Leads
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>New Lead</span>
        </div>
        <div className="flex gap-2">
          <Link href="/leads"><Button variant="secondary" type="button">Cancel</Button></Link>
          <Button onClick={handleSubmit} disabled={saving || !form.first_name.trim()}>
            <Save size={15} /> {saving ? 'Creating...' : 'Create Lead'}
          </Button>
        </div>
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">

        {/* Personal Information */}
        <Card className="p-6">
          <SectionLabel>Personal Information</SectionLabel>
          <div className="grid grid-cols-4 gap-4">
            <Input label="First Name *" placeholder="Ramesh" value={form.first_name} onChange={set('first_name')} required />
            <Input label="Last Name"    placeholder="Kumar"  value={form.last_name}  onChange={set('last_name')} />
            <Input label="Phone"        type="tel"           placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
            <Input label="Email"        type="email"         placeholder="ramesh@example.com" value={form.email} onChange={set('email')} />
            <Input label="Date of Birth" type="date"         value={form.date_of_birth} onChange={set('date_of_birth')} />
            <Select
              label="Blood Group"
              value={form.blood_group}
              onChange={set('blood_group')}
              options={BLOOD_GROUPS.map(g => ({ value: g, label: g || 'Select...' }))}
            />
            <div className="col-span-2 space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Gender</label>
              <div className="flex gap-2 h-9.5">
                {GENDERS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, gender: f.gender === g ? '' : g }))}
                    className="flex-1 rounded-lg text-xs font-500 border transition-all"
                    style={form.gender === g
                      ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                      : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                  >
                    {g}
                  </button>
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

        {/* Medical Interest */}
        <Card className="p-6">
          <SectionLabel>Medical Interest</SectionLabel>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Department / Specialty"
              value={form.department}
              onChange={set('department')}
              options={DEPARTMENTS.map(d => ({ value: d, label: d || 'Select department...' }))}
            />
            <Input label="Reason for Inquiry" placeholder="e.g. Knee pain, Eye checkup" value={form.reason}      onChange={set('reason')} />
            <Input label="Referred By"         placeholder="Doctor or person name"        value={form.referred_by} onChange={set('referred_by')} />
          </div>
        </Card>

        {/* Lead Status */}
        <Card className="p-6">
          <SectionLabel>Lead Status</SectionLabel>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Stage</label>
              <PillSelector options={STAGES} value={form.stage} onChange={v => setForm(f => ({ ...f, stage: v }))} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Priority</label>
              <PillSelector options={PRIORITIES} value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} />
            </div>
            <Select
              label="Source"
              value={form.source}
              onChange={set('source')}
              options={SOURCES.map(s => ({ value: s, label: s }))}
            />
          </div>
          <div className="mt-4">
            <Textarea label="Notes" placeholder="Any additional context about this lead..." value={form.notes} onChange={set('notes')} rows={3} />
          </div>
        </Card>

        {/* Active custom modules for leads */}
        {leadModules.map(m => (
          <Card key={m.id} className="p-6">
            <SectionLabel>{m.name}</SectionLabel>
            <ModuleFields
              module={m}
              values={customData[m.id] || {}}
              onChangeField={(fieldId, v) => setCustomField(m.id, fieldId, v)}
            />
          </Card>
        ))}

      </form>
    </div>
  )
}
