'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock, Search, Trash2, User, UserRound, UserPlus, X, Plus,
  SlidersHorizontal, Check, AlertCircle, CalendarClock, CheckCircle2,
  CalendarDays, ChevronDown, ArrowRight, ListChecks, Activity, Flag,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import Timeline from '@/components/crm/Timeline'
import { getTasks, updateTask, deleteTask } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
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

// List-view tabs, keyed by the time bucket a task falls into.
const TABS = [
  { id: 'today',    label: 'Today',    icon: CalendarClock, accent: 'var(--color-brand)',          empty: 'Nothing due today.' },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarDays,  accent: 'var(--color-text-secondary)', empty: 'No upcoming tasks.' },
  { id: 'overdue',  label: 'Overdue',  icon: AlertCircle,   accent: '#ef4444',                     empty: 'No overdue tasks.' },
]

// Which tab a task belongs to, based purely on its due date.
function bucketOf(t) {
  if (!t.due_date) return 'upcoming'
  const d = new Date(t.due_date)
  if (isToday(d)) return 'today'
  if (isPast(d))  return 'overdue'
  return 'upcoming'
}

function getTaskLink(t) {
  if (t.entity_type === 'lead'    && t.entity_id) return `/leads/${t.entity_id}`
  if (t.entity_type === 'patient' && t.entity_id) return `/patients/${t.entity_id}`
  return null
}

const initialsOf = (name) =>
  name ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'

// Trim to `n` chars, cutting at a word boundary and adding an ellipsis.
const truncate = (str, n = 60) => {
  const s = (str || '').trim().replace(/\s+/g, ' ')
  if (s.length <= n) return s
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…'
}

// ── TaskRow (inline) ───────────────────────────────────────────
function TaskRow({ task, entityName, assignee, active, onOpen }) {
  const isOverdue  = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'Completed'
  const completed  = task.status === 'Completed'
  const pri        = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Medium
  const EntityIcon = task.entity_type === 'patient' ? UserRound : User
  const dueText    = task.due_date ? format(new Date(task.due_date), 'd, MMM, yyyy') : null

  return (
    <button type="button" onClick={() => onOpen(task.id)}
      className="w-full flex items-center gap-4 px-4 py-3 border-b border-(--color-border) last:border-b-0 text-left transition-colors hover:bg-(--color-surface-2)"
      style={active ? { background: 'var(--color-brand-50)' } : undefined}>

      {/* Title */}
      <span className={clsx('flex-1 min-w-0 text-sm font-500 truncate', completed && 'line-through opacity-55')}
        style={{ color: 'var(--color-text-primary)' }}>
        {task.title}
      </span>

      {/* Priority */}
      <span className="shrink-0 w-16 text-center text-[11px] font-700 px-2 py-0.5 rounded-full uppercase tracking-wide"
        style={{ background: pri.bg, color: pri.color }}>
        {task.priority}
      </span>

      {/* Due date */}
      <span className="shrink-0 w-52 text-xs flex items-center gap-1"
        style={{ color: isOverdue ? '#ef4444' : 'var(--color-text-muted)' }}>
        <Clock size={11} className="shrink-0" />
        {dueText ? (
          <span className="truncate">Due Date: {dueText}{isOverdue && ' - Overdue'}</span>
        ) : (
          <span>No due date</span>
        )}
      </span>

      {/* Assignee */}
      <span className="shrink-0 w-40 flex items-center gap-2" title="Assigned to">
        {assignee ? (
          <>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-700 shrink-0"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              {initialsOf(assignee.name)}
            </span>
            <span className="text-xs font-500 truncate" style={{ color: 'var(--color-text-secondary)' }}>{assignee.name}</span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <UserPlus size={13} className="shrink-0" /> Unassigned
          </span>
        )}
      </span>

      {/* Entity */}
      <span className="shrink-0 w-44 flex items-center gap-2 justify-end">
        {entityName ? (
          <>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-700 text-white shrink-0"
              style={{ background: 'var(--color-brand)' }}>
              {initialsOf(entityName)}
            </span>
            <span className="text-xs font-600 truncate" style={{ color: 'var(--color-text-secondary)' }}>{entityName}</span>
          </>
        ) : (
          <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-surface-2)' }}>
            <EntityIcon size={12} style={{ color: 'var(--color-text-muted)' }} />
          </span>
        )}
      </span>
    </button>
  )
}

// ── Task detail slide-over ─────────────────────────────────────
function DetailField({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-700 uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{children}</div>
    </div>
  )
}

// "○ Label   value" row used in the panel's Details block.
// Pass `chip={{ bg, color }}` to render the value as a color-coded pill.
function MetaRow({ icon: Icon, label, value, color, chip }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 font-600 flex items-center gap-1.5 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
        {Icon && <Icon size={13} className="shrink-0" />}
        {label}
      </span>
      {chip ? (
        <span className="text-[11px] font-700 px-2.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wide"
          style={{ background: chip.bg, color: chip.color }}>
          {value}
        </span>
      ) : (
        <span className="font-600 whitespace-nowrap" style={{ color: color || 'var(--color-text-primary)' }}>{value}</span>
      )}
    </div>
  )
}

// Sub-tabs shown below the Details block in the task panel.
const PANEL_SUBTABS = [
  { id: 'subtasks', label: 'Subtasks', icon: ListChecks },
  { id: 'activity', label: 'Timeline', icon: Activity },
]

// Build a lifecycle timeline for a single task from its own columns.
function taskActivity(task) {
  if (!task) return []
  const items = []
  if (task.created_at) items.push({ type: 'task', content: 'Task created', created_at: task.created_at })
  if (task.due_date)   items.push({ type: 'meeting', content: `Due ${format(new Date(task.due_date), 'MMM d, yyyy')}`, created_at: task.due_date })
  const log = Array.isArray(task.activity_log) ? task.activity_log : []
  log.forEach(e => items.push(e))
  return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function SubtasksTab({ task, onMutate }) {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const [text, setText] = useState('')

  const add = () => {
    const title = text.trim()
    if (!title) return
    const item = { id: crypto.randomUUID(), title, done: false, created_at: new Date().toISOString() }
    onMutate(task, { subtasks: [...subtasks, item] },
      { type: 'task', content: `Added subtask “${title}”` })
    setText('')
  }
  const toggle = (id) => {
    const s = subtasks.find(x => x.id === id)
    if (!s) return
    onMutate(task, { subtasks: subtasks.map(x => (x.id === id ? { ...x, done: !x.done } : x)) },
      { type: 'note', content: `${s.done ? 'Reopened' : 'Completed'} subtask “${s.title}”` })
  }
  const remove = (id) => {
    const s = subtasks.find(x => x.id === id)
    onMutate(task, { subtasks: subtasks.filter(x => x.id !== id) },
      { type: 'note', content: `Removed subtask “${s?.title || ''}”` })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {subtasks.map(s => (
          <div key={s.id} className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-(--color-surface-2)">
            <input type="checkbox" checked={s.done} onChange={() => toggle(s.id)}
              className="w-4 h-4 cursor-pointer shrink-0" style={{ accentColor: 'var(--color-brand)' }} />
            <div className="flex-1 min-w-0">
              <span className={clsx('block text-sm wrap-break-word', s.done && 'line-through opacity-55')}
                style={{ color: 'var(--color-text-primary)' }}>
                {s.title}
              </span>
              {s.created_at && (
                <span className="block text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {format(new Date(s.created_at), 'd MMM, yyyy h:mm a')}
                </span>
              )}
            </div>
            <button type="button" onClick={() => remove(s.id)}
              className="p-1 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Add a subtask…"
          className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
        <button type="button" onClick={add} disabled={!text.trim()}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-white shrink-0 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--color-brand)' }} aria-label="Add subtask">
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

function NotesSection({ task, onMutate }) {
  const [text, setText] = useState(task.notes || '')
  // Re-seed the field whenever a different task is opened (adjust-state-on-render).
  const [seenId, setSeenId] = useState(task.id)
  if (task.id !== seenId) {
    setSeenId(task.id)
    setText(task.notes || '')
  }
  const dirty = (text || '') !== (task.notes || '')

  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        rows={3} placeholder="Add notes…"
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-y"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
      {dirty && (
        <div className="flex items-center justify-end gap-2 mt-2">
          <button type="button" onClick={() => setText(task.notes || '')}
            className="px-3 py-1.5 rounded-lg text-xs font-600 transition-colors hover:bg-(--color-surface-2)"
            style={{ color: 'var(--color-text-muted)' }}>
            Cancel
          </button>
          <button type="button"
            onClick={() => onMutate(task, { notes: text }, {
              type: 'note',
              content: text.trim()
                ? `${(task.notes || '').trim() ? 'Updated' : 'Added'} notes: “${truncate(text)}”`
                : 'Cleared notes',
            })}
            className="px-3 py-1.5 rounded-lg text-xs font-600 text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-brand)' }}>
            Save
          </button>
        </div>
      )}
    </div>
  )
}

function TaskDetailPanel({ task, entityName, assignee, open, onClose, onMutate, onDelete }) {
  const [subTab, setSubTab] = useState('subtasks')
  // Reset to the first sub-tab whenever a different task is opened (adjust-state-on-render).
  const [seenId, setSeenId] = useState(task?.id)
  if (task?.id !== seenId) {
    setSeenId(task?.id)
    setSubTab('subtasks')
  }

  const completed  = task?.status === 'Completed'
  const isOverdue  = task?.due_date && isPast(new Date(task.due_date)) && !completed
  const pri        = task ? (PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Medium) : null
  const link       = task ? getTaskLink(task) : null
  const EntityIcon = task?.entity_type === 'patient' ? UserRound : User
  const activity   = useMemo(() => taskActivity(task), [task])
  const subCount   = Array.isArray(task?.subtasks) ? task.subtasks.length : 0

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.3)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 h-full w-full sm:w-100 z-50 border-l border-(--color-border) flex flex-col transition-transform duration-300 ease-out"
        style={{
          background: 'var(--color-surface)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
        }}>
        {task && (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-start gap-3 px-5 py-4 border-b border-(--color-border)">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-700 uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Task</p>
                <h2 className={clsx('text-base font-700 leading-snug', completed && 'line-through opacity-60')}
                  style={{ color: 'var(--color-text-primary)' }}>
                  {task.title}
                </h2>
              </div>
              <button type="button" onClick={onClose}
                className="p-1.5 rounded-lg shrink-0 transition-colors hover:bg-(--color-surface-2)"
                style={{ color: 'var(--color-text-muted)' }} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {/* Details (fixed) */}
            <div className="shrink-0 px-5 py-5 space-y-5 border-b border-(--color-border)">
              <div className="space-y-1.5">
                {task.created_at && (
                  <MetaRow icon={CalendarDays} label="Created date" value={format(new Date(task.created_at), 'd MMM, yyyy h:mm a')} />
                )}
                <MetaRow icon={CheckCircle2} label="Status" value={task.status || 'Pending'}
                  chip={completed
                    ? { bg: '#f0fdf4', color: '#16a34a' }
                    : isOverdue
                      ? { bg: '#fef2f2', color: '#ef4444' }
                      : { bg: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }} />
                <MetaRow icon={Flag} label="Priority" value={task.priority} chip={{ bg: pri.bg, color: pri.color }} />
                <MetaRow icon={User} label="Assigned" value={assignee?.name || 'Unassigned'}
                  color={assignee ? 'var(--color-text-primary)' : 'var(--color-text-muted)'} />
                <MetaRow icon={Clock}
                  label="Due date"
                  value={task.due_date
                    ? `${format(new Date(task.due_date), 'MMM d, yyyy')}${isOverdue ? ' · Overdue' : ''}`
                    : 'No due date'}
                  chip={isOverdue
                    ? { bg: '#fef2f2', color: '#ef4444' }
                    : task.due_date
                      ? { bg: 'var(--color-brand-50)', color: 'var(--color-brand)' }
                      : { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} />
              </div>

              {task.description && (
                <DetailField label="Description">
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {task.description}
                  </p>
                </DetailField>
              )}

              {entityName && link && (
                <DetailField label={task.entity_type === 'patient' ? 'Patient' : 'Lead'}>
                  <Link href={link} onClick={onClose}
                    className="flex items-center gap-2.5 mt-1 p-2.5 rounded-xl border border-(--color-border) transition-colors hover:bg-(--color-surface-2)">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                      <EntityIcon size={14} style={{ color: 'var(--color-brand)' }} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{entityName}</span>
                      <span className="block text-[11px] capitalize" style={{ color: 'var(--color-text-muted)' }}>{task.entity_type}</span>
                    </span>
                    <ArrowRight size={14} style={{ color: 'var(--color-brand)' }} />
                  </Link>
                </DetailField>
              )}

              <DetailField label="Notes">
                <NotesSection task={task} onMutate={onMutate} />
              </DetailField>
            </div>

            {/* Subtasks / Timeline — only this area scrolls */}
            <div className="flex-1 min-h-0 flex flex-col px-5">
              <div className="shrink-0 flex items-center gap-1 pt-3 border-b border-(--color-border)">
                {PANEL_SUBTABS.map(({ id, label, icon: Icon }) => {
                  const active = subTab === id
                  return (
                    <button key={id} type="button" onClick={() => setSubTab(id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-600 -mb-px border-b-2 transition-colors"
                      style={{
                        borderColor: active ? 'var(--color-brand)' : 'transparent',
                        color: active ? 'var(--color-brand)' : 'var(--color-text-muted)',
                      }}>
                      <Icon size={13} />
                      {label}
                      {id === 'subtasks' && subCount > 0 && (
                        <span className="text-[10px] font-700 px-1.5 rounded-full"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>{subCount}</span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto py-4">
                {subTab === 'subtasks'
                  ? <SubtasksTab task={task} onMutate={onMutate} />
                  : <Timeline activities={activity} emptyText="No activity yet." />}
              </div>
            </div>

            {/* Footer actions */}
            <div className="shrink-0 flex items-center gap-2 px-5 py-4 border-t border-(--color-border)">
              <button type="button"
                onClick={() => onMutate(task, { status: completed ? 'Pending' : 'Completed' },
                  { type: 'status_change', content: completed ? 'Reopened task' : 'Marked complete' })}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-600 text-white transition-opacity hover:opacity-90"
                style={{ background: completed ? 'var(--color-text-muted)' : 'var(--color-brand)' }}>
                <CheckCircle2 size={15} />
                {completed ? 'Reopen task' : 'Mark complete'}
              </button>
              <button type="button" onClick={() => onDelete(task.id)}
                className="p-2.5 rounded-lg border border-(--color-border) transition-colors hover:bg-red-50 hover:text-red-500"
                style={{ color: 'var(--color-text-muted)' }} aria-label="Delete task">
                <Trash2 size={15} />
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// ── Generic dropdown wrapper ───────────────────────────────────
function DropdownButton({ label, icon: Icon, active, children, btnRef, open, onToggle }) {
  return (
    <div className="relative" ref={btnRef}>
      <button type="button" onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-600 transition-colors"
        style={open || active
          ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-brand-50)' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
        <Icon size={14} />
        {label}
        <ChevronDown size={11} style={{ opacity: 0.6 }} />
      </button>
      {open && children}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function TasksPage() {
  const { orgId, org } = useOrg()
  const [allTasks,    setAllTasks]    = useState([])
  const [entityNames, setEntityNames] = useState({})
  const [entityOwner, setEntityOwner] = useState({})   // entity_id -> assigned_to (staff-member id)
  const [loading,     setLoading]     = useState(true)

  // Staff members live in org settings; assigned_to references their ids.
  const assignees = useMemo(() => {
    const map = {}
    ;(org?.settings?.staff_members || []).forEach(m => {
      if (m?.id) map[m.id] = { name: m.name || 'Member', avatar: m.avatar_url }
    })
    return map
  }, [org])
  const [tab,         setTab]         = useState('today')   // 'today' | 'upcoming' | 'overdue'
  const [search,      setSearch]      = useState('')
  const [priority,    setPriority]    = useState('All')
  const [filterOpen,  setFilterOpen]  = useState(false)
  const [selectedId,  setSelectedId]  = useState(null)
  const [detailTask,  setDetailTask]  = useState(null)
  const filterRef = useRef(null)

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    getTasks({ orgId })
      .then(async data => {
        if (!active) return
        const tasks = data || []
        setAllTasks(tasks)
        const leadIds    = [...new Set(tasks.filter(t => t.entity_type === 'lead'    && t.entity_id).map(t => t.entity_id))]
        const patientIds = [...new Set(tasks.filter(t => t.entity_type === 'patient' && t.entity_id).map(t => t.entity_id))]
        if (!leadIds.length && !patientIds.length) return
        const supabase = createClient()
        const [lr, pr] = await Promise.all([
          leadIds.length    ? supabase.from('leads').select('id, title, first_name, last_name, assigned_to').in('id', leadIds) : { data: [] },
          patientIds.length ? supabase.from('patients').select('id, first_name, last_name, assigned_to').in('id', patientIds) : { data: [] },
        ])
        const names = {}
        const owners = {}
        lr.data?.forEach(l => {
          names[l.id] = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title || 'Lead'
          if (l.assigned_to) owners[l.id] = l.assigned_to
        })
        pr.data?.forEach(p => {
          names[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Patient'
          if (p.assigned_to) owners[p.id] = p.assigned_to
        })
        if (active) { setEntityNames(names); setEntityOwner(owners) }
      })
      .catch(() => { if (active) setAllTasks([]) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [orgId])

  // Close dropdown on outside click; close panel on Escape.
  useEffect(() => {
    const handler = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    const onKey = e => { if (e.key === 'Escape') setSelectedId(null) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const handleUpdate = async (id, updates) => {
    try {
      const updated = await updateTask(id, updates)
      setAllTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) }
  }
  // Update a task and append an entry to its activity log.
  const mutateTask = (task, updates, event) => {
    const log = Array.isArray(task.activity_log) ? task.activity_log : []
    const activity_log = event
      ? [...log, { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...event }]
      : log
    return handleUpdate(task.id, { ...updates, ...(event ? { activity_log } : {}) })
  }
  const handleDelete = async (id) => {
    const ok = await showConfirm({ title: 'Delete this task?', confirmLabel: 'Delete' })
    if (!ok) return
    try {
      await deleteTask(id)
      setAllTasks(prev => prev.filter(t => t.id !== id))
      setSelectedId(cur => (cur === id ? null : cur))
    } catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) }
  }

  const base = allTasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (priority !== 'All' && t.priority !== priority) return false
    return true
  })

  // Bucket the filtered tasks into the three tabs.
  const buckets = { today: [], upcoming: [], overdue: [] }
  base.forEach(t => { buckets[bucketOf(t)].push(t) })

  const visible   = buckets[tab]
  const activeTab = TABS.find(t => t.id === tab)

  // Selected task. `detailTask` retains the last opened task so the panel keeps
  // its content while sliding out (adjust-state-on-render, no effect/ref needed).
  const selected = selectedId ? allTasks.find(t => t.id === selectedId) : null
  if (selected && selected !== detailTask) setDetailTask(selected)

  // Effective assignee: the task's own assignee, else the linked entity's owner.
  const resolveAssignee = (t) => {
    if (!t) return null
    const pid = t.assigned_to || entityOwner[t.entity_id]
    return pid ? assignees[pid] : null
  }

  const pendingCount   = allTasks.filter(t => t.status !== 'Completed').length
  const completedCount = allTasks.filter(t => t.status === 'Completed').length

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#ffffff' }}>

      {/* ── Top section ── */}
      <div className="shrink-0 px-6 pt-6 pb-4 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Tasks</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Priority filter */}
          <DropdownButton
            label={priority === 'All' ? 'Filter' : priority}
            icon={SlidersHorizontal}
            active={priority !== 'All'}
            btnRef={filterRef}
            open={filterOpen}
            onToggle={() => setFilterOpen(o => !o)}>
            <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-xl border border-(--color-border) overflow-hidden py-1.5"
              style={{ background: 'var(--color-surface)', boxShadow: '0 8px 28px rgba(0,0,0,0.14)' }}>
              <p className="px-3 pt-1 pb-1.5 text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Priority</p>
              {['All', ...PRIORITIES].map(p => {
                const s = PRIORITY_STYLE[p]
                const active = priority === p
                return (
                  <button key={p} type="button" onClick={() => { setPriority(p); setFilterOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-(--color-surface-2)">
                    <span className="flex items-center gap-2">
                      {s ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} /> : <span className="w-2 h-2" />}
                      <span style={{ color: active ? 'var(--color-brand)' : 'var(--color-text-primary)', fontWeight: active ? 600 : 400 }}>
                        {p === 'All' ? 'All priorities' : p}
                      </span>
                    </span>
                    {active && <Check size={12} style={{ color: 'var(--color-brand)' }} />}
                  </button>
                )
              })}
            </div>
          </DropdownButton>

          {/* Clear */}
          {priority !== 'All' && (
            <button type="button" onClick={() => setPriority('All')}
              className="text-xs font-600 hover:opacity-70 transition-opacity px-1"
              style={{ color: 'var(--color-text-muted)' }}>
              Clear
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-(--color-border)">
          {TABS.map(({ id, label, icon: Icon, accent }) => {
            const active = tab === id
            const count = buckets[id].length
            return (
              <button key={id} type="button" onClick={() => setTab(id)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-600 -mb-px border-b-2 transition-colors"
                style={{
                  borderColor: active ? accent : 'transparent',
                  color: active ? accent : 'var(--color-text-muted)',
                }}>
                <Icon size={15} />
                {label}
                <span className="text-[11px] font-700 px-1.5 py-0.5 rounded-full min-w-5 text-center"
                  style={active
                    ? { background: accent, color: 'white' }
                    : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content area ── */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : (
        <div className="flex-1 px-6 pb-6">
          {visible.length === 0 ? (
            <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
              <div className="opacity-20 flex justify-center mb-3"><Clock size={32} /></div>
              <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
                {search || priority !== 'All' ? 'No matching tasks.' : activeTab.empty}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {search || priority !== 'All' ? 'Try adjusting your search or filters.' : 'You’re all caught up.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden" style={{ background: 'var(--color-surface)' }}>
              {visible.map(t => (
                <TaskRow key={t.id} task={t} entityName={entityNames[t.entity_id]}
                  assignee={resolveAssignee(t)}
                  active={t.id === selectedId} onOpen={setSelectedId} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Detail slide-over ── */}
      <TaskDetailPanel
        task={detailTask}
        entityName={detailTask ? entityNames[detailTask.entity_id] : null}
        assignee={resolveAssignee(detailTask)}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onMutate={mutateTask}
        onDelete={handleDelete} />
    </div>
  )
}
