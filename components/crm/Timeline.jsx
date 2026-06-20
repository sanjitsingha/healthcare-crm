'use client'
import { MessageSquare, Phone, Mail, Calendar, Edit2, Tag, Bell, Clock, CheckSquare, TrendingUp } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

// Shared activity-type → icon + color. Each category gets its own hue so the
// timeline reads at a glance. Extend here to keep every page consistent.
export const ACTIVITY_STYLE = {
  comment:       { icon: MessageSquare, color: '#0ea5e9' }, // sky
  call:          { icon: Phone,         color: '#10b981' }, // emerald
  email:         { icon: Mail,          color: '#8b5cf6' }, // violet
  meeting:       { icon: Calendar,      color: '#6366f1' }, // indigo
  note:          { icon: Edit2,         color: '#64748b' }, // slate
  task:          { icon: CheckSquare,   color: '#f59e0b' }, // amber
  status_change: { icon: TrendingUp,    color: '#f59e0b' }, // amber
  stage_change:  { icon: TrendingUp,    color: '#f59e0b' }, // amber
  tag:           { icon: Tag,           color: '#ec4899' }, // pink
  whatsapp:      { icon: MessageSquare, color: '#22c55e' }, // whatsapp green
}
export const DEFAULT_ACTIVITY_STYLE = { icon: Bell, color: '#6366f1' }
export const activityVisual = (type) => ACTIVITY_STYLE[type] || DEFAULT_ACTIVITY_STYLE

// Which page an activity was performed on → badge label. Falls back to the
// entity it was attached to for older rows that predate source_page.
const PAGE_LABEL = {
  lead:          'Lead Page',
  patient:       'Patient Page',
  consultation:  'Consultation Page',
  contact:       'Contact Page',
  organization:  'Organization Page',
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
          const s = activityVisual(a.type)
          const Icon = s.icon
          const pageLabel = PAGE_LABEL[a.source_page || a.entity_type]
          return (
            <div key={i} className="flex gap-4 relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2"
                style={{ background: s.color + '14', borderColor: s.color + '40' }}
              >
                <Icon size={13} style={{ color: s.color }} />
              </div>
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{a.content}</p>
                  {pageLabel && (
                    <span
                      className="text-[10px] font-600 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                    >
                      {pageLabel}
                    </span>
                  )}
                </div>
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
