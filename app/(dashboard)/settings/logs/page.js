'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { getAuditLogs } from '@/lib/supabase/queries'
import { format, formatDistanceToNow } from 'date-fns'

// ── Action → display category ───────────────────────────────────
const CATEGORIES = {
  auth:   { label: 'Auth',    actions: ['login', 'logout'],                                                color: '#3b82f6', bg: '#dbeafe' },
  view:   { label: 'View',    actions: ['page_view', 'patient_view', 'lead_view', 'consultation_view'],    color: '#6b7280', bg: '#f3f4f6' },
  create: { label: 'Create',  actions: ['lead_create', 'patient_create', 'task_create', 'followup_create', 'appointment_create', 'consultation_create', 'user_create'], color: '#16a34a', bg: '#dcfce7' },
  edit:   { label: 'Edit',    actions: ['patient_edit', 'lead_edit', 'lead_stage_change', 'lead_assign', 'lead_convert', 'tag_add', 'tag_remove', 'task_update', 'followup_update', 'appointment_update', 'note_add', 'settings_change', 'module_change'], color: '#d97706', bg: '#fef3c7' },
  delete: { label: 'Delete',  actions: ['record_delete'],                                                  color: '#dc2626', bg: '#fee2e2' },
  export: { label: 'Export',  actions: ['data_export', 'permission_change'],                               color: '#7c3aed', bg: '#f3e8ff' },
}

function getCat(action) {
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (cat.actions.includes(action)) return { key, ...cat }
  }
  return { key: 'other', label: action, color: '#6b7280', bg: '#f3f4f6' }
}

const ACTION_LABEL = {
  login:               'Login',
  logout:              'Logout',
  page_view:           'Page View',
  patient_view:        'Patient Viewed',
  patient_create:      'Patient Created',
  patient_edit:        'Patient Edited',
  lead_view:           'Lead Viewed',
  lead_create:         'Lead Created',
  lead_edit:           'Lead Edited',
  lead_stage_change:   'Stage Changed',
  lead_assign:         'Lead Assigned',
  lead_convert:        'Lead Converted',
  tag_add:             'Tag Added',
  tag_remove:          'Tag Removed',
  task_create:         'Task Created',
  task_update:         'Task Updated',
  followup_create:     'Follow-up Logged',
  followup_update:     'Follow-up Updated',
  appointment_create:  'Appointment Booked',
  appointment_update:  'Appointment Updated',
  consultation_view:   'Consultation Viewed',
  consultation_create: 'Consultation Logged',
  note_add:            'Note Added',
  record_delete:       'Record Deleted',
  user_create:         'User Created',
  permission_change:   'Permission Changed',
  settings_change:     'Settings Changed',
  module_change:       'Module Changed',
  data_export:         'Data Exported',
}

function DiffRow({ before, after }) {
  if (!before && !after) return null
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])]
  if (!keys.length) return null
  return (
    <div className="mt-2 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full text-[11px]">
        <thead>
          <tr style={{ background: 'var(--color-surface-2)' }}>
            <th className="px-3 py-1.5 text-left font-600" style={{ color: 'var(--color-text-muted)', width: '25%' }}>Field</th>
            <th className="px-3 py-1.5 text-left font-600" style={{ color: '#b91c1c', width: '37.5%' }}>Before</th>
            <th className="px-3 py-1.5 text-left font-600" style={{ color: '#15803d', width: '37.5%' }}>After</th>
          </tr>
        </thead>
        <tbody>
          {keys.map(k => (
            <tr key={k} style={{ borderTop: '1px solid var(--color-border)' }}>
              <td className="px-3 py-1.5 font-600" style={{ color: 'var(--color-text-secondary)' }}>{k}</td>
              <td className="px-3 py-1.5 font-mono" style={{ color: '#b91c1c' }}>{before?.[k] != null ? String(before[k]) : '—'}</td>
              <td className="px-3 py-1.5 font-mono" style={{ color: '#15803d' }}>{after?.[k]  != null ? String(after[k])  : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LogRow({ log }) {
  const [open, setOpen] = useState(false)
  const m       = log.metadata || {}
  const cat     = getCat(log.action)
  const when    = new Date(log.created_at)
  const who     = log.actor_name || log.actor_email || '—'
  const whoSub  = log.actor_name && log.actor_email ? log.actor_email : null
  const label   = ACTION_LABEL[log.action] || log.action
  const desc    = log.description || label
  const entity  = m.entity_name || null
  const loc     = [m.location, m.device].filter(Boolean).join('  ·  ')
  const hasDiff = m.before || m.after
  const hasExtra = m.ip || hasDiff || Object.keys(m).some(k => !['device', 'ip', 'location', 'entity_name', 'before', 'after'].includes(k))

  return (
    <div
      className="border-t border-(--color-border)"
      style={{ color: log.status === 'failed' ? '#b91c1c' : 'inherit' }}
    >
      {/* Main row */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-(--color-surface-2) transition-colors group"
      >
        {/* Expand chevron */}
        <span className="mt-0.5 shrink-0 opacity-30 group-hover:opacity-60 transition-opacity">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>

        {/* Timestamp */}
        <span className="shrink-0 tabular-nums text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)', minWidth: 100 }}>
          {format(when, 'MMM dd HH:mm:ss')}
        </span>

        {/* Category label — plain text, no pill */}
        <span className="shrink-0 text-[10px] mt-0.5" style={{ minWidth: 40, color: 'var(--color-text-muted)' }}>
          {cat.label}
        </span>

        {/* Who */}
        <span className="shrink-0 text-xs" style={{ minWidth: 160, color: 'var(--color-text-primary)' }}>
          {who}
        </span>

        {/* What (description + entity name) */}
        <span className="flex-1 min-w-0 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {desc}
          {entity && (
            <span className="ml-1.5 font-600" style={{ color: 'var(--color-text-primary)' }}>
              · {entity}
            </span>
          )}
        </span>

        {/* Where */}
        {loc && (
          <span className="shrink-0 text-[11px] hidden xl:block truncate" style={{ color: 'var(--color-text-muted)', maxWidth: 280 }}>
            {loc}
          </span>
        )}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-12 pb-3 space-y-2" style={{ background: 'var(--color-surface-2)' }}>
          {/* Before / after diff */}
          {hasDiff && <DiffRow before={m.before} after={m.after} />}

          {/* Extra metadata */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-[11px]">
            {m.ip       && <MetaLine label="IP Address" value={m.ip} />}
            {m.location && <MetaLine label="Location"   value={m.location} />}
            {m.device   && <MetaLine label="Device"     value={m.device} />}
            {log.entity_type && <MetaLine label="Entity Type" value={log.entity_type} />}
            {log.entity_id   && <MetaLine label="Entity ID"   value={log.entity_id} mono />}
            {log.status === 'failed' && <MetaLine label="Status" value="Failed" />}
            {/* Any extra metadata keys */}
            {Object.entries(m)
              .filter(([k]) => !['device', 'ip', 'location', 'entity_name', 'before', 'after'].includes(k))
              .map(([k, v]) => (
                <MetaLine key={k} label={k} value={typeof v === 'object' ? JSON.stringify(v) : String(v)} />
              ))
            }
          </div>

          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {format(when, 'EEEE, MMM d yyyy · h:mm:ss a')} · {formatDistanceToNow(when, { addSuffix: true })}
          </p>
        </div>
      )}
    </div>
  )
}

function MetaLine({ label, value, mono = false }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 font-600" style={{ color: 'var(--color-text-muted)', minWidth: 90 }}>{label}</span>
      <span className={mono ? 'font-mono break-all' : 'break-all'} style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
    </div>
  )
}

const CAT_FILTER_OPTIONS = [
  { value: '', label: 'All events' },
  ...Object.entries(CATEGORIES).map(([k, c]) => ({ value: k, label: c.label })),
]

const PAGE_SIZE      = 100   // initial load
const LOAD_MORE_SIZE = 50    // each "see more" click

export default function LogsPage() {
  const { orgId }                  = useOrg()
  const [logs,      setLogs]       = useState([])
  const [loading,   setLoading]    = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,   setHasMore]    = useState(false)
  const [search,    setSearch]     = useState('')
  const [catFilter, setCatFilter]  = useState('')

  const load = useCallback(async () => {
    if (!orgId) { setLogs([]); setLoading(false); return }
    setLoading(true)
    try {
      const rows = await getAuditLogs({ orgId, search, limit: PAGE_SIZE, offset: 0 })
      setLogs(rows)
      setHasMore(rows.length === PAGE_SIZE)
    }
    catch { setLogs([]) }
    setLoading(false)
  }, [orgId, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const loadMore = async () => {
    if (!orgId || loadingMore) return
    setLoadingMore(true)
    try {
      const rows = await getAuditLogs({ orgId, search, limit: LOAD_MORE_SIZE, offset: logs.length })
      setLogs(prev => [...prev, ...rows])
      setHasMore(rows.length === LOAD_MORE_SIZE)
    } catch {}
    setLoadingMore(false)
  }

  const filtered = catFilter
    ? logs.filter(l => CATEGORIES[catFilter]?.actions.includes(l.action))
    : logs

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Audit Logs</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? 'Loading…' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}${catFilter ? ' (filtered)' : hasMore ? '+' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">

          {/* Category filter */}
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none focus:border-(--color-brand)"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          >
            {CAT_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-48 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none focus:border-(--color-brand) transition-colors"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>

          <button type="button" onClick={load} title="Refresh"
            className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1 text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          <span style={{ width: 16 }} />
          <span style={{ minWidth: 100 }}>Time</span>
          <span style={{ minWidth: 56 }}>Type</span>
          <span style={{ minWidth: 160 }}>Who</span>
          <span className="flex-1">What</span>
          <span className="hidden xl:block" style={{ minWidth: 200 }}>Where</span>
        </div>
      )}

      {/* Log list */}
      {loading ? (
        <div className="flex items-center justify-center py-24"><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {catFilter ? 'No events in this category.' : 'No events yet.'}
        </p>
      ) : (
        <>
          <div
            className="rounded-xl border border-(--color-border) overflow-hidden"
            style={{ background: 'var(--color-surface)', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
          >
            {filtered.map(log => <LogRow key={log.id} log={log} />)}
          </div>

          {/* Load more */}
          {!catFilter && hasMore && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 text-xs font-600 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-surface-2) disabled:opacity-50"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {loadingMore ? 'Loading…' : `See ${LOAD_MORE_SIZE} more`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
