'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { getAuditLogs } from '@/lib/supabase/queries'
import { format } from 'date-fns'

export default function LogsPage() {
  const { orgId } = useOrg()
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const load = useCallback(async () => {
    if (!orgId) { setLogs([]); setLoading(false); return }
    setLoading(true)
    try { setLogs(await getAuditLogs({ orgId, search })) }
    catch { setLogs([]) }
    setLoading(false)
  }, [orgId, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Audit Logs</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {loading ? 'Loading…' : `${logs.length} events`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Log list */}
      {loading ? (
        <div className="flex items-center justify-center py-24"><Spinner size={24} /></div>
      ) : logs.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No events yet.
        </p>
      ) : (
        <div className="rounded-xl border border-(--color-border) overflow-hidden"
          style={{ background: 'var(--color-surface)', fontFamily: 'ui-monospace, monospace' }}>
          {logs.map((log, i) => {
            const m    = log.metadata || {}
            const when = new Date(log.created_at)
            const ts   = format(when, 'MMM dd HH:mm:ss')
            const who  = log.actor_email || log.actor_name || '—'
            const what = log.description || log.action
            const where = [m.location, m.device, m.ip].filter(Boolean).join('  ·  ')

            return (
              <div
                key={log.id}
                className="flex items-baseline gap-4 px-4 py-2 text-xs hover:bg-(--color-surface-2) transition-colors"
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                  color: log.status === 'failed' ? '#b91c1c' : 'var(--color-text-secondary)',
                }}
              >
                {/* Timestamp */}
                <span className="shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)', minWidth: 108 }}>
                  {ts}
                </span>

                {/* Who */}
                <span className="shrink-0 truncate" style={{ minWidth: 180, color: 'var(--color-text-primary)' }}>
                  {who}
                </span>

                {/* What */}
                <span className="flex-1 truncate">
                  {what}
                </span>

                {/* Where (location · device · ip) */}
                {where && (
                  <span className="shrink-0 truncate hidden lg:block" style={{ color: 'var(--color-text-muted)', maxWidth: 320 }}>
                    {where}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
