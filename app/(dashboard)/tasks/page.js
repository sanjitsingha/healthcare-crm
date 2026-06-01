'use client'
import { useEffect, useState } from 'react'
import { Plus, CheckSquare, Clock, Search, Trash2, User, UserRound } from 'lucide-react'
import { Button, Modal, Input, Select, Textarea, Spinner } from '@/components/ui'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import clsx from 'clsx'

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

const PRIORITY_STYLE = {
  Low:    { bg: '#f1f5f9', color: '#64748b' },
  Medium: { bg: '#fef9c3', color: '#a16207' },
  High:   { bg: '#fee2e2', color: '#b91c1c' },
  Urgent: { bg: '#f3e8ff', color: '#7c3aed' },
}

const FILTERS = ['All', 'Today', 'Overdue', 'Completed']

function getTaskLink(task) {
  if (task.entity_type === 'lead'    && task.entity_id) return `/leads/${task.entity_id}`
  if (task.entity_type === 'patient' && task.entity_id) return `/patients/${task.entity_id}`
  return null
}

// ── Create Task Modal ──────────────────────────────────────────
function CreateTaskModal({ open, onClose, onCreated, orgId }) {
  const [form, setForm]     = useState({ title: '', description: '', priority: 'Medium', due_date: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !orgId) return
    setSaving(true)
    try {
      const task = await createTask({ ...form, status: 'Pending', organization_id: orgId })
      onCreated(task); onClose()
      setForm({ title: '', description: '', priority: 'Medium', due_date: '' })
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Task Title *" placeholder="e.g. Send brochure to Dr. Sharma"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            options={PRIORITIES.map(p => ({ value: p, label: p }))} />
          <Input label="Due Date & Time" type="datetime-local" value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <Textarea label="Description" placeholder="Task details..." value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
        <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving || !form.title.trim()}>{saving ? 'Creating...' : 'Create Task'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Task card ──────────────────────────────────────────────────
function TaskCard({ task, entityName, onUpdate, onDelete }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'Completed' && task.status !== 'Cancelled'
  const pri  = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Medium
  const link = getTaskLink(task)

  const getDueLabel = () => {
    if (!task.due_date) return null
    const d = new Date(task.due_date)
    if (isToday(d))    return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'MMM d, yyyy')
  }

  const EntityIcon = task.entity_type === 'patient' ? UserRound : User

  return (
    <div
      className={clsx(
        'rounded-xl border transition-all',
        task.status === 'Completed' ? 'opacity-50' : '',
        isOverdue ? 'border-red-200' : 'border-(--color-border)'
      )}
      style={{ background: isOverdue ? '#fff5f5' : 'var(--color-surface)' }}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={task.status === 'Completed'}
          onChange={() => onUpdate(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })}
          className="mt-0.5 w-4 h-4 cursor-pointer shrink-0"
          style={{ accentColor: 'var(--color-brand)' }}
        />
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-500', task.status === 'Completed' && 'line-through')}
            style={{ color: 'var(--color-text-primary)' }}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Priority */}
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: pri.bg, color: pri.color }}>
              {task.priority}
            </span>

            {/* Due date */}
            {task.due_date && (
              <span className="text-[11px] flex items-center gap-1"
                style={{ color: isOverdue ? '#ef4444' : 'var(--color-text-muted)' }}>
                <Clock size={11} />
                {getDueLabel()}
                {isOverdue && ' · Overdue'}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 mt-0.5"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Entity footer — only when task is linked to a lead/patient */}
      {link && entityName && (
        <Link
          href={link}
          className="flex items-center gap-2 px-4 py-2.5 border-t border-(--color-border) transition-colors hover:bg-(--color-surface-2) rounded-b-xl"
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-brand-50)' }}
          >
            <EntityIcon size={11} style={{ color: 'var(--color-brand)' }} />
          </div>
          <span className="text-[11px] font-600 truncate" style={{ color: 'var(--color-brand)' }}>
            {entityName}
          </span>
          <span className="text-[10px] ml-auto shrink-0 capitalize" style={{ color: 'var(--color-text-muted)' }}>
            {task.entity_type} →
          </span>
        </Link>
      )}
    </div>
  )
}

// ── Section group ──────────────────────────────────────────────
function SectionGroup({ label, color, dot, tasks, entityNames, onUpdate, onDelete }) {
  if (tasks.length === 0) return null
  return (
    <div>
      <h2 className="text-[11px] font-700 uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
        {label} ({tasks.length})
      </h2>
      <div className="space-y-2">
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} entityName={entityNames[t.entity_id]} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function TasksPage() {
  const { orgId }  = useOrg()
  const [allTasks,    setAllTasks]    = useState([])
  const [entityNames, setEntityNames] = useState({})
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('All')
  const [search,      setSearch]      = useState('')
  const [createOpen,  setCreateOpen]  = useState(false)

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)

    getTasks({ orgId })
      .then(async data => {
        if (!active) return
        const tasks = data || []
        setAllTasks(tasks)

        // Batch-fetch entity names for linked tasks
        const leadIds    = [...new Set(tasks.filter(t => t.entity_type === 'lead'    && t.entity_id).map(t => t.entity_id))]
        const patientIds = [...new Set(tasks.filter(t => t.entity_type === 'patient' && t.entity_id).map(t => t.entity_id))]

        if (leadIds.length === 0 && patientIds.length === 0) return

        const supabase = createClient()
        const [leadsRes, patientsRes] = await Promise.all([
          leadIds.length    ? supabase.from('leads').select('id, title, first_name, last_name').in('id', leadIds)       : { data: [] },
          patientIds.length ? supabase.from('patients').select('id, first_name, last_name').in('id', patientIds)        : { data: [] },
        ])

        const names = {}
        leadsRes.data?.forEach(l => {
          names[l.id] = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title || 'Lead'
        })
        patientsRes.data?.forEach(p => {
          names[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Patient'
        })
        if (active) setEntityNames(names)
      })
      .catch(() => { if (active) setAllTasks([]) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [orgId])

  const handleUpdate = async (id, updates) => {
    try {
      const updated = await updateTask(id, updates)
      setAllTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    try { await deleteTask(id); setAllTasks(prev => prev.filter(t => t.id !== id)) }
    catch (e) { alert(e.message) }
  }

  // Apply filter + search
  const base = allTasks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  )

  const filtered = (() => {
    switch (filter) {
      case 'Today':     return base.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'Completed' && t.status !== 'Cancelled')
      case 'Overdue':   return base.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'Completed' && t.status !== 'Cancelled')
      case 'Completed': return base.filter(t => t.status === 'Completed')
      default:          return base
    }
  })()

  // Groups used in "All" view
  const grouped = {
    overdue:   filtered.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status === 'Pending'),
    today:     filtered.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'Completed' && t.status !== 'Cancelled'),
    upcoming:  filtered.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled' && (!t.due_date || (!isToday(new Date(t.due_date)) && !isPast(new Date(t.due_date))))),
    completed: filtered.filter(t => t.status === 'Completed'),
  }

  const pendingCount   = allTasks.filter(t => t.status === 'Pending').length
  const completedCount = allTasks.filter(t => t.status === 'Completed').length

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Tasks</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Task</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-500 border transition-all"
              style={filter === f
                ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' }
                : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
          <CheckSquare size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No tasks found.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {search ? 'Try a different search.' : filter === 'Today' ? 'Nothing due today.' : filter === 'Overdue' ? 'No overdue tasks.' : 'Create a task to get started.'}
          </p>
        </div>
      ) : filter === 'All' ? (
        <div className="space-y-6">
          <SectionGroup label="Overdue"   color="#ef4444"                     dot="#ef4444"          tasks={grouped.overdue}   entityNames={entityNames} onUpdate={handleUpdate} onDelete={handleDelete} />
          <SectionGroup label="Today"     color="var(--color-brand)"          dot="var(--color-brand)" tasks={grouped.today}   entityNames={entityNames} onUpdate={handleUpdate} onDelete={handleDelete} />
          <SectionGroup label="Upcoming"  color="var(--color-text-secondary)" dot="#94a3b8"          tasks={grouped.upcoming}  entityNames={entityNames} onUpdate={handleUpdate} onDelete={handleDelete} />
          <SectionGroup label="Completed" color="var(--color-text-muted)"     dot="#d1d5db"          tasks={grouped.completed} entityNames={entityNames} onUpdate={handleUpdate} onDelete={handleDelete} />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} entityName={entityNames[t.entity_id]} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={t => setAllTasks(prev => [t, ...prev])} orgId={orgId} />
    </div>
  )
}
