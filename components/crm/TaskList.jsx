'use client'
import { format, isPast } from 'date-fns'
import { Clock, CheckSquare, Trash2 } from 'lucide-react'
import clsx from 'clsx'

// Shared task list — used on lead, patient and consultation detail pages.
const PRIORITY_STYLE = {
  Low:    { bg: '#f1f5f9', color: '#64748b' },
  Medium: { bg: '#fef9c3', color: '#a16207' },
  High:   { bg: '#fee2e2', color: '#b91c1c' },
  Urgent: { bg: '#f3e8ff', color: '#7c3aed' },
}

// Parse a due value safely: bare 'yyyy-MM-dd' is read at local noon (avoids TZ drift).
const parseDue = (raw) => new Date(String(raw).length === 10 ? raw + 'T12:00:00' : raw)

function TaskRow({ task, onToggle, onDelete }) {
  const completed = task.status === 'Completed'
  const dueDate   = task.due_date ? parseDue(task.due_date) : null
  const overdue   = dueDate && !completed && isPast(dueDate)
  const pri       = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Medium

  return (
    <div className={clsx('group flex items-start gap-3 p-3.5 rounded-xl border transition-all', completed && 'opacity-60')}
      style={{ background: overdue ? '#fff8f8' : 'var(--color-surface-2)', borderColor: overdue ? '#fecaca' : 'var(--color-border)' }}>
      <input type="checkbox" checked={completed} onChange={() => onToggle(task)}
        className="mt-0.5 w-4 h-4 cursor-pointer shrink-0" style={{ accentColor: 'var(--color-brand)' }} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-500 wrap-break-word', completed && 'line-through')}
          style={{ color: 'var(--color-text-primary)' }}>{task.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-700 px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: pri.bg, color: pri.color }}>{task.priority}</span>
          {dueDate && (
            <span className="text-[11px] flex items-center gap-1"
              style={{ color: overdue ? '#ef4444' : 'var(--color-text-muted)' }}>
              <Clock size={11} />
              {format(dueDate, 'MMM d, yyyy')}{overdue && ' · Overdue'}
            </span>
          )}
        </div>
      </div>
      {onDelete && (
        <button type="button" onClick={() => onDelete(task)} title="Delete task"
          className="p-1.5 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
          style={{ color: '#b91c1c' }}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

export default function TaskList({ tasks = [], onToggle, onDelete, emptyText = 'No tasks yet.' }) {
  if (!tasks.length) {
    return (
      <div className="py-14 text-center border border-dashed rounded-xl border-(--color-border)">
        <CheckSquare size={26} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{emptyText}</p>
      </div>
    )
  }
  // Pending first, completed pushed down; within each group, soonest due first.
  const sorted = [...tasks].sort((a, b) => {
    const done = t => (t.status === 'Completed' ? 1 : 0)
    if (done(a) !== done(b)) return done(a) - done(b)
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity
    return ad - bd
  })
  return (
    <div className="space-y-2">
      {sorted.map(t => <TaskRow key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} />)}
    </div>
  )
}
