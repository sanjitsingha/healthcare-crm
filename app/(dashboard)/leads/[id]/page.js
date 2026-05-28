'use client'
import { useEffect, useState, use } from 'react'
import { ArrowLeft, Edit2, Trash2, Plus, MessageSquare, Phone, Mail, Calendar, Clock, CheckSquare, Bell, Building2, User, Tag } from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Select, Textarea, TagsInput, Avatar, Spinner, Tag as TagComp } from '@/components/ui'
import { getLead, updateLead, deleteLead, getActivities, createActivity, getTasks, createTask, updateTask, getFollowups, createFollowup, updateFollowup } from '@/lib/supabase/queries'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
const ACTIVITY_ICONS = { comment: MessageSquare, call: Phone, email: Mail, meeting: Calendar, note: Edit2 }

function ActivityItem({ a }) {
  const Icon = ACTIVITY_ICONS[a.type] || MessageSquare
  return (
    <div className="flex gap-3">
      <div className="p-2 rounded-lg h-fit" style={{ background: 'var(--color-brand-50)' }}>
        <Icon size={13} style={{ color: 'var(--color-brand)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{a.content}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {a.created_by} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

export default function LeadDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [tasks, setTasks] = useState([])
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentType, setCommentType] = useState('comment')
  const [taskModal, setTaskModal] = useState(false)
  const [followupModal, setFollowupModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', due_date: '' })
  const [newFollowup, setNewFollowup] = useState({ type: 'Call', scheduled_at: '', notes: '' })
  const [activeTab, setActiveTab] = useState('activity')

  const loadAll = async () => {
    setLoading(true)
    try {
      const [l, a, t, f] = await Promise.all([
        getLead(id),
        getActivities('lead', id),
        getTasks({ entityType: 'lead', entityId: id }),
        getFollowups({ leadId: id }),
      ])
      setLead(l); setActivities(a || []); setTasks(t || []); setFollowups(f || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  const handleStageChange = async (stage) => {
    try {
      const updated = await updateLead(id, { stage })
      setLead(updated)
      await createActivity({ entity_type: 'lead', entity_id: id, type: 'status_change', content: `Stage changed to ${stage}`, created_by: 'You' })
      setActivities(prev => [{ entity_type: 'lead', entity_id: id, type: 'status_change', content: `Stage changed to ${stage}`, created_by: 'You', created_at: new Date().toISOString() }, ...prev])
    } catch (e) { alert(e.message) }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    try {
      const a = await createActivity({ entity_type: 'lead', entity_id: id, type: commentType, content: commentText, created_by: 'You' })
      setActivities(prev => [a, ...prev])
      setCommentText('')
    } catch (e) { alert(e.message) }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    try {
      const t = await createTask({ ...newTask, entity_type: 'lead', entity_id: id })
      setTasks(prev => [t, ...prev])
      setTaskModal(false)
      setNewTask({ title: '', priority: 'Medium', due_date: '' })
    } catch (e) { alert(e.message) }
  }

  const handleCreateFollowup = async (e) => {
    e.preventDefault()
    if (!newFollowup.scheduled_at) return
    try {
      const f = await createFollowup({ ...newFollowup, lead_id: id, contact_id: lead?.contact_id })
      setFollowups(prev => [f, ...prev])
      setFollowupModal(false)
      setNewFollowup({ type: 'Call', scheduled_at: '', notes: '' })
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this lead?')) return
    await deleteLead(id)
    router.push('/leads')
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (!lead) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Lead not found</div>

  return (
    <div className="p-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/leads" className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[var(--color-border)] transition-all mt-0.5">
          <ArrowLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-700" style={{ color: 'var(--color-text-primary)' }}>{lead.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge>{lead.stage}</Badge>
                <Badge>{lead.priority}</Badge>
                {lead.value > 0 && (
                  <span className="text-sm font-600" style={{ color: 'var(--color-brand)' }}>₹{lead.value.toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit2 size={13} /> Edit</Button>
              <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={13} /> Delete</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Pipeline */}
      <Card className="mb-6">
        <p className="text-xs font-600 mb-3" style={{ color: 'var(--color-text-muted)' }}>PIPELINE STAGE</p>
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
          {STAGES.map((stage, i) => {
            const stageIdx = STAGES.indexOf(lead.stage)
            const isActive = lead.stage === stage
            const isPast = i < stageIdx
            const isLost = lead.stage === 'Lost' && stage !== 'Lost'
            return (
              <button
                key={stage}
                onClick={() => handleStageChange(stage)}
                className={clsx(
                  'flex-1 min-w-16 px-2 py-1.5 text-xs font-500 rounded-lg transition-all whitespace-nowrap',
                  isActive ? 'text-white' : isPast && !isLost ? 'text-white opacity-70' : 'hover:bg-gray-100'
                )}
                style={isActive ? { background: 'var(--color-brand)' } : isPast && !isLost ? { background: 'var(--color-brand-light)' } : { color: 'var(--color-text-secondary)' }}
              >
                {stage}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="space-y-4">
          {/* Lead Info */}
          <Card>
            <h3 className="text-xs font-600 mb-3" style={{ color: 'var(--color-text-muted)' }}>LEAD DETAILS</h3>
            <div className="space-y-3 text-sm">
              {[
                ['Source', lead.source],
                ['Value', lead.value ? `₹${lead.value.toLocaleString()}` : '—'],
                ['Close Date', lead.expected_close_date ? format(new Date(lead.expected_close_date), 'd MMM yyyy') : '—'],
                ['Created', format(new Date(lead.created_at), 'd MMM yyyy')],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span className="font-500" style={{ color: 'var(--color-text-primary)' }}>{v}</span>
                </div>
              ))}
              {lead.tags?.length > 0 && (
                <div>
                  <p className="mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map(t => <TagComp key={t} label={t} />)}
                  </div>
                </div>
              )}
              {lead.description && (
                <div>
                  <p className="mb-1" style={{ color: 'var(--color-text-muted)' }}>Description</p>
                  <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs leading-relaxed">{lead.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Contact */}
          {lead.contacts && (
            <Card>
              <h3 className="text-xs font-600 mb-3" style={{ color: 'var(--color-text-muted)' }}>CONTACT</h3>
              <Link href={`/contacts/${lead.contacts.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Avatar name={`${lead.contacts.first_name} ${lead.contacts.last_name || ''}`} />
                <div>
                  <p className="text-sm font-500" style={{ color: 'var(--color-text-primary)' }}>
                    {lead.contacts.first_name} {lead.contacts.last_name || ''}
                  </p>
                  {lead.contacts.email && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{lead.contacts.email}</p>}
                  {lead.contacts.phone && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{lead.contacts.phone}</p>}
                </div>
              </Link>
            </Card>
          )}

          {/* Organization */}
          {lead.organizations && (
            <Card>
              <h3 className="text-xs font-600 mb-3" style={{ color: 'var(--color-text-muted)' }}>ORGANIZATION</h3>
              <Link href={`/organizations/${lead.organizations.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
                  <Building2 size={16} style={{ color: 'var(--color-brand)' }} />
                </div>
                <div>
                  <p className="text-sm font-500" style={{ color: 'var(--color-text-primary)' }}>{lead.organizations.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{lead.organizations.type}</p>
                </div>
              </Link>
            </Card>
          )}
        </div>

        {/* Right: Tabs - Activity, Tasks, Follow-ups */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl border border-[var(--color-border)] p-1 w-fit">
            {[['activity', 'Activity'], ['tasks', 'Tasks'], ['followups', 'Follow-ups']].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={clsx('px-4 py-1.5 rounded-lg text-xs font-600 transition-all', activeTab === tab ? 'text-white' : 'hover:bg-gray-50')}
                style={activeTab === tab ? { background: 'var(--color-brand)' } : { color: 'var(--color-text-secondary)' }}>
                {label}
                {tab === 'tasks' && tasks.filter(t => t.status === 'Pending').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{tasks.filter(t => t.status === 'Pending').length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card>
              {/* Comment Box */}
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  {[['comment','Comment'],['call','Call'],['email','Email'],['meeting','Meeting'],['note','Note']].map(([t, l]) => (
                    <button key={t} onClick={() => setCommentType(t)}
                      className={clsx('px-3 py-1 rounded-full text-xs font-500 border transition-all', commentType === t ? 'text-white border-transparent' : 'border-[var(--color-border)] hover:bg-gray-50')}
                      style={commentType === t ? { background: 'var(--color-brand)' } : { color: 'var(--color-text-secondary)' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2 resize-none"
                  placeholder={`Add a ${commentType}...`}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleComment() }}
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleComment}>Add</Button>
                </div>
              </div>
              {/* Activity List */}
              <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
                {activities.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No activity yet</p>
                ) : (
                  activities.map((a, i) => <ActivityItem key={i} a={a} />)
                )}
              </div>
            </Card>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Tasks</h3>
                <Button size="sm" onClick={() => setTaskModal(true)}><Plus size={13} /> Task</Button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No tasks yet</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border)] hover:bg-gray-50">
                      <input type="checkbox" checked={task.status === 'Completed'} className="mt-0.5 cursor-pointer"
                        onChange={async () => {
                          const updated = await updateTask(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })
                          setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
                        }} />
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-500', task.status === 'Completed' && 'line-through opacity-50')} style={{ color: 'var(--color-text-primary)' }}>{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Due: {format(new Date(task.due_date), 'd MMM, h:mm a')}</p>
                        )}
                      </div>
                      <Badge>{task.priority}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Follow-ups Tab */}
          {activeTab === 'followups' && (
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Follow-ups</h3>
                <Button size="sm" onClick={() => setFollowupModal(true)}><Plus size={13} /> Follow-up</Button>
              </div>
              {followups.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No follow-ups scheduled</p>
              ) : (
                <div className="space-y-3">
                  {followups.map(f => (
                    <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border)]">
                      <div className="p-2 rounded-lg" style={{ background: 'var(--color-brand-50)' }}>
                        <Bell size={13} style={{ color: 'var(--color-brand)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{f.type}</span>
                          <Badge>{f.status}</Badge>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {format(new Date(f.scheduled_at), 'd MMM yyyy, h:mm a')}
                        </p>
                        {f.notes && <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{f.notes}</p>}
                      </div>
                      {f.status === 'Scheduled' && (
                        <Button size="sm" variant="secondary" onClick={async () => {
                          const updated = await updateFollowup(f.id, { status: 'Completed' })
                          setFollowups(prev => prev.map(fu => fu.id === f.id ? updated : fu))
                        }}>Done</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Task Modal */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input label="Task Title *" placeholder="e.g. Send proposal" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))}
              options={['Low','Medium','High','Urgent'].map(s => ({ value: s, label: s }))} />
            <Input label="Due Date & Time" type="datetime-local" value={newTask.due_date} onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setTaskModal(false)} type="button">Cancel</Button>
            <Button type="submit">Add Task</Button>
          </div>
        </form>
      </Modal>

      {/* Follow-up Modal */}
      <Modal open={followupModal} onClose={() => setFollowupModal(false)} title="Schedule Follow-up">
        <form onSubmit={handleCreateFollowup} className="space-y-4">
          <Select label="Type" value={newFollowup.type} onChange={e => setNewFollowup(f => ({ ...f, type: e.target.value }))}
            options={['Call','Email','Meeting','Demo','Site Visit','Other'].map(s => ({ value: s, label: s }))} />
          <Input label="Scheduled Date & Time *" type="datetime-local" value={newFollowup.scheduled_at} onChange={e => setNewFollowup(f => ({ ...f, scheduled_at: e.target.value }))} required />
          <Textarea label="Notes" placeholder="What's the agenda?" value={newFollowup.notes} onChange={e => setNewFollowup(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setFollowupModal(false)} type="button">Cancel</Button>
            <Button type="submit">Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
