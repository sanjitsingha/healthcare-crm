'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Building2, Globe, Phone, MapPin } from 'lucide-react'
import { Button, Card, Badge, Modal, Input, Select, Textarea, TagsInput, EmptyState, Spinner } from '@/components/ui'
import { getOrganizations, createOrganization } from '@/lib/supabase/queries'
import Link from 'next/link'

const ORG_TYPES = ['Hospital', 'Clinic', 'Pharmacy', 'Lab', 'Insurance', 'Other']
const TYPE_COLORS = {
  Hospital: 'bg-blue-50 text-blue-700', Clinic: 'bg-emerald-50 text-emerald-700',
  Pharmacy: 'bg-amber-50 text-amber-700', Lab: 'bg-purple-50 text-purple-700',
  Insurance: 'bg-orange-50 text-orange-700', Other: 'bg-gray-50 text-gray-600',
}

function CreateOrgModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', type: 'Clinic', email: '', phone: '', website: '', address: '', city: '', state: '', pincode: '', tags: [], notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const org = await createOrganization(form)
      onCreated(org)
      setForm({ name: '', type: 'Clinic', email: '', phone: '', website: '', address: '', city: '', state: '', pincode: '', tags: [], notes: '' })
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Organization" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Organization Name *" placeholder="Apollo Hospital" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            options={ORG_TYPES.map(t => ({ value: t, label: t }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Email" type="email" placeholder="info@apollo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <Input label="Website" placeholder="https://apollo.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
        <Input label="Address" placeholder="Street address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="City" placeholder="Mumbai" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          <Input label="State" placeholder="Maharashtra" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
          <Input label="Pincode" placeholder="400001" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Tags</label>
          <TagsInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
        </div>
        <Textarea label="Notes" placeholder="Additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Organization'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const loadOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getOrganizations({ search })
      setOrgs((data || []).filter(o => !typeFilter || o.type === typeFilter))
    } catch { setOrgs([]) }
    setLoading(false)
  }, [search, typeFilter])

  useEffect(() => {
    loadOrgs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Organizations</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{orgs.length} organizations</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Organization</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2"
            placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setTypeFilter('')}
            className="px-3 py-1.5 rounded-lg text-xs font-500 border transition-all"
            style={typeFilter === '' ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' } : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
            All
          </button>
          {ORG_TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t === typeFilter ? '' : t)}
              className="px-3 py-1.5 rounded-lg text-xs font-500 border transition-all"
              style={typeFilter === t ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' } : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : orgs.length === 0 ? (
        <EmptyState icon={Building2} title="No organizations yet" description="Add hospitals, clinics, and other healthcare organizations" action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} /> Add Organization</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map(org => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                    <Building2 size={18} style={{ color: 'var(--color-brand)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{org.name}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-500 mt-0.5 ${TYPE_COLORS[org.type] || TYPE_COLORS.Other}`}>{org.type}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {(org.city || org.state) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} style={{ color: 'var(--color-text-muted)' }} />
                      <span className="truncate">{[org.city, org.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {org.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={11} style={{ color: 'var(--color-text-muted)' }} />
                      <span>{org.phone}</span>
                    </div>
                  )}
                  {org.website && (
                    <div className="flex items-center gap-1.5">
                      <Globe size={11} style={{ color: 'var(--color-text-muted)' }} />
                      <span className="truncate">{org.website.replace(/^https?:\/\//, '')}</span>
                    </div>
                  )}
                </div>
                {org.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {org.tags.slice(0, 3).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] font-500" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateOrgModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={org => setOrgs(prev => [org, ...prev])} />
    </div>
  )
}
