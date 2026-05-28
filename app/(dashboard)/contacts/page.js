'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Users, Mail, Phone, Building2 } from 'lucide-react'
import { Button, Card, Avatar, Badge, Modal, Input, Select, Textarea, TagsInput, EmptyState, Spinner } from '@/components/ui'
import { getContacts, createContact, getOrganizations } from '@/lib/supabase/queries'
import Link from 'next/link'
import { format } from 'date-fns'

const AVATAR_COLORS = ['#0f6e56', '#1d4ed8', '#7c3aed', '#b45309', '#be185d', '#065f46']

function CreateContactModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', designation: '', department: '', tags: [], notes: '' })
  const [orgs, setOrgs] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) getOrganizations().then(setOrgs).catch(() => [])
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim()) return
    setSaving(true)
    try {
      const contact = await createContact({ ...form, organization_id: form.organization_id || null })
      onCreated(contact)
      setForm({ first_name: '', last_name: '', email: '', phone: '', designation: '', department: '', tags: [], notes: '' })
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Contact" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *" placeholder="Rahul" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
          <Input label="Last Name" placeholder="Sharma" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Email" type="email" placeholder="rahul@hospital.in" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Designation" placeholder="Medical Director" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
          <Input label="Department" placeholder="Cardiology" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
        </div>
        <Select label="Organization" value={form.organization_id || ''} onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
          options={[{ value: '', label: 'Select organization...' }, ...orgs.map(o => ({ value: o.id, label: o.name }))]} />
        <div className="space-y-1">
          <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Tags</label>
          <TagsInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
        </div>
        <Textarea label="Notes" placeholder="Any relevant notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Contact'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getContacts({ search })
      setContacts(data || [])
    } catch { setContacts([]) }
    setLoading(false)
  }, [search])

  useEffect(() => { loadContacts() }, [loadContacts])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Contacts</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{contacts.length} contacts</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Contact</Button>
      </div>

      <div className="relative max-w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2"
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : contacts.length === 0 ? (
        <EmptyState icon={Users} title="No contacts yet" description="Add contacts to track your healthcare relationships" action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} /> Add Contact</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contacts.map(contact => (
            <Link key={contact.id} href={`/contacts/${contact.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar name={`${contact.first_name} ${contact.last_name || ''}`} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {contact.first_name} {contact.last_name || ''}
                    </p>
                    {contact.designation && (
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{contact.designation}</p>
                    )}
                  </div>
                </div>
                {contact.organizations?.name && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={12} style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{contact.organizations.name}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Mail size={12} style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{contact.phone}</span>
                  </div>
                )}
                {contact.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {contact.tags.slice(0, 3).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] font-500" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateContactModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={c => { setContacts(prev => [c, ...prev]) }} />
    </div>
  )
}
