'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, ArrowRight } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import { NOTIF_STYLE } from '@/components/crm/Toast'
import { getNotifications } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/client'
import { getReadIds, getDismissedIds, markRead, markAllRead, subscribeNotifState } from '@/lib/notifications'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationBell() {
  const { orgId, user } = useOrg()
  const uid = user?.id
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [, force] = useState(0)
  const ref = useRef(null)

  // Initial load + live inserts.
  useEffect(() => {
    if (!orgId) return
    getNotifications({ orgId }).then(r => setRows(r || [])).catch(() => setRows([]))
    const supabase = createClient()
    const ch = supabase
      .channel(`notif-bell-${orgId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `organization_id=eq.${orgId}` },
        ({ new: row }) => setRows(list => list.some(x => x.id === row.id) ? list : [row, ...list]))
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [orgId])

  // Re-render when read/dismiss state changes (from this or the full page).
  useEffect(() => subscribeNotifState(() => force(n => n + 1)), [])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  if (!orgId) return null

  const readIds = getReadIds(uid)
  const dismissed = getDismissedIds(uid)
  const visible = rows.filter(n => !dismissed.has(n.id))
  const unread = visible.filter(n => !readIds.has(n.id)).length
  const recent = visible.slice(0, 8)

  return (
    <div ref={ref} className="fixed top-3 right-4 z-50">
      <button type="button" onClick={() => setOpen(o => !o)} aria-label="Notifications"
        className="relative w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:bg-(--color-surface-2)"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 2px 8px rgba(13,31,26,0.08)' }}>
        <Bell size={17} style={{ color: 'var(--color-text-secondary)' }} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-700 text-white flex items-center justify-center"
            style={{ background: '#dc2626' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-2xl border border-(--color-border) overflow-hidden"
          style={{ background: 'var(--color-surface)', boxShadow: '0 16px 40px rgba(13,31,26,0.18)' }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>
              Notifications {unread > 0 && <span className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>· {unread} new</span>}
            </p>
            {unread > 0 && (
              <button type="button" onClick={() => markAllRead(uid, visible.map(n => n.id))}
                className="inline-flex items-center gap-1 text-[11px] font-600 px-2 py-1 rounded-md hover:bg-(--color-surface)" style={{ color: 'var(--color-text-muted)' }}>
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={26} className="mx-auto mb-2 opacity-25" />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No notifications yet.</p>
              </div>
            ) : recent.map(n => {
              const s = NOTIF_STYLE[n.type] || NOTIF_STYLE.default
              const Icon = s.icon
              const isUnread = !readIds.has(n.id)
              return (
                <div key={n.id} onClick={() => isUnread && markRead(uid, n.id)}
                  className="flex items-start gap-3 px-4 py-2.5 border-b border-(--color-border) last:border-b-0 cursor-default transition-colors"
                  style={{ background: isUnread ? 'var(--color-brand-50)' : 'transparent' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + '1a' }}>
                    <Icon size={14} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{n.title}</p>
                    {n.message && <p className="text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{n.message}</p>}
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                  {isUnread && <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--color-brand)' }} />}
                </div>
              )
            })}
          </div>

          <Link href="/notifications" onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-600 border-t border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
            style={{ color: 'var(--color-brand)' }}>
            View all notifications <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  )
}
