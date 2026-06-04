'use client'
import { MessageSquare, Phone, Mail, Calendar, Edit2, Tag, Bell, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

// Shared activity-type → icon map. Extend here to keep every page consistent.
const ACTIVITY_ICON = {
  comment:       MessageSquare,
  call:          Phone,
  email:         Mail,
  meeting:       Calendar,
  note:          Edit2,
  status_change: Tag,
  whatsapp:      MessageSquare,
}

/**
 * Consistent activity timeline used across Lead, Patient, Consultation (and future) pages.
 * props:
 *  - activities: [{ type, content, created_at }]
 *  - maxHeight:  optional CSS value (e.g. '24rem') to cap height + enable scroll
 *  - emptyText:  message when there are no activities
 */
export default function Timeline({ activities = [], maxHeight, emptyText = 'No activity recorded yet.' }) {
  if (!activities.length) {
    return (
      <div className="py-16 text-center border border-dashed rounded-xl border-(--color-border)">
        <Clock size={28} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="relative overflow-y-auto pr-1" style={maxHeight ? { maxHeight } : undefined}>
      {/* connector line */}
      <div className="absolute left-4 top-4 bottom-4 w-px" style={{ background: 'var(--color-border)' }} />
      <div className="space-y-4">
        {activities.map((a, i) => {
          const Icon = ACTIVITY_ICON[a.type] || Bell
          return (
            <div key={i} className="flex gap-4 relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <Icon size={13} style={{ color: 'var(--color-brand)' }} />
              </div>
              <div className="flex-1 min-w-0 pb-4">
                <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{a.content}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {format(new Date(a.created_at), 'MMM d, yyyy · h:mm a')} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
