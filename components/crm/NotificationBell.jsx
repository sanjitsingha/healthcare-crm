'use client'
import { useEffect, useState } from 'react'
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

  useEffect(() => subscribeNotifState(() => force(n => n + 1)), [])

  if (!orgId) return null

  const readIds = getReadIds(uid)
  const dismissed = getDismissedIds(uid)
  const visible = rows.filter(n => !dismissed.has(n.id))
  const unread = visible.filter(n => !readIds.has(n.id)).length
  const recent = visible.slice(0, 8)

  return (
    <>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label="Notifications"
        className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-(--color-surface-2)"
        style={{ color: 'var(--color-text-secondary)' }}>
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-1 rounded-full text-[9px] font-700 text-white flex items-center justify-center"
            style={{ background: '#dc2626' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-15 right-3 z-50 w-96 max-w-[90vw] rounded-2xl border border-(--color-border) overflow-hidden"
            style={{ background: 'var(--color-surface)', boxShadow: '0 16px 40px rgba(13,31,26,0.20)', animation: 'panelDown 0.22s cubic-bezier(0.22,1,0.36,1)' }}>
            {/* Header — title + (small) See all */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
              <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>
                Notifications {unread > 0 && <span className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>· {unread} new</span>}
              </p>
              <div className="flex items-center gap-1.5">
                {unread > 0 && (
                  <button type="button" onClick={() => markAllRead(uid, visible.map(n => n.id))} title="Mark all read"
                    className="inline-flex items-center gap-1 text-[11px] font-600 px-1.5 py-1 rounded-md hover:bg-(--color-surface)" style={{ color: 'var(--color-text-muted)' }}>
                    <CheckCheck size={12} />
                  </button>
                )}
                <Link href="/notifications" onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-[11px] font-700 px-2 py-1 rounded-md hover:bg-(--color-surface)" style={{ color: 'var(--color-brand)' }}>
                  See all <ArrowRight size={11} />
                </Link>
              </div>
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
          </div>
        </>
      )}
    </>
  )
}
