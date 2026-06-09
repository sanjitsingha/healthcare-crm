'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw, Wifi, Monitor, MapPin } from 'lucide-react'
import { Card, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { getAuditLogs } from '@/lib/supabase/queries'
import { AUDIT } from '@/lib/audit'
import { format } from 'date-fns'

// Label + colors per action.
const META = {
  [AUDIT.LOGIN]:             { tag: 'Login',          color: '#15803d', bg: '#dcfce7' },
  [AUDIT.LOGOUT]:            { tag: 'Logout',         color: '#b45309', bg: '#fef3c7' },
  [AUDIT.PATIENT_VIEW]:      { tag: 'Viewed',         color: '#1d4ed8', bg: '#dbeafe' },
  [AUDIT.PATIENT_EDIT]:      { tag: 'Edited',         color: '#7c3aed', bg: '#f3e8ff' },
  [AUDIT.RECORD_DELETE]:     { tag: 'Deleted',        color: '#b91c1c', bg: '#fee2e2' },
  [AUDIT.USER_CREATE]:       { tag: 'User',           color: '#0e7490', bg: '#cffafe' },
  [AUDIT.PERMISSION_CHANGE]: { tag: 'Permission',     color: '#be185d', bg: '#fce7f3' },
  [AUDIT.DATA_EXPORT]:       { tag: 'Export',         color: '#374151', bg: '#f3f4f6' },
}
const FALLBACK = { tag: 'Event', color: '#374151', bg: '#f3f4f6' }

export default function LogsPage() {
  const { orgId } = useOrg()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const load = useCallback(async () => {
    if (!orgId) { setLogs([]); setLoading(false); return }
    setLoading(true)
    try {
      const rows = await getAuditLogs({ orgId, search })
      setLogs(rows)
    } catch (err) {
      console.error(err)
      setLogs([])
    }
    setLoading(false)
  }, [orgId, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Audit Logs</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Critical activity — logins, record access, edits, deletions, user changes &amp; exports.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search user, IP, or text…"
              className="w-56 pl-9 pr-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <button
            type="button"
            onClick={load}
            title="Refresh"
            className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24"><Spinner size={28} /></div>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No activity logged yet.</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Events appear here as users sign in, view/edit records, and export data.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {logs.map((log, i) => {
            const meta = META[log.action] || FALLBACK
            const m = log.metadata || {}
            const failed = log.status === 'failed'
            const when = new Date(log.created_at)
            return (
              <div
                key={log.id}
                className="flex items-center gap-3 px-4 py-3 flex-wrap"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}
              >
                {/* Action tag */}
                <span
                  className="text-[11px] font-700 px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: meta.bg, color: meta.color, minWidth: 78, textAlign: 'center' }}
                >
                  {meta.tag}
                </span>

                {/* Actor */}
                <div className="min-w-40">
                  <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>
                    {log.actor_name || 'Unknown user'}
                  </span>
                  {log.actor_email && (
                    <span className="text-xs ml-1.5" style={{ color: 'var(--color-text-muted)' }}>{log.actor_email}</span>
                  )}
                </div>

                {/* IP */}
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)', minWidth: 110 }}>
                  <Wifi size={12} /> {m.ip || '—'}
                </span>

                {/* Device */}
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)', minWidth: 130 }}>
                  <Monitor size={12} /> {m.device || '—'}
                </span>

                {/* Location */}
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)', minWidth: 140 }}>
                  <MapPin size={12} /> {m.location || '—'}
                </span>

                {/* Detail */}
                <span className="text-xs flex-1 min-w-32 truncate" style={{ color: failed ? '#b91c1c' : 'var(--color-text-secondary)' }}>
                  {failed ? '✗ ' : ''}{log.description || (log.entity_type ? `${log.action} · ${log.entity_type}` : log.action)}
                </span>

                {/* Time */}
                <span className="text-xs ml-auto shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {format(when, 'MMM d, yyyy · h:mm a')}
                </span>
              </div>
            )
          })}
        </Card>
      )}

      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
        Showing up to 500 most recent events.
      </p>
    </div>
  )
}
