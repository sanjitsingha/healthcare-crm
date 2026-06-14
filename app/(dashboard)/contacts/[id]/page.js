'use client'
import { useEffect, useState, use } from 'react'
import { ArrowLeft, Edit2, Trash2, Mail, Phone, Building2, TrendingUp, Plus } from 'lucide-react'
import { Button, Badge, Card, Avatar, Tag, Spinner, Input, Select, Textarea, TagsInput, Modal } from '@/components/ui'
import { getContact, updateContact, deleteContact, getActivities, createActivity } from '@/lib/supabase/queries'
import { showConfirm } from '@/lib/confirm'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { MessageSquare, Phone as PhoneIcon } from 'lucide-react'

export default function ContactDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [contact, setContact] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [commentType, setCommentType] = useState('comment')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    Promise.all([getContact(id), getActivities('contact', id)]).then(([c, a]) => {
      setContact(c); setEditForm(c || {}); setActivities(a || [])
    }).finally(() => setLoading(false))
  }, [id])

  const handleComment = async () => {
    if (!commentText.trim()) return
    const a = await createActivity({ entity_type: 'contact', entity_id: id, type: commentType, content: commentText, created_by: 'You' })
    setActivities(prev => [a, ...prev])
    setCommentText('')
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    const updated = await updateContact(id, editForm)
    setContact(updated)
    setEditOpen(false)
  }

  const handleDelete = async () => {
    const ok = await showConfirm({ title: 'Delete this contact?', message: 'This cannot be undone.', confirmLabel: 'Delete contact' })
    if (!ok) return
    await deleteContact(id)
    router.push('/contacts')
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (!contact) return <div className="p-6 text-sm">Contact not found</div>

  const fullName = `${contact.first_name} ${contact.last_name || ''}`.trim()

  return (
    <div className="p-6">
      <div className="flex items-start gap-4 mb-6">
        <Link href="/contacts" className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[var(--color-border)] transition-all mt-0.5">
          <ArrowLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </Link>
        <div className="flex-1 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={fullName} size="lg" />
            <div>
              <h1 className="text-lg font-700" style={{ color: 'var(--color-text-primary)' }}>{fullName}</h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {[contact.designation, contact.department].filter(Boolean).join(' · ')}
              </p>
              <Badge className="mt-1">{contact.status}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit2 size={13} /> Edit</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={13} /></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Card>
            <h3 className="text-xs font-600 mb-3" style={{ color: 'var(--color-text-muted)' }}>CONTACT INFO</h3>
            <div className="space-y-3">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <a href={`mailto:${contact.email}`} className="text-sm hover:underline" style={{ color: 'var(--color-brand)' }}>{contact.email}</a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <a href={`tel:${contact.phone}`} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{contact.phone}</a>
                </div>
              )}
              {contact.organizations && (
                <div className="flex items-center gap-2">
                  <Building2 size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <Link href={`/organizations/${contact.organizations.id}`} className="text-sm hover:underline" style={{ color: 'var(--color-brand)' }}>{contact.organizations.name}</Link>
                </div>
              )}
              {contact.tags?.length > 0 && (
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Tags</p>
                  <div className="flex flex-wrap gap-1">{contact.tags.map(t => <Tag key={t} label={t} />)}</div>
                </div>
              )}
              {contact.notes && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{contact.notes}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Linked Leads */}
          {contact.leads?.length > 0 && (
            <Card>
              <h3 className="text-xs font-600 mb-3" style={{ color: 'var(--color-text-muted)' }}>LINKED LEADS ({contact.leads.length})</h3>
              <div className="space-y-2">
                {contact.leads.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <TrendingUp size={13} style={{ color: 'var(--color-brand)' }} />
                    <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{lead.title}</span>
                    <Badge>{lead.stage}</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-sm font-600 mb-4" style={{ color: 'var(--color-text-primary)' }}>Activity</h3>
            <div className="mb-4">
              <div className="flex gap-2 mb-2 flex-wrap">
                {[['comment','Comment'],['call','Call'],['email','Email'],['meeting','Meeting'],['note','Note']].map(([t,l]) => (
                  <button key={t} onClick={() => setCommentType(t)}
                    className="px-3 py-1 rounded-full text-xs font-500 border transition-all"
                    style={commentType === t ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' } : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                    {l}
                  </button>
                ))}
              </div>
              <textarea rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none resize-none"
                placeholder={`Add a ${commentType}...`} value={commentText} onChange={e => setCommentText(e.target.value)} />
              <div className="flex justify-end mt-2"><Button size="sm" onClick={handleComment}>Add</Button></div>
            </div>
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              {activities.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No activity yet</p>
              ) : activities.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="p-2 rounded-lg h-fit" style={{ background: 'var(--color-brand-50)' }}>
                    <MessageSquare size={13} style={{ color: 'var(--color-brand)' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{a.content}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.created_by} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Contact" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" value={editForm.first_name || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} required />
            <Input label="Last Name" value={editForm.last_name || ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Designation" value={editForm.designation || ''} onChange={e => setEditForm(f => ({ ...f, designation: e.target.value }))} />
            <Input label="Department" value={editForm.department || ''} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
          </div>
          <Select label="Status" value={editForm.status || 'Active'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
            options={[{value:'Active',label:'Active'},{value:'Inactive',label:'Inactive'}]} />
          <div className="space-y-1">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Tags</label>
            <TagsInput value={editForm.tags || []} onChange={tags => setEditForm(f => ({ ...f, tags }))} />
          </div>
          <Textarea label="Notes" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
