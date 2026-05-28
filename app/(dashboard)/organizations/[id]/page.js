'use client'
import { useEffect, useState, use } from 'react'
import { ArrowLeft, Edit2, Trash2, Building2, Users, TrendingUp, Globe, Phone, Mail, MapPin } from 'lucide-react'
import { Button, Badge, Card, Avatar, Tag, Spinner, Input, Select, Textarea, TagsInput, Modal } from '@/components/ui'
import { getOrganization, updateOrganization, deleteOrganization, getActivities, createActivity } from '@/lib/supabase/queries'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { MessageSquare } from 'lucide-react'

const ORG_TYPES = ['Hospital', 'Clinic', 'Pharmacy', 'Lab', 'Insurance', 'Other']

export default function OrgDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [org, setOrg] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    Promise.all([getOrganization(id), getActivities('organization', id)]).then(([o, a]) => {
      setOrg(o); setEditForm(o || {}); setActivities(a || [])
    }).finally(() => setLoading(false))
  }, [id])

  const handleComment = async () => {
    if (!commentText.trim()) return
    const a = await createActivity({ entity_type: 'organization', entity_id: id, type: 'comment', content: commentText, created_by: 'You' })
    setActivities(prev => [a, ...prev]); setCommentText('')
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    const updated = await updateOrganization(id, editForm)
    setOrg(prev => ({ ...prev, ...updated }))
    setEditOpen(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this organization?')) return
    await deleteOrganization(id); router.push('/organizations')
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (!org) return <div className="p-6 text-sm">Organization not found</div>

  return (
    <div className="p-6">
      <div className="flex items-start gap-4 mb-6">
        <Link href="/organizations" className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[var(--color-border)] transition-all mt-0.5">
          <ArrowLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </Link>
        <div className="flex-1 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
              <Building2 size={22} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <h1 className="text-lg font-700" style={{ color: 'var(--color-text-primary)' }}>{org.name}</h1>
              <div className="flex gap-2 mt-1"><Badge>{org.type}</Badge><Badge>{org.status}</Badge></div>
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
            <div className="space-y-3 text-sm">
              {org.email && <div className="flex items-center gap-2"><Mail size={14} style={{ color: 'var(--color-text-muted)' }} /><a href={`mailto:${org.email}`} className="hover:underline" style={{ color: 'var(--color-brand)' }}>{org.email}</a></div>}
              {org.phone && <div className="flex items-center gap-2"><Phone size={14} style={{ color: 'var(--color-text-muted)' }} /><span style={{ color: 'var(--color-text-secondary)' }}>{org.phone}</span></div>}
              {org.website && <div className="flex items-center gap-2"><Globe size={14} style={{ color: 'var(--color-text-muted)' }} /><a href={org.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" style={{ color: 'var(--color-brand)' }}>{org.website}</a></div>}
              {(org.address || org.city) && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                  <span style={{ color: 'var(--color-text-secondary)' }} className="text-xs leading-relaxed">
                    {[org.address, org.city, org.state, org.pincode].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
            {org.tags?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Tags</p>
                <div className="flex flex-wrap gap-1">{org.tags.map(t => <Tag key={t} label={t} />)}</div>
              </div>
            )}
            {org.notes && (
              <div className="mt-4">
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{org.notes}</p>
              </div>
            )}
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center p-3">
              <p className="text-2xl font-700" style={{ color: 'var(--color-brand)' }}>{org.contacts?.length || 0}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Contacts</p>
            </Card>
            <Card className="text-center p-3">
              <p className="text-2xl font-700" style={{ color: 'var(--color-brand)' }}>{org.leads?.length || 0}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Leads</p>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Contacts */}
          {org.contacts?.length > 0 && (
            <Card>
              <h3 className="text-sm font-600 mb-3" style={{ color: 'var(--color-text-primary)' }}>Contacts ({org.contacts.length})</h3>
              <div className="space-y-2">
                {org.contacts.map(c => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <Avatar name={`${c.first_name} ${c.last_name || ''}`} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-500" style={{ color: 'var(--color-text-primary)' }}>{c.first_name} {c.last_name || ''}</p>
                      {c.designation && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.designation}</p>}
                    </div>
                    {c.email && <p className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>{c.email}</p>}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Leads */}
          {org.leads?.length > 0 && (
            <Card>
              <h3 className="text-sm font-600 mb-3" style={{ color: 'var(--color-text-primary)' }}>Leads ({org.leads.length})</h3>
              <div className="space-y-2">
                {org.leads.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <TrendingUp size={14} style={{ color: 'var(--color-brand)' }} />
                    <p className="text-sm font-500 flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{lead.title}</p>
                    <Badge>{lead.stage}</Badge>
                    {lead.value > 0 && <span className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>₹{(lead.value/1000).toFixed(0)}K</span>}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Activity */}
          <Card>
            <h3 className="text-sm font-600 mb-4" style={{ color: 'var(--color-text-primary)' }}>Activity</h3>
            <div className="mb-4">
              <textarea rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none resize-none"
                placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
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
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Organization" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name *" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            <Select label="Type" value={editForm.type || 'Clinic'} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
              options={ORG_TYPES.map(t => ({ value: t, label: t }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <Input label="Website" value={editForm.website || ''} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} />
          <Input label="Address" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" value={editForm.city || ''} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
            <Input label="State" value={editForm.state || ''} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} />
            <Input label="Pincode" value={editForm.pincode || ''} onChange={e => setEditForm(f => ({ ...f, pincode: e.target.value }))} />
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
