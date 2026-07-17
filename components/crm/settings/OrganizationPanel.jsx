'use client'
import { useState } from 'react'
import { Building2, Phone, MapPin, Globe, Check, Save } from 'lucide-react'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import clsx from 'clsx'


const ORG_TYPES = ['Clinic', 'Hospital', 'Pharmacy', 'Lab', 'Dental Clinic', 'Diagnostic Center', 'Wellness Center', 'Other']
const CLINICAL_TYPES = ['Clinic', 'Hospital', 'Dental Clinic', 'Diagnostic Center', 'Wellness Center']

const INDIAN_STATES = [
  '', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
].map(s => ({ value: s, label: s || 'Select state...' }))

const SPECIALTIES = [
  '', 'General Medicine', 'Cardiology', 'Dermatology', 'ENT', 'Gastroenterology',
  'Gynecology & Obstetrics', 'Nephrology', 'Neurology', 'Oncology', 'Ophthalmology',
  'Orthopedics', 'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology',
  'Rheumatology', 'Urology', 'Other',
].map(s => ({ value: s, label: s || 'Select specialty...' }))

function SectionHead({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-4 pb-4 border-b border-(--color-border)">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
        <Icon size={16} style={{ color: 'var(--color-brand)' }} />
      </div>
      <div>
        <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {description && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      </div>
    </div>
  )
}

export default function OrganizationPanel() {
  const { org, orgId } = useOrg()
  const s = org?.settings || {}

  const [form, setForm] = useState(() => ({
    name: org?.name || '',
    type: org?.type || 'Clinic',
    phone: org?.phone || '',
    email: org?.email || '',
    website: org?.website || '',
    address: org?.address || '',
    city: org?.city || '',
    state: org?.state || '',
    pincode: org?.pincode || '',
    specialty: s.specialty || '',
    registration_number: s.registration_number || '',
    staff_count: s.staff_count || '',
    logo_url: s.logo_url || '',
    about: s.about || '',
    social_facebook: s.social_facebook || '',
    social_instagram: s.social_instagram || '',
    social_whatsapp: s.social_whatsapp || '',
    social_linkedin: s.social_linkedin || '',
    social_twitter: s.social_twitter || '',
  }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    if (!orgId || !form.name.trim()) return
    setSaving(true)
    try {
      const {
        specialty, registration_number, staff_count, logo_url, about,
        social_facebook, social_instagram, social_whatsapp, social_linkedin, social_twitter,
        ...direct
      } = form
      await updateOrganization(orgId, {
        ...direct,
        settings: {
          ...(org?.settings || {}),
          specialty, registration_number, staff_count: staff_count ? Number(staff_count) : null,
          logo_url, about,
          social_facebook, social_instagram, social_whatsapp, social_linkedin, social_twitter,
        },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const showSpecialty = CLINICAL_TYPES.includes(form.type)

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHead icon={Building2} title="Organization Profile" description="Basic identity and branding of your organization" />
        <div className="space-y-4">
          {form.logo_url && (
            <img
              src={form.logo_url}
              alt="Logo"
              className="w-16 h-16 rounded-xl object-cover border border-(--color-border)"
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <Input label="Logo URL" placeholder="https://example.com/logo.png" value={form.logo_url} onChange={set('logo_url')} />
          <Input label="Organization Name *" value={form.name} onChange={set('name')} required />
          <div className={clsx('grid gap-4', showSpecialty ? 'grid-cols-2' : 'grid-cols-1 max-w-xs')}>
            <Select label="Organization Type" value={form.type} onChange={set('type')} options={ORG_TYPES.map(t => ({ value: t, label: t }))} />
            {showSpecialty && <Select label="Specialty" value={form.specialty} onChange={set('specialty')} options={SPECIALTIES} />}
          </div>
          <Textarea label="About" placeholder="Tell patients and partners about your organization..." value={form.about} onChange={set('about')} rows={3} />
        </div>
      </Card>

      <Card className="p-5">
        <SectionHead icon={Building2} title="Registration Details" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Registration / License Number" placeholder="MCI-XXXX-XXXX" value={form.registration_number} onChange={set('registration_number')} />
          <Input label="Staff Count" type="number" placeholder="25" value={form.staff_count} onChange={set('staff_count')} />
        </div>
      </Card>

      <Card className="p-5">
        <SectionHead icon={Phone} title="Contact Information" />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
            <Input label="Email" type="email" placeholder="info@clinic.in" value={form.email} onChange={set('email')} />
          </div>
          <Input label="Website" placeholder="https://clinic.in" value={form.website} onChange={set('website')} />
        </div>
      </Card>

      <Card className="p-5">
        <SectionHead icon={MapPin} title="Location" />
        <div className="space-y-4">
          <Input label="Street Address" placeholder="123 MG Road" value={form.address} onChange={set('address')} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" placeholder="Mumbai" value={form.city} onChange={set('city')} />
            <Select label="State" value={form.state} onChange={set('state')} options={INDIAN_STATES} />
            <Input label="Pincode" placeholder="400001" value={form.pincode} onChange={set('pincode')} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHead icon={Globe} title="Social Media" description="Help patients find you online" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Facebook" placeholder="https://facebook.com/yourclinic" value={form.social_facebook} onChange={set('social_facebook')} />
          <Input label="Instagram" placeholder="https://instagram.com/yourclinic" value={form.social_instagram} onChange={set('social_instagram')} />
          <Input label="WhatsApp" placeholder="+91 98765 43210" value={form.social_whatsapp} onChange={set('social_whatsapp')} />
          <Input label="LinkedIn" placeholder="https://linkedin.com/company/..." value={form.social_linkedin} onChange={set('social_linkedin')} />
          <Input label="Twitter / X" placeholder="https://twitter.com/yourclinic" value={form.social_twitter} onChange={set('social_twitter')} />
        </div>
      </Card>

      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
        </Button>
      </div>
    </div>
  )
}
