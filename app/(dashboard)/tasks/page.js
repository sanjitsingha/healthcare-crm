'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Clock, Search, Trash2, User, UserRound,
  SlidersHorizontal, Check, AlertCircle, CalendarClock, CheckCircle2,
  LayoutList, Kanban, CalendarDays, ChevronDown,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import { getTasks, updateTask, deleteTask } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format, isPast, isToday, isTomorrow, isThisWeek, isThisMonth } from 'date-fns'
import clsx from 'clsx'

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const PRIORITY_STYLE = {
  Low:    { bg: '#f1f5f9', color: '#64748b' },
  Medium: { bg: '#fef9c3', color: '#a16207' },
  High:   { bg: '#fee2e2', color: '#b91c1c' },
  Urgent: { bg: '#f3e8ff', color: '#7c3aed' },
}
const DATE_FILTERS = [
  { value: 'all',   label: 'All dates' },
  { value: 'today', label: 'Due today' },
  { value: 'week',  label: 'This week' },
  { value: 'month', label: 'This month' },
]

function getTaskLink(t) {
  if (t.entity_type === 'lead'    && t.entity_id) return `/leads/${t.entity_id}`
  if (t.entity_type === 'patient' && t.entity_id) return `/patients/${t.entity_id}`
  return null
}

// ── TaskCard ───────────────────────────────────────────────────
function TaskCard({ task, entityName, onUpdate, onDelete }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'Completed'
  const pri  = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Medium
  const link = getTaskLink(task)
  const EntityIcon = task.entity_type === 'patient' ? UserRound : User

  const getDueLabel = () => {
    if (!task.due_date) return null
    const d = new Date(task.due_date)
    if (isToday(d))    return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'MMM d, yyyy')
  }

  return (
    <div className={clsx(
      'rounded-xl border transition-all',
      task.status === 'Completed' ? 'opacity-55' : '',
      isOverdue ? 'border-red-200' : 'border-(--color-border)',
    )} style={{ background: isOverdue ? '#fff8f8' : 'var(--color-surface)' }}>
      <div className="flex items-start gap-3 p-3.5">
        <input type="checkbox" checked={task.status === 'Completed'}
          onChange={() => onUpdate(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })}
          className="mt-0.5 w-4 h-4 cursor-pointer shrink-0"
          style={{ accentColor: 'var(--color-brand)' }} />
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-500', task.status === 'Completed' && 'line-through')}
            style={{ color: 'var(--color-text-primary)' }}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: pri.bg, color: pri.color }}>
              {task.priority}
            </span>
            {task.due_date && (
              <span className="text-[11px] flex items-center gap-1"
                style={{ color: isOverdue ? '#ef4444' : 'var(--color-text-muted)' }}>
                <Clock size={11} />
                {getDueLabel()}{isOverdue && ' · Overdue'}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 mt-0.5">
          <Trash2 size={13} />
        </button>
      </div>
      {link && entityName && (
        <Link href={link}
          className="flex items-center gap-2 px-3.5 py-2 border-t border-(--color-border) transition-colors hover:bg-(--color-surface-2) rounded-b-xl">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
            <EntityIcon size={11} style={{ color: 'var(--color-brand)' }} />
          </div>
          <span className="text-[11px] font-600 truncate" style={{ color: 'var(--color-brand)' }}>{entityName}</span>
          <span className="text-[10px] ml-auto shrink-0 capitalize" style={{ color: 'var(--color-text-muted)' }}>
            {task.entity_type} →
          </span>
        </Link>
      )}
    </div>
  )
}

// ── Section group (list view) ──────────────────────────────────
function SectionGroup({ label, color, dot, tasks, entityNames, onUpdate, onDelete }) {
  if (tasks.length === 0) return null
  return (
    <div>
      <h2 className="text-[11px] font-700 uppercase tracking-widest mb-2.5 flex items-center gap-2" style={{ color }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
        {label} <span className="font-500 normal-case tracking-normal">({tasks.length})</span>
      </h2>
      <div className="space-y-2">
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} entityName={entityNames[t.entity_id]} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

// ── Column (board view) ────────────────────────────────────────
function Column({ icon: Icon, label, accentColor, headerBg, emptyText, tasks, entityNames, onUpdate, onDelete }) {
  return (
    <div className="flex flex-col rounded-xl border border-(--color-border) overflow-hidden min-w-0">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-(--color-border)"
        style={{ background: headerBg }}>
        <Icon size={14} style={{ color: accentColor }} />
        <span className="text-[11px] font-800 uppercase tracking-widest" style={{ color: accentColor }}>{label}</span>
        <span className="ml-auto text-[11px] font-700 px-2 py-0.5 rounded-full"
          style={{ background: accentColor + '25', color: accentColor }}>
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 opacity-40">
            <CheckCircle2 size={26} />
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>{emptyText}</p>
          </div>
        ) : tasks.map(t => (
          <TaskCard key={t.id} task={t} entityName={entityNames[t.entity_id]} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
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
  const { orgId } = useOrg()
  const [allTasks,    setAllTasks]    = useState([])
  const [entityNames, setEntityNames] = useState({})
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('list')   // 'list' | 'board'
  const [search,      setSearch]      = useState('')
  const [priority,    setPriority]    = useState('All')
  const [dateFilter,  setDateFilter]  = useState('all')
  const [filterOpen,  setFilterOpen]  = useState(false)
  const [dateOpen,    setDateOpen]    = useState(false)
  const filterRef = useRef(null)
  const dateRef   = useRef(null)

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
          leadIds.length    ? supabase.from('leads').select('id, title, first_name, last_name').in('id', leadIds) : { data: [] },
          patientIds.length ? supabase.from('patients').select('id, first_name, last_name').in('id', patientIds) : { data: [] },
        ])
        const names = {}
        lr.data?.forEach(l => { names[l.id] = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title || 'Lead' })
        pr.data?.forEach(p => { names[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Patient' })
        if (active) setEntityNames(names)
      })
      .catch(() => { if (active) setAllTasks([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orgId])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
      if (dateRef.current   && !dateRef.current.contains(e.target))   setDateOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleUpdate = async (id, updates) => {
    try {
      const updated = await updateTask(id, updates)
      setAllTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) }
  }
  const handleDelete = async (id) => {
    const ok = await showConfirm({ title: 'Delete this task?', confirmLabel: 'Delete' })
    if (!ok) return
    try { await deleteTask(id); setAllTasks(prev => prev.filter(t => t.id !== id)) }
    catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) }
  }

  // Shared filter logic
  const passesDate = t => {
    if (dateFilter === 'all' || !t.due_date) return dateFilter === 'all'
    const d = new Date(t.due_date)
    if (dateFilter === 'today') return isToday(d)
    if (dateFilter === 'week')  return isThisWeek(d, { weekStartsOn: 1 })
    if (dateFilter === 'month') return isThisMonth(d)
    return true
  }

  const base = allTasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (priority !== 'All' && t.priority !== priority) return false
    if (dateFilter !== 'all' && !passesDate(t)) return false
    return true
  })

  // List view groups
  const groups = {
    overdue:   base.filter(t => t.status !== 'Completed' && t.due_date && isPast(new Date(t.due_date))),
    today:     base.filter(t => t.status !== 'Completed' && t.due_date && isToday(new Date(t.due_date)) && !isPast(new Date(t.due_date))),
    upcoming:  base.filter(t => t.status !== 'Completed' && (!t.due_date || (!isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))))),
    completed: base.filter(t => t.status === 'Completed'),
  }

  // Board view columns
  const cols = {
    overdue:   base.filter(t => t.status !== 'Completed' && t.due_date && isPast(new Date(t.due_date))),
    upcoming:  base.filter(t => t.status !== 'Completed' && (!t.due_date || !isPast(new Date(t.due_date)))),
    completed: base.filter(t => t.status === 'Completed'),
  }

  const pendingCount   = allTasks.filter(t => t.status !== 'Completed').length
  const completedCount = allTasks.filter(t => t.status === 'Completed').length
  const activeFilters  = (priority !== 'All' ? 1 : 0)
  const dateLabelActive = DATE_FILTERS.find(d => d.value === dateFilter)?.label

  return (
    <div className={clsx('flex flex-col', view === 'board' ? 'h-screen overflow-hidden' : 'min-h-screen')}
      style={{ background: 'var(--color-bg)' }}>

      {/* ── Top section (shrinks to its content) ── */}
      <div className="shrink-0 px-6 pt-6 pb-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Tasks</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {pendingCount} pending · {completedCount} completed
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
            {[
              { id: 'list',  Icon: LayoutList, title: 'List view' },
              { id: 'board', Icon: Kanban,     title: 'Board view' },
            ].map(({ id, Icon, title }) => (
              <button key={id} type="button" title={title} onClick={() => setView(id)}
                className="p-2 rounded-md transition-all"
                style={view === id
                  ? { background: 'var(--color-brand)', color: 'white' }
                  : { color: 'var(--color-text-muted)' }}>
                <Icon size={15} />
              </button>
            ))}
          </div>
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
            onToggle={() => { setFilterOpen(o => !o); setDateOpen(false) }}>
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

          {/* Date range filter */}
          <DropdownButton
            label={dateFilter === 'all' ? 'Date range' : dateLabelActive}
            icon={CalendarDays}
            active={dateFilter !== 'all'}
            btnRef={dateRef}
            open={dateOpen}
            onToggle={() => { setDateOpen(o => !o); setFilterOpen(false) }}>
            <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-xl border border-(--color-border) overflow-hidden py-1.5"
              style={{ background: 'var(--color-surface)', boxShadow: '0 8px 28px rgba(0,0,0,0.14)' }}>
              {DATE_FILTERS.map(df => {
                const active = dateFilter === df.value
                return (
                  <button key={df.value} type="button" onClick={() => { setDateFilter(df.value); setDateOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-(--color-surface-2)">
                    <span style={{ color: active ? 'var(--color-brand)' : 'var(--color-text-primary)', fontWeight: active ? 600 : 400 }}>
                      {df.label}
                    </span>
                    {active && <Check size={12} style={{ color: 'var(--color-brand)' }} />}
                  </button>
                )
              })}
            </div>
          </DropdownButton>

          {/* Clear */}
          {(activeFilters > 0 || dateFilter !== 'all') && (
            <button type="button" onClick={() => { setPriority('All'); setDateFilter('all') }}
              className="text-xs font-600 hover:opacity-70 transition-opacity px-1"
              style={{ color: 'var(--color-text-muted)' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : view === 'board' ? (
        /* Board view — fills remaining height, columns scroll internally */
        <div className="flex-1 min-h-0 px-6 pb-6 grid grid-cols-3 gap-4">
          <Column
            icon={AlertCircle} label="Overdue"
            accentColor="#ef4444" headerBg="#fff5f5"
            emptyText="No overdue tasks"
            tasks={cols.overdue} entityNames={entityNames}
            onUpdate={handleUpdate} onDelete={handleDelete} />
          <Column
            icon={CalendarClock} label="Upcoming"
            accentColor="var(--color-brand)" headerBg="var(--color-brand-50)"
            emptyText="No upcoming tasks"
            tasks={cols.upcoming} entityNames={entityNames}
            onUpdate={handleUpdate} onDelete={handleDelete} />
          <Column
            icon={CheckCircle2} label="Completed"
            accentColor="#16a34a" headerBg="#f0fdf4"
            emptyText="Nothing completed yet"
            tasks={cols.completed} entityNames={entityNames}
            onUpdate={handleUpdate} onDelete={handleDelete} />
        </div>
      ) : (
        /* List view — sections, natural scroll */
        <div className="flex-1 px-6 pb-6 space-y-6">
          {base.length === 0 ? (
            <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
              <div className="opacity-20 flex justify-center mb-3"><Clock size={32} /></div>
              <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No tasks found.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {search ? 'Try a different search.' : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <>
              <SectionGroup label="Overdue"   color="#ef4444"                       dot="#ef4444"          tasks={groups.overdue}   entityNames={entityNames} onUpdate={handleUpdate} onDelete={handleDelete} />
              <SectionGroup label="Today"     color="var(--color-brand)"            dot="var(--color-brand)" tasks={groups.today}   entityNames={entityNames} onUpdate={handleUpdate} onDelete={handleDelete} />
              <SectionGroup label="Upcoming"  color="var(--color-text-secondary)"   dot="#94a3b8"          tasks={groups.upcoming}  entityNames={entityNames} onUpdate={handleUpdate} onDelete={handleDelete} />
              <SectionGroup label="Completed" color="var(--color-text-muted)"       dot="#d1d5db"          tasks={groups.completed} entityNames={entityNames} onUpdate={handleUpdate} onDelete={handleDelete} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
