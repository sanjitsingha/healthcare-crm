'use client'
import { useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCheck, Trash2, X, RefreshCw } from 'lucide-react'
import { Card, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { NOTIF_STYLE } from '@/components/crm/Toast'
import { getNotifications } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/client'
import {
  getReadIds, getDismissedIds, markRead, markAllRead, dismiss, clearAll, subscribeNotifState,
} from '@/lib/notifications'
import { isToday, isYesterday, format, formatDistanceToNow } from 'date-fns'

const FILTERS = [
  { id: 'all',             label: 'All' },
  { id: 'lead_created',    label: 'Leads' },
  { id: 'patient_created', label: 'Patients' },
  { id: 'appointment',     label: 'Appointments' },
  { id: 'followup',        label: 'Follow-ups' },
  { id: 'task',            label: 'Tasks' },
]

const dayBucket = (d) => isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : 'Earlier'

export default function NotificationsPage() {
  const { orgId, user } = useOrg()
  const uid = user?.id
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [, force] = useState(0) // re-render on read/dismiss changes

  const load = () => {
    if (!orgId) return
    setLoading(true)
    getNotifications({ orgId }).then(r => setRows(r || [])).catch(() => setRows([])).finally(() => setLoading(false))
  }
  useEffect(load, [orgId])

  // Live updates: new rows + read/dismiss state changes.
  useEffect(() => {
    if (!orgId) return
    const supabase = createClient()
    const ch = supabase
      .channel(`notif-page-${orgId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `organization_id=eq.${orgId}` },
        ({ new: row }) => setRows(list => list.some(x => x.id === row.id) ? list : [row, ...list]))
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [orgId])
  useEffect(() => subscribeNotifState(() => force(n => n + 1)), [])

  const readIds = getReadIds(uid)
  const dismissed = getDismissedIds(uid)

  const visible = rows.filter(n => !dismissed.has(n.id))
  const shown = filter === 'all' ? visible : visible.filter(n => n.type === filter)
  const unread = visible.filter(n => !readIds.has(n.id)).length

  const groups = useMemo(() => {
    const g = {}
    for (const n of shown) (g[dayBucket(new Date(n.created_at))] ||= []).push(n)
    return ['Today', 'Yesterday', 'Earlier'].filter(k => g[k]?.length).map(k => [k, g[k]])
  }, [shown])

  if (loading) return <div className="p-6 flex items-center justify-center h-[60vh]"><Spinner /></div>

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
            <BellRing size={18} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Notifications</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {unread > 0 ? <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}>{unread} unread</span> : `${visible.length} notification${visible.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => markAllRead(uid, visible.map(n => n.id))} disabled={!unread}
            className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors disabled:opacity-40"
            style={{ color: 'var(--color-text-secondary)' }}>
            <CheckCheck size={14} /> Mark all read
          </button>
          <button type="button" onClick={() => { if (confirm('Clear all notifications from your view?')) clearAll(uid, visible.map(n => n.id)) }} disabled={!visible.length}
            className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-(--color-border) hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
            style={{ color: 'var(--color-text-secondary)' }}>
            <Trash2 size={14} /> Clear
          </button>
          <button type="button" onClick={load} title="Refresh"
            className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2)" style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-600 border transition-all"
            style={filter === f.id
              ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
              : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-2xl border-(--color-border)">
          <BellRing size={30} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No notifications yet.</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Events like new leads, appointments, and follow-ups will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([label, list]) => (
            <Card key={label} className="p-0 overflow-hidden border-(--color-border)">
              <div className="px-4 py-2 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <p className="text-[11px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              </div>
              <div>
                {list.map(n => {
                  const s = NOTIF_STYLE[n.type] || NOTIF_STYLE.default
                  const Icon = s.icon
                  const isUnread = !readIds.has(n.id)
                  return (
                    <div key={n.id} onClick={() => isUnread && markRead(uid, n.id)}
                      className="group flex items-start gap-3 px-4 py-3 border-b border-(--color-border) last:border-b-0 transition-colors cursor-default"
                      style={{ background: isUnread ? 'var(--color-brand-50)' : 'transparent' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + '1a' }}>
                        <Icon size={15} style={{ color: s.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-brand)' }} />}
                          <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{n.title}</p>
                        </div>
                        {n.message && <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{n.message}</p>}
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {format(new Date(n.created_at), 'h:mm a')} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); dismiss(uid, n.id) }} title="Dismiss"
                        className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-(--color-surface-2) transition-all" style={{ color: 'var(--color-text-muted)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
