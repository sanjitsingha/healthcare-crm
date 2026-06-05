'use client'
import { useState } from 'react'
import { Building2, Phone, MapPin, Globe, Check, Save, Hash, GripVertical, X, Plus, Type, Calendar, ListOrdered, Minus } from 'lucide-react'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { DATE_FORMATS, SEPARATORS, DEFAULT_ID_FORMAT, toTokens, buildPatientCode } from '@/lib/patientId'
import clsx from 'clsx'

const uid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2))
const TOKEN_META = {
  text:      { label: 'Text',      icon: Type,        color: '#0ea5e9' },
  date:      { label: 'Date',      icon: Calendar,    color: '#7c3aed' },
  seq:       { label: 'Sequence',  icon: ListOrdered, color: '#0f6e56' },
  separator: { label: 'Separator', icon: Minus,       color: '#b45309' },
}

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

export default function OrganizationPage() {
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
  const [idFormat, setIdFormat] = useState(() => {
    const saved = org?.settings?.patient_id_format
    return {
      enabled: saved?.enabled || false,
      next_seq: saved?.next_seq || 1,
      tokens: saved ? toTokens(saved) : DEFAULT_ID_FORMAT.tokens,
    }
  })
  const setIdf = (k, v) => setIdFormat(f => ({ ...f, [k]: v }))
  const [dragIdx, setDragIdx] = useState(null)

  const addToken = (type) => {
    const defaults = { text: '', date: 'YYYYMMDD', seq: 4, separator: '-' }
    setIdFormat(f => ({ ...f, tokens: [...f.tokens, { id: uid(), type, value: defaults[type] }] }))
  }
  const updateToken = (id, value) => setIdFormat(f => ({ ...f, tokens: f.tokens.map(t => t.id === id ? { ...t, value } : t) }))
  const removeToken = (id) => setIdFormat(f => ({ ...f, tokens: f.tokens.filter(t => t.id !== id) }))
  const reorderTokens = (from, to) => setIdFormat(f => {
    const next = [...f.tokens]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return { ...f, tokens: next }
  })

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
          patient_id_format: { enabled: idFormat.enabled, next_seq: Number(idFormat.next_seq) || 1, tokens: idFormat.tokens },
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

      <Card className="p-5">
        <SectionHead icon={Hash} title="Patient ID Format" description="Auto-generate a unique code for every new patient" />

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={!!idFormat.enabled} onChange={e => setIdf('enabled', e.target.checked)}
            className="w-4 h-4" style={{ accentColor: 'var(--color-brand)' }} />
          <span className="text-sm font-500" style={{ color: 'var(--color-text-primary)' }}>Enable auto patient IDs</span>
        </label>

        {idFormat.enabled && (
          <>
            {/* Add-block buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(TOKEN_META).map(([type, m]) => {
                const Icon = m.icon
                return (
                  <button key={type} type="button" onClick={() => addToken(type)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-600 transition-colors hover:bg-(--color-surface-2)"
                    style={{ borderColor: 'var(--color-border)', color: m.color, background: 'var(--color-surface)' }}>
                    <Plus size={12} /> <Icon size={12} /> {m.label}
                  </button>
                )
              })}
            </div>

            {/* Token builder (drag to reorder) */}
            <p className="text-[10px] font-600 uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Format blocks — drag to reorder</p>
            {idFormat.tokens.length === 0 ? (
              <div className="py-6 text-center border border-dashed rounded-xl border-(--color-border) mb-4">
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No blocks yet. Add Text, Date, Sequence or Separator above.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {idFormat.tokens.map((tok, i) => {
                  const m = TOKEN_META[tok.type]; const Icon = m.icon
                  return (
                    <div key={tok.id}
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => { if (dragIdx !== null && dragIdx !== i) reorderTokens(dragIdx, i); setDragIdx(null) }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border"
                      style={{ borderColor: m.color + '60', background: m.color + '0d' }}>
                      <GripVertical size={13} className="cursor-grab active:cursor-grabbing shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                      <Icon size={12} style={{ color: m.color }} />
                      {tok.type === 'text' && (
                        <input value={tok.value} onChange={e => updateToken(tok.id, e.target.value)} placeholder="ABC / 2026"
                          className="w-20 px-2 py-1 text-xs rounded border outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      )}
                      {tok.type === 'date' && (
                        <select value={tok.value} onChange={e => updateToken(tok.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                          {Object.entries(DATE_FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      )}
                      {tok.type === 'seq' && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <input type="number" min="1" max="10" value={tok.value} onChange={e => updateToken(tok.id, e.target.value)}
                            className="w-12 px-2 py-1 text-xs rounded border outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                          digits
                        </span>
                      )}
                      {tok.type === 'separator' && (
                        <select value={tok.value} onChange={e => updateToken(tok.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                          {SEPARATORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      )}
                      <button type="button" onClick={() => removeToken(tok.id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0"><X size={12} /></button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Next number</label>
                <input type="number" min="1" value={idFormat.next_seq} onChange={e => setIdf('next_seq', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>The next patient uses this number, then it increments.</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Preview</label>
                <div className="px-3 py-2 rounded-lg border text-sm font-mono font-600" style={{ borderColor: 'var(--color-brand)', background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                  {buildPatientCode(idFormat, Number(idFormat.next_seq) || 1) || '—'}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
        </Button>
      </div>
    </div>
  )
}
