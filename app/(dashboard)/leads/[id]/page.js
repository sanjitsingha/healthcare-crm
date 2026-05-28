'use client'
import { useEffect, useState, use } from 'react'
import { ArrowLeft, Edit2, Trash2, Plus, MessageSquare, Phone, Mail, Calendar, Clock, CheckSquare, Bell, Building2, User, Tag, Heart, AlertCircle } from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Select, Textarea, TagsInput, Avatar, Spinner, Tag as TagComp } from '@/components/ui'
import { getLead, updateLead, deleteLead, getActivities, createActivity, getTasks, createTask, updateTask, getFollowups, createFollowup, updateFollowup, getTags } from '@/lib/supabase/queries'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']
const ACTIVITY_ICONS = {
  comment: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: Edit2,
  status_change: Clock,
  whatsapp: MessageSquare
}

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
          {a.created_by || 'System'} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
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

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStageChange = async (stage) => {
    try {
      const updated = await updateLead(id, { stage })
      setLead(prev => ({ ...prev, stage: updated.stage }))
      await createActivity({
        organization_id: '00000000-0000-0000-0000-000000000000',
        entity_type: 'lead',
        entity_id: id,
        type: 'status_change',
        content: `Stage changed to ${stage}`,
        created_by: null
      })
      const newActs = await getActivities('lead', id)
      setActivities(newActs)
    } catch (e) { alert(e.message) }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    try {
      const a = await createActivity({
        organization_id: '00000000-0000-0000-0000-000000000000',
        entity_type: 'lead',
        entity_id: id,
        type: commentType,
        content: commentText,
        created_by: null
      })
      setActivities(prev => [a, ...prev])
      setCommentText('')
    } catch (e) { alert(e.message) }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    try {
      const t = await createTask({
        ...newTask,
        organization_id: '00000000-0000-0000-0000-000000000000',
        entity_type: 'lead',
        entity_id: id
      })
      setTasks(prev => [t, ...prev])
      setTaskModal(false)
      setNewTask({ title: '', priority: 'Medium', due_date: '' })
    } catch (e) { alert(e.message) }
  }

  const handleCreateFollowup = async (e) => {
    e.preventDefault()
    if (!newFollowup.scheduled_at) return
    try {
      const f = await createFollowup({
        ...newFollowup,
        organization_id: '00000000-0000-0000-0000-000000000000',
        lead_id: id,
        contact_id: lead?.contact_id || null,
        patient_id: lead?.patient_id || null
      })
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Spinner size={32} />
      <p className="text-xs font-500 text-[var(--color-text-muted)]">Loading lead details...</p>
    </div>
  )
  if (!lead) return <div className="p-12 text-center text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>Lead not found</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/leads" className="p-2 rounded-xl bg-white border border-[var(--color-border)] hover:bg-gray-50 transition-all">
            <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{lead.title}</h1>
              {lead.priority === 'Urgent' && <AlertCircle size={18} className="text-red-500" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{lead.stage}</Badge>
              <Badge>{lead.priority}</Badge>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">ID: {lead.id.slice(0,8)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit2 size={14} /> Edit Lead</Button>
          <Button variant="danger" size="sm" onClick={handleDelete} className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100"><Trash2 size={14} /></Button>
        </div>
      </div>

      {/* Stage Tracker */}
      <Card className="p-4 border-[var(--color-border)] shadow-sm">
        <div className="flex flex-wrap md:flex-nowrap gap-2">
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
                  'flex-1 relative min-w-[100px] py-2.5 text-[10px] font-700 uppercase tracking-wider rounded-lg transition-all',
                  isActive ? 'text-white shadow-lg' : isPast && !isLost ? 'text-white/90' : 'text-gray-400 hover:bg-gray-50 border border-transparent'
                )}
                style={isActive ? { background: 'var(--color-brand)', boxShadow: `0 4px 12px ${'var(--color-brand)'}40` } : isPast && !isLost ? { background: 'var(--color-brand-light)' } : {}}
              >
                {stage}
                {isPast && !isActive && !isLost && (
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 text-white/50">
                    <Plus size={10} className="rotate-45" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info Cards */}
        <div className="space-y-6">
          {/* Key Info */}
          <Card className="border-[var(--color-border)] p-5">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
              <h3 className="text-[11px] font-700 uppercase tracking-widest text-[var(--color-text-muted)]">Key Information</h3>
              <span className="text-lg font-800" style={{ color: 'var(--color-brand)' }}>
                {lead.value ? `₹${lead.value.toLocaleString()}` : '₹0'}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Source', value: lead.source, icon: TrendingUp },
                { label: 'Priority', value: lead.priority, icon: Tag },
                { label: 'Expected Close', value: lead.expected_close_date ? format(new Date(lead.expected_close_date), 'MMM d, yyyy') : 'Not set', icon: Calendar },
                { label: 'Created On', value: format(new Date(lead.created_at), 'MMM d, yyyy'), icon: Clock },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon size={14} className="text-[var(--color-text-muted)]" />
                    <span className="text-xs font-500 text-[var(--color-text-secondary)]">{item.label}</span>
                  </div>
                  <span className="text-xs font-600 text-[var(--color-text-primary)]">{item.value}</span>
                </div>
              ))}

              {lead.tags?.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-600 text-[var(--color-text-muted)] mb-2 uppercase">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.map(({ tags: t }) => (
                       <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ backgroundColor: `${t.color}10`, color: t.color, borderColor: `${t.color}30` }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Linked Patient */}
          {lead.patients && (
            <Card className="border-[var(--color-border)] p-5 hover:border-[var(--color-brand-light)] transition-all cursor-pointer group">
              <h3 className="text-[11px] font-700 uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Linked Patient</h3>
              <Link href={`/patients/${lead.patients.id}`} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand-50)] flex items-center justify-center text-[var(--color-brand)] font-800">
                  {lead.patients.first_name[0]}{lead.patients.last_name?.[0] || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-700 text-[var(--color-text-primary)] group-hover:text-[var(--color-brand)] transition-colors">
                    {lead.patients.first_name} {lead.patients.last_name || ''}
                  </p>
                  {lead.patients.phone && (
                    <p className="text-xs flex items-center gap-1 text-[var(--color-text-muted)] mt-0.5">
                      <Phone size={10} /> {lead.patients.phone}
                    </p>
                  )}
                </div>
              </Link>
            </Card>
          )}

          {/* Linked Organization */}
          {lead.organizations && (
            <Card className="border-[var(--color-border)] p-5">
              <h3 className="text-[11px] font-700 uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Organization</h3>
              <Link href={`/organizations/${lead.organizations.id}`} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Building2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-700 text-[var(--color-text-primary)] group-hover:text-[var(--color-brand)] transition-colors">{lead.organizations.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 uppercase font-600 tracking-tight">{lead.organizations.type}</p>
                </div>
              </Link>
            </Card>
          )}

          {lead.description && (
            <Card className="border-[var(--color-border)] p-5">
              <h3 className="text-[11px] font-700 uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Lead Description</h3>
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                    &quot;{lead.description}&quot;
              </p>
            </Card>
          )}
        </div>

        {/* Right Column: Interaction Hub */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[var(--color-border)] p-0 overflow-hidden bg-white shadow-sm">
            <div className="flex border-b border-[var(--color-border)] bg-gray-50/50">
              {[
                { id: 'activity', label: 'Timeline', icon: Clock },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                { id: 'followups', label: 'Follow-ups', icon: Bell },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 px-6 py-4 text-xs font-700 transition-all border-b-2',
                    activeTab === tab.id
                      ? 'border-[var(--color-brand)] text-[var(--color-brand)] bg-white'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-gray-100/50'
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                  {tab.id === 'tasks' && tasks.filter(t => t.status === 'Pending').length > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                      {tasks.filter(t => t.status === 'Pending').length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'activity' && (
                <div className="space-y-6">
                  {/* Quick Activity Form */}
                  <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] bg-gray-50/30">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {[
                        { id: 'comment', label: 'Note', icon: MessageSquare },
                        { id: 'call', label: 'Call Log', icon: Phone },
                        { id: 'email', label: 'Email', icon: Mail },
                        { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                        { id: 'meeting', label: 'Meeting', icon: Calendar },
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setCommentType(type.id)}
                          className={clsx(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-700 border transition-all whitespace-nowrap',
                            commentType === type.id
                              ? 'bg-[var(--color-brand)] text-white border-transparent shadow-sm'
                              : 'bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50'
                          )}
                        >
                          <type.icon size={12} /> {type.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-white outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all resize-none shadow-inner"
                      placeholder={`Record a ${commentType} details...`}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                    />
                    <div className="flex justify-end mt-3">
                      <Button size="sm" onClick={handleComment} className="px-6">Post Update</Button>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="space-y-6 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-px before:bg-gray-100">
                    {activities.length === 0 ? (
                      <div className="py-12 text-center text-xs font-500 text-[var(--color-text-muted)] italic">
                        No activity recorded yet for this lead.
                      </div>
                    ) : (
                      activities.map((a, i) => (
                        <div key={i} className="relative z-10 bg-white">
                          <ActivityItem a={a} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-[var(--color-brand-50)] p-4 rounded-xl">
                    <div>
                      <p className="text-xs font-700 text-[var(--color-brand)] uppercase tracking-wider">Active Tasks</p>
                      <p className="text-[10px] text-[var(--color-brand)] opacity-70">Manage follow-up actions for this lead</p>
                    </div>
                    <Button size="sm" onClick={() => setTaskModal(true)} className="bg-[var(--color-brand)] hover:opacity-90">
                      <Plus size={14} /> New Task
                    </Button>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="py-20 text-center border border-dashed rounded-xl">
                      <p className="text-sm font-500 text-[var(--color-text-muted)]">All clear! No pending tasks.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map(task => (
                        <div key={task.id} className={clsx(
                          'flex items-start gap-4 p-4 rounded-xl border transition-all',
                          task.status === 'Completed' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-[var(--color-border)] hover:shadow-md'
                        )}>
                          <input
                            type="checkbox"
                            checked={task.status === 'Completed'}
                            className="w-5 h-5 mt-0.5 rounded-full border-2 border-[var(--color-border)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]/20 cursor-pointer"
                            onChange={async () => {
                              const updated = await updateTask(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })
                              setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-sm font-700', task.status === 'Completed' && 'line-through')} style={{ color: 'var(--color-text-primary)' }}>
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-[11px] flex items-center gap-1 mt-1 text-[var(--color-text-muted)]">
                                <Calendar size={10} /> {format(new Date(task.due_date), 'MMM d, h:mm a')}
                              </p>
                            )}
                          </div>
                          <Badge>{task.priority}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'followups' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-purple-50 p-4 rounded-xl">
                    <div>
                      <p className="text-xs font-700 text-purple-700 uppercase tracking-wider">Scheduled Follow-ups</p>
                      <p className="text-[10px] text-purple-700/70">Never miss a touchpoint with your patients</p>
                    </div>
                    <Button size="sm" onClick={() => setFollowupModal(true)} className="bg-purple-600 hover:bg-purple-700">
                      <Plus size={14} /> Schedule
                    </Button>
                  </div>

                  {followups.length === 0 ? (
                    <div className="py-20 text-center border border-dashed rounded-xl">
                      <p className="text-sm font-500 text-[var(--color-text-muted)]">No follow-ups scheduled.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {followups.map(f => (
                        <div key={f.id} className="flex items-start gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-white hover:shadow-md transition-all">
                          <div className={clsx(
                            'p-3 rounded-2xl',
                            f.status === 'Scheduled' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                          )}>
                            <Bell size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{f.type} Touchpoint</span>
                              <Badge>{f.status}</Badge>
                            </div>
                            <p className="text-[11px] font-600 text-[var(--color-text-muted)]">
                              {format(new Date(f.scheduled_at), 'EEEE, MMM d, yyyy · h:mm a')}
                            </p>
                            {f.notes && (
                              <p className="text-xs mt-2 p-2 bg-gray-50 rounded-lg text-[var(--color-text-secondary)] italic">
                                &quot;{f.notes}&quot;
                              </p>
                            )}
                          </div>
                          {f.status === 'Scheduled' && (
                            <Button size="sm" variant="secondary" onClick={async () => {
                              const updated = await updateFollowup(f.id, { status: 'Completed' })
                              setFollowups(prev => prev.map(fu => fu.id === f.id ? updated : fu))
                            }} className="border-green-200 text-green-700 hover:bg-green-50">Mark Done</Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Create New Task" size="md">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input label="What needs to be done? *" placeholder="e.g. Send treatment plan" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))}
              options={['Low','Medium','High','Urgent'].map(s => ({ value: s, label: s }))} />
            <Input label="Due Date & Time" type="datetime-local" value={newTask.due_date} onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setTaskModal(false)} type="button">Cancel</Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>

      <Modal open={followupModal} onClose={() => setFollowupModal(false)} title="Schedule Follow-up" size="md">
        <form onSubmit={handleCreateFollowup} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Touchpoint Type" value={newFollowup.type} onChange={e => setNewFollowup(f => ({ ...f, type: e.target.value }))}
              options={['Call','Email','Meeting','Demo','Site Visit','WhatsApp','Other'].map(s => ({ value: s, label: s }))} />
            <Input label="Scheduled For *" type="datetime-local" value={newFollowup.scheduled_at} onChange={e => setNewFollowup(f => ({ ...f, scheduled_at: e.target.value }))} required />
          </div>
          <Textarea label="Follow-up Agenda / Notes" placeholder="What are we discussing?" value={newFollowup.notes} onChange={e => setNewFollowup(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setFollowupModal(false)} type="button">Cancel</Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Schedule Follow-up</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
