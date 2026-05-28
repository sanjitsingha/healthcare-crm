'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Calendar as CalIcon, Clock, User, MapPin, MoreHorizontal, Check, X, Filter } from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Select, Spinner, Avatar } from '@/components/ui'
import { getAppointments, createAppointment, updateAppointment, getPatients, getLeads } from '@/lib/supabase/queries'
import { format, isToday, isFuture, isPast } from 'date-fns'
import clsx from 'clsx'

function BookAppointmentModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    patient_id: '', lead_id: '', scheduled_at: '',
    duration_minutes: 30, notes: '', doctor_id: null
  })
  const [patients, setPatients] = useState([])
  const [leads, setLeads] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([getPatients(), getLeads()]).then(([p, l]) => {
        setPatients(p || [])
        setLeads(l || [])
      })
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.scheduled_at) return
    setSaving(true)
    try {
      const appt = await createAppointment({
        ...form,
        organization_id: '00000000-0000-0000-0000-000000000000',
        status: 'booked'
      })
      onCreated(appt)
      setForm({ patient_id: '', lead_id: '', scheduled_at: '', duration_minutes: 30, notes: '' })
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Book New Appointment" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Select Patient" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
            options={[{ value: '', label: 'Select patient...' }, ...patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name || ''}` }))]} />
          <Select label="Link to Lead (Optional)" value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
            options={[{ value: '', label: 'Select lead...' }, ...leads.map(l => ({ value: l.id, label: l.title }))]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date & Time *" type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required />
          <Input label="Duration (mins)" type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
        </div>
        <Select label="Assign Doctor" options={[{ value: '', label: 'Any available doctor' }]} />
        <Input label="Notes" placeholder="Reason for visit..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Booking...' : 'Book Appointment'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState('upcoming') // upcoming, past, all

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAppointments()
      setAppointments(data || [])
    } catch { setAppointments([]) }
    setLoading(false)
  }, [])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateAppointment(id, { status })
      loadAppointments()
    } catch (e) { alert(e.message) }
  }

  const filteredAppointments = appointments.filter(a => {
    if (view === 'upcoming') return isFuture(new Date(a.scheduled_at)) || isToday(new Date(a.scheduled_at))
    if (view === 'past') return isPast(new Date(a.scheduled_at)) && !isToday(new Date(a.scheduled_at))
    return true
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Appointments</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Manage doctor schedules and patient visits</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shadow-lg shadow-[var(--color-brand)]/20">
          <Plus size={16} /> Book Appointment
        </Button>
      </div>

      <div className="flex border-b border-[var(--color-border)]">
        {[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'past', label: 'History' },
          { id: 'all', label: 'All Schedule' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={clsx(
              'px-6 py-3 text-xs font-700 transition-all border-b-2',
              view === tab.id
                ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map(a => (
            <Card key={a.id} className="p-0 overflow-hidden border-[var(--color-border)] hover:border-[var(--color-brand-light)] transition-all bg-white shadow-sm">
              <div className="flex flex-col md:flex-row">
                {/* Time Slot */}
                <div className="md:w-48 bg-gray-50/50 p-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--color-border)]">
                  <p className="text-[10px] font-800 text-[var(--color-brand)] uppercase tracking-widest mb-1">{format(new Date(a.scheduled_at), 'EEEE')}</p>
                  <p className="text-2xl font-900 text-[var(--color-text-primary)]">{format(new Date(a.scheduled_at), 'h:mm')}</p>
                  <p className="text-xs font-700 text-[var(--color-text-primary)]">{format(new Date(a.scheduled_at), 'a')}</p>
                  <div className="mt-3 px-2 py-1 bg-white rounded-full border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-700 text-gray-500">{format(new Date(a.scheduled_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <Avatar name={`${a.patients?.first_name} ${a.patients?.last_name || ''}`} size="lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-800 text-base" style={{ color: 'var(--color-text-primary)' }}>
                          {a.patients?.first_name} {a.patients?.last_name || ''}
                        </h3>
                        <Badge className={clsx(
                          a.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                          a.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        )}>{a.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          <User size={12} className="text-[var(--color-text-muted)]" /> Dr. Available
                        </p>
                        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          <Clock size={12} className="text-[var(--color-text-muted)]" /> {a.duration_minutes} mins duration
                        </p>
                        {a.leads && (
                          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-brand)' }}>
                            <Filter size={12} /> Linked: {a.leads.title}
                          </p>
                        )}
                      </div>
                      {a.notes && <p className="mt-3 text-xs italic text-[var(--color-text-muted)] border-l-2 border-gray-100 pl-3">&quot;{a.notes}&quot;</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {a.status === 'booked' && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => handleStatusUpdate(a.id, 'cancelled')} className="text-red-600 border-red-100 hover:bg-red-50">Cancel</Button>
                        <Button size="sm" onClick={() => handleStatusUpdate(a.id, 'completed')} className="bg-green-600 hover:bg-green-700">Mark Completed</Button>
                      </>
                    )}
                    {a.status !== 'booked' && (
                       <Button size="sm" variant="secondary" className="opacity-50 pointer-events-none">Archived</Button>
                    )}
                    <button className="p-2 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100">
                      <MoreHorizontal size={18} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filteredAppointments.length === 0 && (
            <div className="py-20 text-center border border-dashed rounded-2xl bg-white">
              <p className="text-sm font-600 text-[var(--color-text-muted)]">No appointments scheduled in this view.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCreateOpen(true)}>Book your first one now</Button>
            </div>
          )}
        </div>
      )}

      <BookAppointmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { loadAppointments(); setCreateOpen(false) }}
      />
    </div>
  )
}
