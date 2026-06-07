'use client'
import { X, Bell, TrendingUp, UserRound, Calendar, PhoneCall, CheckSquare, Stethoscope } from 'lucide-react'

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

// Temporary static preview so the UI can be reviewed before wiring animation + triggers.
export default function ToastPreview() {
  return (
    <div className="fixed right-5 bottom-16 z-50">
      <ToastCard
        type="appointment"
        title="Appointment Booked"
        message="PT1 has an appointment with Dr. Sharma on Jun 12, 10:00 AM"
        duration={4000}
        loop
      />
    </div>
  )
}
