'use client'
import { useEffect, useState } from 'react'
import {
  Plus, Calendar, Clock, User, UserRound, Link2,
  Check, X, ChevronRight,
} from 'lucide-react'
import { Button, Card, Modal, Input, Select, Textarea, Spinner, Avatar } from '@/components/ui'
import { getAppointments, createAppointment, updateAppointment, getPatients, getLeads } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { format, isToday, isFuture, isPast, isTomorrow } from 'date-fns'
import clsx from 'clsx'

const STATUS_STYLE = {
  booked:    { bg: '#dbeafe', color: '#1d4ed8', label: 'Booked' },
  confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
  completed: { bg: '#f3f4f6', color: '#374151', label: 'Completed' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled' },
}

const TABS = [
  { id: 'today',    label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'history',  label: 'History' },
  { id: 'all',      label: 'All' },
]

// ── Book Appointment Modal ─────────────────────────────────────
function BookModal({ open, onClose, onCreated, orgId }) {
  const [form, setForm]     = useState({ patient_id: '', lead_id: '', date: '', time: '10:00', notes: '' })
  const [patients, setPatients] = useState([])
  const [leads,    setLeads]    = useState([])
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!open || !orgId) return
    Promise.all([getPatients({ orgId }), getLeads({ orgId })]).then(([p, l]) => {
      setPatients(p || [])
      setLeads(l || [])
    })
  }, [open, orgId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.patient_id || !form.date || !orgId) return
    setSaving(true)
    try {
      const scheduledAt = new Date(`${form.date}T${form.time || '10:00'}:00`)
      const appt = await createAppointment({
        patient_id:    form.patient_id,
        lead_id:       form.lead_id || null,
        scheduled_at:  scheduledAt.toISOString(),
        notes:         form.notes || null,
        status:        'booked',
        organization_id: orgId,
      })
      onCreated(appt)
      onClose()
      setForm({ patient_id: '', lead_id: '', date: '', time: '10:00', notes: '' })
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Book Appointment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Patient *"
          value={form.patient_id}
          onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
          options={[
            { value: '', label: 'Select patient…' },
            ...patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name || ''}`.trim() })),
          ]}
        />
        <Select
          label="Link to Lead (optional)"
          value={form.lead_id}
          onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
          options={[
            { value: '', label: '— None —' },
            ...leads.map(l => ({
              value: l.id,
              label: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.title,
            })),
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Time</label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Doctor</label>
          <div className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            No doctor available
          </div>
        </div>
        <Textarea
          label="Notes"
          placeholder="Reason for visit, special instructions…"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
        />
        <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving || !form.patient_id || !form.date}>
            {saving ? 'Booking…' : <><Calendar size={14} /> Book Appointment</>}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Appointment card ───────────────────────────────────────────
function ApptCard({ appt, staffMembers, onStatusChange }) {
  const st   = STATUS_STYLE[appt.status] || STATUS_STYLE.booked
  const date = new Date(appt.scheduled_at)
  const patientName = [appt.patients?.first_name, appt.patients?.last_name].filter(Boolean).join(' ') || 'Unknown Patient'
  const leadName    = appt.leads
    ? ([appt.leads.first_name, appt.leads.last_name].filter(Boolean).join(' ') || appt.leads.title || 'Lead')
    : null

  const getDateLabel = () => {
    if (isToday(date))    return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE, MMM d yyyy')
  }

  const canAct = appt.status === 'booked' || appt.status === 'confirmed'

  return (
    <div
      className="rounded-2xl border border-(--color-border) overflow-hidden transition-shadow hover:shadow-sm"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="flex items-stretch">
        {/* Date block */}
        <div
          className="w-36 shrink-0 flex flex-col items-center justify-center gap-0.5 p-4 border-r border-(--color-border)"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-brand)' }}>
            {getDateLabel()}
          </p>
          <p className="text-2xl font-800 leading-none" style={{ color: 'var(--color-text-primary)' }}>
            {format(date, 'h:mm')}
          </p>
          <p className="text-xs font-600" style={{ color: 'var(--color-text-muted)' }}>
            {format(date, 'a · MMM d')}
          </p>
        </div>

        {/* Main info */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Patient */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {appt.patients?.id ? (
                  <Link
                    href={`/patients/${appt.patients.id}`}
                    className="text-sm font-700 hover:underline truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {patientName}
                  </Link>
                ) : (
                  <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{patientName}</span>
                )}
                <span
                  className="text-[10px] font-700 px-2 py-0.5 rounded-full shrink-0 capitalize"
                  style={{ background: st.bg, color: st.color }}
                >
                  {st.label}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <UserRound size={12} /> Patient
                </span>

                {leadName && appt.leads?.id && (
                  <Link
                    href={`/leads/${appt.leads.id}`}
                    className="flex items-center gap-1 text-xs font-500 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    <Link2 size={11} /> {leadName}
                  </Link>
                )}
              </div>

              {appt.notes && (
                <p className="mt-2 text-xs italic border-l-2 pl-3" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                  "{appt.notes}"
                </p>
              )}
            </div>

            {/* Actions */}
            {canAct && (
              <div className="flex items-center gap-1.5 shrink-0">
                {appt.status === 'booked' && (
                  <button
                    type="button"
                    onClick={() => onStatusChange(appt.id, 'confirmed')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors"
                    style={{ background: '#dcfce7', color: '#15803d' }}
                  >
                    <Check size={11} /> Confirm
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onStatusChange(appt.id, 'completed')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors"
                  style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                >
                  <Check size={11} /> Complete
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(appt.id, 'cancelled')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-red-50"
                  style={{ borderColor: '#fecaca', color: '#b91c1c' }}
                >
                  <X size={11} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { orgId, org }          = useOrg()
  const [appointments, setAppointments] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('upcoming')
  const [createOpen,   setCreateOpen]   = useState(false)

  const staffMembers = org?.settings?.staff_members || []

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    getAppointments({ orgId })
      .then(data => { if (active) setAppointments(data || []) })
      .catch(() => { if (active) setAppointments([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orgId])

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await updateAppointment(id, { status })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: updated.status } : a))
    } catch (e) { alert(e.message) }
  }

  const handleCreated = (appt) => setAppointments(prev => [appt, ...prev])

  const filtered = appointments.filter(a => {
    const d = new Date(a.scheduled_at)
    if (tab === 'today')    return isToday(d)
    if (tab === 'upcoming') return (isFuture(d) || isToday(d)) && a.status !== 'cancelled'
    if (tab === 'history')  return isPast(d) && !isToday(d)
    return true
  })

  // Stats
  const todayCount    = appointments.filter(a => isToday(new Date(a.scheduled_at))).length
  const upcomingCount = appointments.filter(a => isFuture(new Date(a.scheduled_at)) && a.status !== 'cancelled').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Appointments</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {todayCount} today · {upcomingCount} upcoming · {completedCount} completed
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Book Appointment
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-(--color-border)">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-5 py-3 text-xs font-600 border-b-2 transition-all',
              tab === t.id ? 'border-(--color-brand)' : 'border-transparent hover:border-(--color-border)'
            )}
            style={tab === t.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}
          >
            {t.label}
            {t.id === 'today' && todayCount > 0 && (
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-700"
                style={{ background: 'var(--color-brand)', color: 'white' }}>
                {todayCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
          <Calendar size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {tab === 'today' ? 'No appointments today.' : tab === 'upcoming' ? 'No upcoming appointments.' : 'No appointments found.'}
          </p>
          {tab !== 'history' && (
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-2 text-xs font-600 transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-brand)' }}
            >
              Book one now →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
            .map(a => (
              <ApptCard
                key={a.id}
                appt={a}
                staffMembers={staffMembers}
                onStatusChange={handleStatusChange}
              />
            ))}
        </div>
      )}

      <BookModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        orgId={orgId}
      />
    </div>
  )
}
