'use client'
import { useEffect, useState } from 'react'
import {
  LifeBuoy, Plus, Search, CheckCircle, Loader, XCircle, AlertCircle,
  ChevronDown, Phone, Mail, Timer, MessageSquare, ShieldCheck,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { getTickets } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { formatDistanceToNow, addHours, isPast } from 'date-fns'

// SLA — estimated resolution window per priority (hours)
const SLA_HOURS = { Urgent: 4, High: 24, Medium: 72, Low: 120 }

const STATUS_STYLE = {
  'Open':        { bg: '#dbeafe', color: '#1d4ed8', icon: AlertCircle },
  'In Progress': { bg: '#fef9c3', color: '#a16207', icon: Loader },
  'Resolved':    { bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  'Closed':      { bg: '#f3f4f6', color: '#6b7280', icon: XCircle },
}
const PRIORITY_STYLE = {
  Low:    { bg: '#f1f5f9', color: '#64748b' },
  Medium: { bg: '#fef9c3', color: '#a16207' },
  High:   { bg: '#fee2e2', color: '#b91c1c' },
  Urgent: { bg: '#f3e8ff', color: '#7c3aed' },
}

const STEPS = ['Open', 'In Progress', 'Resolved']

// ── Status progress stepper (read-only) ────────────────────────
function StatusStepper({ status }) {
  if (status === 'Closed') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-600" style={{ color: '#6b7280' }}>
        <XCircle size={13} /> Ticket closed
      </div>
    )
  }
  const currentIdx = STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx
        return (
          <div key={step} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: done ? 'var(--color-brand)' : 'var(--color-border)' }} />
              <span className="text-[10px] font-600" style={{ color: done ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>{step}</span>
            </div>
            {i < STEPS.length - 1 && <span className="w-5 h-px" style={{ background: i < currentIdx ? 'var(--color-brand)' : 'var(--color-border)' }} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Ticket card (read-only status) ─────────────────────────────
function TicketCard({ ticket }) {
  const [expanded, setExpanded] = useState(false)
  const st  = STATUS_STYLE[ticket.status]     || STATUS_STYLE.Open
  const pri = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.Medium
  const StIcon = st.icon

  const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed'
  const slaTarget  = addHours(new Date(ticket.created_at), SLA_HOURS[ticket.priority] || 72)

  return (
    <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: st.bg }}>
          <StIcon size={16} style={{ color: st.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{ticket.subject}</span>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{ticket.status}</span>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full uppercase" style={{ background: pri.bg, color: pri.color }}>{ticket.priority}</span>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{ticket.category}</span>
            <span className="font-mono">#{ticket.id.slice(0, 8)}</span>
            <span>· raised {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
          </div>

          {/* Stepper */}
          <div className="mt-2.5"><StatusStepper status={ticket.status} /></div>

          {/* Estimate / resolution */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {isResolved ? (
              <span className="flex items-center gap-1.5" style={{ color: '#15803d' }}>
                <CheckCircle size={12} />
                {ticket.resolved_at ? `Resolved ${formatDistanceToNow(new Date(ticket.resolved_at), { addSuffix: true })}` : 'Resolved'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5" style={{ color: isPast(slaTarget) ? '#b45309' : 'var(--color-text-muted)' }}>
                <Timer size={12} />
                {isPast(slaTarget)
                  ? 'Being processed — our team is on it'
                  : `Est. resolution ${formatDistanceToNow(slaTarget, { addSuffix: true })}`}
              </span>
            )}
          </div>

          {/* Admin response (from master-admin app, read-only) */}
          {ticket.admin_response && (
            <div className="mt-2.5 p-3 rounded-lg border-l-2" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-brand)' }}>
              <p className="text-[10px] font-700 uppercase tracking-wide mb-1 flex items-center gap-1" style={{ color: 'var(--color-brand)' }}>
                <ShieldCheck size={11} /> Support Response
              </p>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{ticket.admin_response}</p>
            </div>
          )}

          {/* Expanded: description + contact */}
          {expanded && (
            <div className="mt-2.5 space-y-2">
              {ticket.description && (
                <p className="text-xs leading-relaxed whitespace-pre-line p-3 rounded-lg" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)' }}>
                  {ticket.description}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {ticket.contact_email && <span className="flex items-center gap-1"><Mail size={11} /> {ticket.contact_email}</span>}
                {ticket.contact_phone && <span className="flex items-center gap-1"><Phone size={11} /> {ticket.contact_phone}</span>}
              </div>
            </div>
          )}
        </div>

        {(ticket.description || ticket.contact_email || ticket.contact_phone) && (
          <button type="button" onClick={() => setExpanded(o => !o)}
            className="p-1.5 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-surface-2) shrink-0" style={{ color: 'var(--color-text-muted)' }}>
            <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function TicketsPage() {
  const { orgId } = useOrg()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('All')

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    getTickets({ orgId })
      .then(d => { if (active) setTickets(d || []) })
      .catch(() => { if (active) setTickets([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orgId])

  const filtered = tickets.filter(t => {
    if (filter !== 'All' && t.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return t.subject.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
    }
    return true
  })

  const openCount     = tickets.filter(t => t.status === 'Open').length
  const progressCount = tickets.filter(t => t.status === 'In Progress').length
  const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <LifeBuoy size={20} style={{ color: 'var(--color-brand)' }} /> Support Tickets
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {openCount} open · {progressCount} in progress · {resolvedCount} resolved
          </p>
        </div>
        <Link href="/tickets/new"><Button><Plus size={16} /> Raise a Ticket</Button></Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            placeholder="Search your tickets…" value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-500 border transition-all"
              style={filter === s
                ? { background: 'var(--color-brand)', color: 'white', borderColor: 'transparent' }
                : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
          <LifeBuoy size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {search || filter !== 'All' ? 'No tickets match your filters.' : "You haven't raised any tickets yet."}
          </p>
          {!search && filter === 'All' && (
            <Link href="/tickets/new" className="inline-block mt-2 text-xs font-600 transition-opacity hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
              Raise your first ticket →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}

      {/* Help footer */}
      <div className="flex gap-2.5 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
        <MessageSquare size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Our support team reviews every ticket and updates its status here. You'll see responses and resolution times directly on each ticket — no need to follow up by email.
        </p>
      </div>
    </div>
  )
}
