'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, LifeBuoy, Timer, CheckCircle, Loader, XCircle, AlertCircle, Clock,
} from 'lucide-react'
import { Button, Input, Select, Textarea, Spinner } from '@/components/ui'
import { createTicket, getTickets } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { formatDistanceToNow } from 'date-fns'

const CATEGORIES = ['Bug', 'Feature Request', 'Billing', 'Account', 'General', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const SLA_LABEL = { Urgent: 'within 4 hours', High: 'within 1 business day', Medium: 'within 2–3 business days', Low: 'within 5 business days' }

const STATUS_STYLE = {
  'Open':        { bg: '#dbeafe', color: '#1d4ed8', icon: AlertCircle },
  'In Progress': { bg: '#fef9c3', color: '#a16207', icon: Loader },
  'Resolved':    { bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  'Closed':      { bg: '#f3f4f6', color: '#6b7280', icon: XCircle },
}

// ── Previous ticket row ────────────────────────────────────────
function PreviousTicket({ ticket }) {
  const st = STATUS_STYLE[ticket.status] || STATUS_STYLE.Open
  const StIcon = st.icon
  return (
    <Link href="/tickets" className="flex items-start gap-2.5 px-3 py-2.5 border-b border-(--color-border) transition-colors hover:bg-(--color-surface-2)">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: st.bg }}>
        <StIcon size={13} style={{ color: st.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{ticket.subject}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{ticket.status}</span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </Link>
  )
}

export default function NewTicketPage() {
  const { orgId, user } = useOrg()
  const router = useRouter()
  const defaultEmail = user?.email || ''
  const [form, setForm]     = useState({ subject: '', description: '', category: 'General', priority: 'Medium', contact_email: defaultEmail, contact_phone: '' })
  const [saving, setSaving] = useState(false)
  const [previous, setPrevious] = useState([])
  const [loadingPrev, setLoadingPrev] = useState(true)

  useEffect(() => { setForm(f => ({ ...f, contact_email: f.contact_email || defaultEmail })) }, [defaultEmail])

  useEffect(() => {
    if (!orgId) return
    let active = true
    getTickets({ orgId })
      .then(d => { if (active) setPrevious(d || []) })
      .catch(() => { if (active) setPrevious([]) })
      .finally(() => { if (active) setLoadingPrev(false) })
    return () => { active = false }
  }, [orgId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.contact_email.trim() || !orgId) return
    setSaving(true)
    try {
      await createTicket({ ...form, organization_id: orgId, created_by: user?.id || null, status: 'Open' })
      router.push('/tickets')
    } catch (err) { alert(err.message); setSaving(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center gap-3" style={{ background: 'var(--color-surface)' }}>
        <Link href="/tickets" className="flex items-center gap-1.5 text-sm hover:opacity-60 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={16} /> Tickets
        </Link>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Raise a Ticket</span>
      </div>

      <div className="flex items-start">

        {/* ── Left: previous tickets sidenav ── */}
        <aside className="w-72 shrink-0 border-r border-(--color-border) sticky top-14 h-[calc(100vh-57px)] overflow-y-auto" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-(--color-border)">
            <Clock size={15} style={{ color: 'var(--color-brand)' }} />
            <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Your Previous Tickets</p>
          </div>

          {loadingPrev ? (
            <div className="flex justify-center py-10"><Spinner size={22} /></div>
          ) : previous.length === 0 ? (
            <div className="py-12 text-center px-4">
              <LifeBuoy size={22} className="mx-auto mb-2 opacity-25" />
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No tickets yet.</p>
            </div>
          ) : (
            <div>
              {previous.map(t => <PreviousTicket key={t.id} ticket={t} />)}
            </div>
          )}
        </aside>

        {/* ── Right: form ── */}
        <div className="flex-1 min-w-0 p-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
                <LifeBuoy size={20} style={{ color: 'var(--color-brand)' }} />
              </div>
              <div>
                <h1 className="text-lg font-700" style={{ color: 'var(--color-text-primary)' }}>Raise a Ticket</h1>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tell us what's going on — our support team will follow up.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl border border-(--color-border) p-6 space-y-4" style={{ background: 'var(--color-surface)' }}>
              <Input label="Subject *" placeholder="Brief summary of your issue" value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />

              <div className="grid grid-cols-2 gap-4">
                <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  options={PRIORITIES.map(p => ({ value: p, label: p }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Email *" type="email" placeholder="you@example.com" value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} required />
                <Input label="Phone (optional)" placeholder="+91 98765 43210" value={form.contact_phone}
                  onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>

              <Textarea label="Description" placeholder="Describe the issue in detail — what happened, what you expected…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={6} />

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                <Timer size={13} />
                Estimated response for <span className="font-700">{form.priority}</span> priority: {SLA_LABEL[form.priority]}.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
                <Link href="/tickets"><Button variant="secondary" type="button">Cancel</Button></Link>
                <Button type="submit" disabled={saving || !form.subject.trim() || !form.contact_email.trim()}>
                  {saving ? 'Submitting…' : 'Submit Ticket'}
                </Button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
