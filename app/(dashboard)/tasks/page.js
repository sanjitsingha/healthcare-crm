'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, CheckSquare, Clock, Search } from 'lucide-react'
import { Button, Card, Badge, Modal, Input, Select, Textarea, TagsInput, EmptyState, Spinner } from '@/components/ui'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/supabase/queries'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import clsx from 'clsx'

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled']

function CreateTaskModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', due_date: '', assigned_to: 'You', tags: [] })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const task = await createTask({ ...form, status: 'Pending' })
      onCreated(task); onClose()
      setForm({ title: '', description: '', priority: 'Medium', due_date: '', assigned_to: 'You', tags: [] })
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Task Title *" placeholder="e.g. Follow up with Dr. Sharma" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            options={PRIORITIES.map(p => ({ value: p, label: p }))} />
          <Input label="Due Date & Time" type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <Input label="Assigned To" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
        <div className="space-y-1">
          <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Tags</label>
          <TagsInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
        </div>
        <Textarea label="Description" placeholder="Task details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Task'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function TaskCard({ task, onUpdate, onDelete }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'Completed'

  const getDueLabel = () => {
    if (!task.due_date) return null
    const d = new Date(task.due_date)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'd MMM, h:mm a')
  }

  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border bg-white transition-all',
      task.status === 'Completed' ? 'opacity-60' : '',
      isOverdue ? 'border-red-200 bg-red-50/30' : 'border-[var(--color-border)] hover:shadow-sm'
    )}>
      <input
        type="checkbox"
        checked={task.status === 'Completed'}
        onChange={() => onUpdate(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })}
        className="mt-0.5 w-4 h-4 cursor-pointer rounded accent-[#0f6e56]"
      />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-500', task.status === 'Completed' && 'line-through')} style={{ color: 'var(--color-text-primary)' }}>
          {task.title}
        </p>
        {task.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>{task.description}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge>{task.priority}</Badge>
          {task.due_date && (
            <span className="text-xs flex items-center gap-1" style={{ color: isOverdue ? '#ef4444' : 'var(--color-text-muted)' }}>
              <Clock size={11} />
              {getDueLabel()}
              {isOverdue && ' (Overdue)'}
            </span>
          )}
          {task.tags?.map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] font-500" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{t}</span>
          ))}
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>×</span>
      </button>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Pending')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTasks({ status: filter !== 'All' ? filter : '' })
      setTasks((data || []).filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase())))
    } catch { setTasks([]) }
    setLoading(false)
  }, [filter, search])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleUpdate = async (id, updates) => {
    try {
      const updated = await updateTask(id, updates)
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const grouped = {
    overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status === 'Pending'),
    today: tasks.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'Completed'),
    upcoming: tasks.filter(t => (!t.due_date || (!isToday(new Date(t.due_date)) && !isPast(new Date(t.due_date)))) && t.status !== 'Completed' && t.status !== 'Cancelled'),
    completed: tasks.filter(t => t.status === 'Completed'),
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Tasks</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {tasks.filter(t => t.status === 'Pending').length} pending · {tasks.filter(t => t.status === 'Completed').length} completed
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Task</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none"
            placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['All', 'Pending', 'In Progress', 'Completed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-500 border transition-all"
              style={filter === s ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' } : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks" description="Create tasks to stay organized" action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} /> New Task</Button>} />
      ) : (
        <div className="space-y-6">
          {grouped.overdue.length > 0 && (
            <div>
              <h2 className="text-xs font-700 mb-2 flex items-center gap-2" style={{ color: '#ef4444' }}>
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                OVERDUE ({grouped.overdue.length})
              </h2>
              <div className="space-y-2">{grouped.overdue.map(t => <TaskCard key={t.id} task={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}</div>
            </div>
          )}
          {grouped.today.length > 0 && (
            <div>
              <h2 className="text-xs font-700 mb-2 flex items-center gap-2" style={{ color: 'var(--color-brand)' }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--color-brand)' }} />
                TODAY ({grouped.today.length})
              </h2>
              <div className="space-y-2">{grouped.today.map(t => <TaskCard key={t.id} task={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}</div>
            </div>
          )}
          {grouped.upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-700 mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                UPCOMING ({grouped.upcoming.length})
              </h2>
              <div className="space-y-2">{grouped.upcoming.map(t => <TaskCard key={t.id} task={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}</div>
            </div>
          )}
          {grouped.completed.length > 0 && (
            <div>
              <h2 className="text-xs font-700 mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                COMPLETED ({grouped.completed.length})
              </h2>
              <div className="space-y-2">{grouped.completed.map(t => <TaskCard key={t.id} task={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}</div>
            </div>
          )}
        </div>
      )}

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={t => setTasks(prev => [t, ...prev])} />
    </div>
  )
}
