'use client'
import { useState, useEffect } from 'react'
import {
  Building2, Users, Tags, LogOut, Plus, Trash2, Save,
  Check, Globe, Phone, MapPin, X, LayoutGrid, GripVertical, ToggleLeft, ToggleRight, UserRound,
} from 'lucide-react'
import { Button, Card, Input, Select, Textarea, Spinner, Avatar } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization, getTags, createTag, deleteTag } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

const TABS = [
  { id: 'account',      label: 'Account',      icon: UserRound },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'people',       label: 'People',       icon: Users },
  { id: 'tags',         label: 'Tags',         icon: Tags },
  { id: 'modules',      label: 'Modules',      icon: LayoutGrid },
]

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

// ── Organization Tab ────────────────────────────────────────────
function AccountTab({ user }) {
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || 'Not available'

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHead icon={UserRound} title="Account" description="Your signed-in account details" />
        <div className="flex items-center gap-3 p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
          <Avatar name={displayName} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{displayEmail}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Organization Tab ────────────────────────────────────────────
function OrganizationTab({ org, orgId }) {
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

// ── People Tab ──────────────────────────────────────────────────
function PeopleTab({ orgId, org }) {
  const [staff, setStaff] = useState(() => org?.settings?.staff_members || [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', designation: '' })
  const [saving, setSaving] = useState(false)

  const resetForm = () => { setForm({ name: '', designation: '' }); setShowForm(false) }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !orgId) return
    setSaving(true)
    const newMember = { id: crypto.randomUUID(), name: form.name.trim(), designation: form.designation.trim() }
    const updated = [...staff, newMember]
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), staff_members: updated } })
      setStaff(updated)
      resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this team member?')) return
    const updated = staff.filter(m => m.id !== id)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), staff_members: updated } })
      setStaff(updated)
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Users size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Team Members</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Staff and team members in your organization</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add Member
            </Button>
          )}
        </div>

        {/* Inline add form */}
        {showForm && (
          <form
            onSubmit={handleAdd}
            className="flex items-end gap-3 mb-4 p-4 rounded-xl border border-(--color-border)"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <div className="flex-1">
              <Input
                label="Full Name *"
                placeholder="Dr. Ramesh Kumar"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex-1">
              <Input
                label="Designation"
                placeholder="General Physician"
                value={form.designation}
                onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
                {saving ? 'Adding...' : 'Add'}
              </Button>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
              >
                <X size={15} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
          </form>
        )}

        {/* Member list */}
        {staff.length === 0 && !showForm ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No team members added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {staff.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-(--color-border) group"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <Avatar name={m.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{m.name}</p>
                  {m.designation && <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{m.designation}</p>}
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Tags Tab ────────────────────────────────────────────────────
function TagsTab({ orgId }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', color: '#6366f1', page: 'leads' })
  const [saving, setSaving] = useState(false)

  const PRESET_COLORS = ['#6366f1', '#0f6e56', '#1d4ed8', '#7c3aed', '#b45309', '#be185d', '#ef4444', '#f59e0b', '#10b981']

  const loadTags = async () => {
    if (!orgId) return
    setLoading(true)
    try { setTags(await getTags(orgId) || []) } catch { setTags([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTags() }, [orgId])

  const resetForm = () => { setNewTag({ name: '', color: '#6366f1', page: 'leads' }); setShowForm(false) }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTag.name.trim() || !orgId) return
    setSaving(true)
    try {
      await createTag({ ...newTag, organization_id: orgId })
      await loadTags()
      resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this tag? It will be removed from all leads and patients.')) return
    try {
      await deleteTag(id)
      setTags(prev => prev.filter(t => t.id !== id))
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Tags size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Tag Management</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Organize leads and patients with custom tags</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} className="shrink-0">
              <Plus size={15} /> New Tag
            </Button>
          )}
        </div>

        {/* Inline create form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="flex items-end gap-4 mb-4 p-4 rounded-xl border border-(--color-border) flex-wrap"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <div className="flex-1 min-w-40">
              <Input
                label="Tag Name *"
                placeholder="e.g. VIP Patient"
                value={newTag.name}
                onChange={e => setNewTag(t => ({ ...t, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTag(t => ({ ...t, color: c }))}
                      className="w-5 h-5 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: newTag.color === c ? 'white' : 'transparent',
                        outline: newTag.color === c ? `2px solid ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={newTag.color}
                  onChange={e => setNewTag(t => ({ ...t, color: e.target.value }))}
                  className="w-7 h-7 rounded border border-(--color-border) p-0.5 cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-1.5 min-w-36">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>For Page *</label>
              <div className="flex rounded-lg overflow-hidden border border-(--color-border)">
                {PAGE_OPTS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewTag(t => ({ ...t, page: value }))}
                    className="px-3 py-2 text-xs font-600 transition-all"
                    style={newTag.page === value
                      ? { background: 'var(--color-brand)', color: 'white' }
                      : { color: 'var(--color-text-muted)', background: 'transparent' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-500 self-end mb-0.5"
              style={{ background: newTag.color + '20', color: newTag.color }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: newTag.color }} />
              {newTag.name || 'Preview'}
            </div>
            <div className="flex gap-2 self-end mb-0.5">
              <Button type="submit" size="sm" disabled={saving || !newTag.name.trim()}>
                {saving ? 'Creating...' : 'Create'}
              </Button>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
              >
                <X size={15} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={24} /></div>
        ) : tags.length === 0 ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <Tags size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No tags yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 rounded-xl border border-(--color-border) group"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{tag.name}</span>
                </div>
                <span
                  className="text-[10px] font-600 px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                >
                  {tag.page || 'leads'}
                </span>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Modules Tab ─────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'text',     label: 'Text' },
  { value: 'number',   label: 'Number' },
  { value: 'date',     label: 'Date' },
  { value: 'phone',    label: 'Phone' },
  { value: 'email',    label: 'Email' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'boolean',  label: 'Yes / No' },
]

const PAGE_OPTS = [
  { value: 'leads',    label: 'Leads' },
  { value: 'patients', label: 'Patients' },
]

const blankForm = () => ({ name: '', page: 'leads', fields: [] })
const blankField = () => ({ id: crypto.randomUUID(), label: '', type: 'text', required: false, options: '' })

function ModulesTab({ org, orgId }) {
  const [modules, setModules] = useState(() => org?.settings?.modules || [])
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(blankForm())
  const [saving, setSaving]       = useState(false)

  const persist = async (updated) => {
    await updateOrganization(orgId, { settings: { ...(org?.settings || {}), modules: updated } })
    setModules(updated)
  }

  const handleToggle = async (id) => {
    await persist(modules.map(m => m.id === id ? { ...m, active: !m.active } : m))
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this module? Custom data already saved will remain but won\'t be shown.')) return
    await persist(modules.filter(m => m.id !== id))
  }

  const startCreate = () => { setEditingId(null); setForm(blankForm()); setShowForm(true) }
  const startEdit   = (m) => { setEditingId(m.id); setForm({ name: m.name, page: m.page, fields: m.fields.map(f => ({ ...f })) }); setShowForm(true) }
  const cancelForm  = () => { setShowForm(false); setEditingId(null); setForm(blankForm()) }

  const addField    = () => setForm(f => ({ ...f, fields: [...f.fields, blankField()] }))
  const removeField = (fid) => setForm(f => ({ ...f, fields: f.fields.filter(x => x.id !== fid) }))
  const setField    = (fid, key, val) => setForm(f => ({
    ...f,
    fields: f.fields.map(x => x.id === fid ? { ...x, [key]: val } : x),
  }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || form.fields.length === 0) return
    setSaving(true)
    try {
      const validFields = form.fields.filter(f => f.label.trim())
      if (!validFields.length) { alert('Add at least one field with a label.'); setSaving(false); return }
      const mod = {
        id:     editingId || crypto.randomUUID(),
        name:   form.name.trim(),
        page:   form.page,
        active: editingId ? (modules.find(m => m.id === editingId)?.active ?? true) : true,
        fields: validFields,
      }
      await persist(editingId
        ? modules.map(m => m.id === editingId ? mod : m)
        : [...modules, mod]
      )
      cancelForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <LayoutGrid size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Custom Modules</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Add custom sections and fields to Leads or Patients pages</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={startCreate}><Plus size={15} /> Create Module</Button>
          )}
        </div>

        {/* Inline form */}
        {showForm && (
          <form onSubmit={handleSave} className="mb-5 p-4 rounded-xl border border-(--color-border) space-y-4" style={{ background: 'var(--color-surface-2)' }}>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Input
                  label="Module Name *"
                  placeholder="e.g. Insurance Details, Vitals, Emergency Contact"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5 shrink-0">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>For Page</label>
                <div className="flex rounded-lg overflow-hidden border border-(--color-border)">
                  {PAGE_OPTS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, page: value }))}
                      className="px-4 py-2 text-xs font-600 transition-all"
                      style={form.page === value
                        ? { background: 'var(--color-brand)', color: 'white' }
                        : { color: 'var(--color-text-muted)', background: 'transparent' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fields builder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>Fields</label>
                <button type="button" onClick={addField} className="flex items-center gap-1 text-xs font-600 transition-opacity hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
                  <Plus size={13} /> Add Field
                </button>
              </div>

              {form.fields.length === 0 ? (
                <div className="py-6 text-center border border-dashed rounded-lg border-(--color-border)">
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No fields yet. Click "Add Field" above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.fields.map(field => (
                    <div key={field.id} className="flex items-end gap-2 p-3 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
                      <GripVertical size={14} className="mb-2 shrink-0 opacity-30" />
                      <div className="flex-1">
                        <Input
                          label="Label"
                          placeholder="Field name"
                          value={field.label}
                          onChange={e => setField(field.id, 'label', e.target.value)}
                        />
                      </div>
                      <div className="w-36">
                        <Select
                          label="Type"
                          value={field.type}
                          onChange={e => setField(field.id, 'type', e.target.value)}
                          options={FIELD_TYPES}
                        />
                      </div>
                      {field.type === 'select' && (
                        <div className="flex-1">
                          <Input
                            label="Options (comma separated)"
                            placeholder="Option A, Option B, Option C"
                            value={field.options}
                            onChange={e => setField(field.id, 'options', e.target.value)}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                        <label className="text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Required</label>
                        <button
                          type="button"
                          onClick={() => setField(field.id, 'required', !field.required)}
                          style={{ color: field.required ? 'var(--color-brand)' : 'var(--color-text-muted)' }}
                        >
                          {field.required ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </div>
                      <button type="button" onClick={() => removeField(field.id)} className="mb-1.5 shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
              <Button variant="secondary" type="button" onClick={cancelForm}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name.trim() || form.fields.length === 0}>
                {saving ? 'Saving...' : editingId ? 'Update Module' : 'Save Module'}
              </Button>
            </div>
          </form>
        )}

        {/* Module list */}
        {modules.length === 0 && !showForm ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <LayoutGrid size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No modules yet. Create one to add custom fields to Leads or Patients.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map(m => (
              <div key={m.id} className="rounded-xl border border-(--color-border) overflow-hidden">
                {/* Module header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--color-surface-2)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{m.name}</span>
                    <span
                      className="text-[10px] font-600 px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                    >
                      {m.page}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{m.fields.length} field{m.fields.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggle(m.id)}
                      className="flex items-center gap-1.5 text-xs font-600 px-2.5 py-1 rounded-full border transition-all"
                      style={m.active
                        ? { background: '#dcfce7', color: '#16a34a', borderColor: '#bbf7d0' }
                        : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                    >
                      {m.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {m.active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      <Save size={13} />
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {/* Fields preview */}
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {m.fields.map(f => (
                    <span key={f.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-(--color-border)" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
                      {f.label}
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-600" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                        {FIELD_TYPES.find(t => t.value === f.type)?.label || f.type}
                      </span>
                      {f.required && <span className="text-red-400 text-[10px]">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Main Settings Page ──────────────────────────────────────────
export default function SettingsPage() {
  const { org, user, orgId } = useOrg()
  const [tab, setTab] = useState('organization')
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Left settings nav — sticky */}
      <aside
        className="w-52 shrink-0 border-r border-(--color-border) sticky top-0 h-screen flex flex-col p-4"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="mb-6">
          <h2 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage your workspace</p>
        </div>

        <nav className="space-y-0.5 flex-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left font-medium transition-all',
                tab === id ? 'text-white' : 'hover:bg-(--color-brand-50)'
              )}
              style={tab === id
                ? { background: 'var(--color-brand)', color: 'white' }
                : { color: 'var(--color-text-secondary)' }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="border-t border-(--color-border) pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all hover:bg-red-50 group"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <LogOut size={16} className="group-hover:text-red-500 transition-colors" />
            <span className="group-hover:text-red-500 transition-colors">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {tab === 'account'      && <AccountTab user={user} />}
        {tab === 'organization' && <OrganizationTab org={org} orgId={orgId} />}
        {tab === 'people'       && <PeopleTab orgId={orgId} org={org} />}
        {tab === 'tags'         && <TagsTab orgId={orgId} />}
        {tab === 'modules'      && <ModulesTab orgId={orgId} org={org} />}
      </div>
    </div>
  )
}
