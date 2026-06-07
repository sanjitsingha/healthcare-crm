'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Bell, TrendingUp, UserRound, Calendar, PhoneCall, CheckSquare, Stethoscope } from 'lucide-react'
import { subscribeToast } from '@/lib/toast'
import { addNotification } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/context/OrgContext'

// Icon + color per notification type.
export const NOTIF_STYLE = {
  lead_created:    { icon: TrendingUp,  color: '#6366f1' },
  patient_created: { icon: UserRound,   color: '#10b981' },
  appointment:     { icon: Calendar,    color: '#8b5cf6' },
  followup:        { icon: PhoneCall,   color: '#0ea5e9' },
  task:            { icon: CheckSquare, color: '#f59e0b' },
  consultation:    { icon: Stethoscope, color: '#ec4899' },
  default:         { icon: Bell,        color: '#21297E' },
}

// Presentational toast card — rectangle, icon on the left, title + info on the
// right, with a primary-colored timer bar along the bottom (100% → 0).
export function ToastCard({ type = 'default', title, message, onClose, duration = 5000, loop = false }) {
  const s = NOTIF_STYLE[type] || NOTIF_STYLE.default
  const Icon = s.icon
  return (
    <div
      className="relative overflow-hidden flex items-start gap-3 w-80 p-3 rounded-xl border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 12px 32px rgba(13,31,26,0.16), 0 2px 8px rgba(13,31,26,0.08)',
      }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + '1a' }}>
        <Icon size={18} style={{ color: s.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-700 leading-tight" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {message && <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{message}</p>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 -mr-0.5 -mt-0.5 p-1 rounded-md hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <X size={14} />
        </button>
      )}
      {/* Timer bar */}
      <span
        className="absolute left-0 bottom-0 h-0.5"
        style={{
          background: 'var(--color-brand)',
          animation: `toastTimer ${duration}ms linear ${loop ? 'infinite' : 'forwards'}`,
        }}
      />
    </div>
  )
}

// Global host: listens for toast() calls and renders them bottom-right with a
// slide-in → stay → slide-out animation. Mounted once in the dashboard layout.
export default function ToastHost() {
  const { orgId, user } = useOrg()
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const channelRef = useRef(null)

  // Push a toast into the stack + schedule its exit, and record it in history.
  const addToast = (opts) => {
    addNotification(user?.id, { eid: opts?.eid, type: opts?.type, title: opts?.title, message: opts?.message })
    const id = ++idRef.current
    const duration = opts?.duration ?? 5000
    setToasts(list => [...list, { id, leaving: false, duration, ...opts }])
    setTimeout(() => {
      setToasts(list => list.map(t => t.id === id ? { ...t, leaving: true } : t))
      setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 320)
    }, duration)
  }

  // Org-wide realtime channel: receive toasts broadcast by other clients.
  useEffect(() => {
    if (!orgId) return
    const supabase = createClient()
    const channel = supabase.channel(`org-notify-${orgId}`, { config: { broadcast: { self: false } } })
    channel.on('broadcast', { event: 'toast' }, ({ payload }) => addToast(payload))
    channel.subscribe()
    channelRef.current = channel
    return () => { try { supabase.removeChannel(channel) } catch {} channelRef.current = null }
  }, [orgId])

  // Local toast() calls: show here immediately, and broadcast to other clients.
  useEffect(() => {
    return subscribeToast((opts) => {
      addToast(opts)
      try { channelRef.current?.send({ type: 'broadcast', event: 'toast', payload: opts }) } catch {}
    })
  }, [])

  const dismiss = (id) => {
    setToasts(list => list.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 320)
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-5 bottom-16 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto" style={{ animation: `${t.leaving ? 'toastOut' : 'toastIn'} 0.3s cubic-bezier(0.22,1,0.36,1) forwards` }}>
          <ToastCard type={t.type} title={t.title} message={t.message} duration={t.duration} onClose={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  )
}
