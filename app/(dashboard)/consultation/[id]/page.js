'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Stethoscope, Plus, Calendar, Clock, CheckSquare, History,
  Phone, Mail, User, UserRound, TrendingUp, ChevronDown, Check, X,
  MessageSquare, Edit2, Tag, Bell,
} from 'lucide-react'
import { Button, Card, Spinner, Avatar, Input, Select, Textarea } from '@/components/ui'
import {
  getPatient, getLead, getConsultations,
  getAppointments, createAppointment, updateAppointment,
  getTasks, createTask, updateTask, getActivities,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Timeline from '@/components/crm/Timeline'
import { format, formatDistanceToNow, isToday } from 'date-fns'
import clsx from 'clsx'

const TYPE_STYLE = {
  'Initial': { bg: '#dbeafe', color: '#1d4ed8' }, 'Follow-up': { bg: '#f3e8ff', color: '#7c3aed' },
  'Urgent': { bg: '#fee2e2', color: '#b91c1c' }, 'Routine': { bg: '#dcfce7', color: '#15803d' },
  'Teleconsultation': { bg: '#fef9c3', color: '#a16207' }, 'Walk-in': { bg: '#f3f4f6', color: '#374151' },
}
const C_STATUS = {
  'Scheduled': { bg: '#fef9c3', color: '#a16207' }, 'Completed': { bg: '#dcfce7', color: '#15803d' },
  'Cancelled': { bg: '#fee2e2', color: '#b91c1c' }, 'No-Show': { bg: '#f3f4f6', color: '#6b7280' },
}
const ACTIVITY_ICON = { comment: MessageSquare, call: Phone, email: Mail, meeting: Calendar, note: Edit2, status_change: Tag, whatsapp: MessageSquare }

function ConsultationRecord({ c, doctors }) {
  const [open, setOpen] = useState(false)
  const t = TYPE_STYLE[c.consultation_type] || TYPE_STYLE.Routine
  const s = C_STATUS[c.status] || C_STATUS.Completed
  const doctor = c.doctor_id ? doctors.find(d => d.id === c.doctor_id) : null
  return (
    <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-3 p-3.5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
          <Stethoscope size={16} style={{ color: 'var(--color-brand)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{format(new Date(c.consulted_at), 'MMM d, yyyy')}</span>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: t.bg, color: t.color }}>{c.consultation_type}</span>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{c.status}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
            {doctor && <span className="flex items-center gap-1"><User size={11} />{doctor.name}</span>}
            {c.chief_complaint && <span className="truncate">{c.chief_complaint}</span>}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
      </div>
      {open && (
        <div className="border-t border-(--color-border) p-4 grid grid-cols-2 gap-4" style={{ background: 'var(--color-surface-2)' }}>
          {[
            ['Chief Complaint', c.chief_complaint], ['Diagnosis', c.diagnosis],
            ['Clinical Notes', c.clinical_notes], ['Treatment Plan', c.treatment_plan], ['Prescription', c.prescription],
          ].filter(([, v]) => v).map(([label, v]) => (
            <div key={label}>
              <p className="text-[10px] font-700 uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{v}</p>
            </div>
          ))}
          {Array.isArray(c.visit_details) && c.visit_details.length > 0 && (
            <div className="col-span-2">
              <p className="text-[10px] font-700 uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Visit Details</p>
              <div className="rounded-lg border border-(--color-border) overflow-hidden">
                {c.visit_details.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.5fr] border-b border-(--color-border) last:border-b-0" style={{ background: 'var(--color-surface)' }}>
                    <span className="px-3 py-1.5 text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>{r.label || '—'}</span>
                    <span className="px-3 py-1.5 text-xs border-l border-(--color-border)" style={{ color: 'var(--color-text-primary)' }}>{r.value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ConsultationDetailPage({ params }) {
  const { id } = use(params)
  const { orgId, org } = useOrg()
  const doctors = org?.settings?.doctors || []

  const [loading, setLoading]   = useState(true)
  const [entity, setEntity]     = useState(null)   // { type, id, data }
  const [consultations, setConsultations] = useState([])
  const [appointments, setAppointments]   = useState([])
  const [tasks, setTasks]       = useState([])
  const [activities, setActivities] = useState([])

  // right column
  const [rightTab, setRightTab] = useState('tasks')
  const [addingTask, setAddingTask] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'Medium', due_date: '' })
  const [savingTask, setSavingTask] = useState(false)

  // appointments
  const [addingAppt, setAddingAppt] = useState(false)
  const [apptForm, setApptForm] = useState({ date: '', time: '10:00', doctor_id: '', notes: '' })
  const [savingAppt, setSavingAppt] = useState(false)

  useEffect(() => {
    if (!orgId || !id) return
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        // Detect whether id is a patient or a lead
        let ent = null
        const p = await getPatient(id).catch(() => null)
        if (p) ent = { type: 'patient', id, data: p }
        else {
          const l = await getLead(id).catch(() => null)
          if (l) ent = { type: 'lead', id, data: l }
        }
        if (!active) return
        setEntity(ent)
        if (!ent) { setLoading(false); return }

        const leadIds = ent.type === 'patient' ? (ent.data.leads || []).map(l => l.id) : []
        const allIds = new Set([id, ...leadIds])  // this entity + its linked leads
        const [ownCons, appts, ownActs, ownTasks, leadConsList, leadActsList, leadTasksList] = await Promise.all([
          getConsultations(ent.type === 'patient' ? { orgId, patientId: id } : { orgId, leadId: id }),
          getAppointments({ orgId }),
          getActivities(ent.type, id, orgId),
          getTasks({ entityType: ent.type, entityId: id, orgId }),
          Promise.all(leadIds.map(lid => getConsultations({ orgId, leadId: lid }))),
          Promise.all(leadIds.map(lid => getActivities('lead', lid, orgId))),
          Promise.all(leadIds.map(lid => getTasks({ entityType: 'lead', entityId: lid, orgId }))),
        ])
        if (!active) return
        // Consultations — own + linked leads (dedupe)
        setConsultations([...(ownCons || []), ...leadConsList.flat()]
          .reduce((acc, c) => acc.some(x => x.id === c.id) ? acc : [...acc, c], [])
          .sort((a, b) => new Date(b.consulted_at) - new Date(a.consulted_at)))
        // Appointments — anything tied to this entity OR any linked lead
        setAppointments((appts || []).filter(a => allIds.has(a.patient_id) || allIds.has(a.lead_id)))
        setActivities([...(ownActs || []), ...leadActsList.flat()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
        setTasks([...(ownTasks || []), ...leadTasksList.flat()].reduce((acc, t) => acc.some(x => x.id === t.id) ? acc : [...acc, t], []))
      } catch { /* ignore */ }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [orgId, id])

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!taskForm.title.trim() || !entity) return
    setSavingTask(true)
    try {
      const t = await createTask({ ...taskForm, organization_id: orgId, entity_type: entity.type, entity_id: id, status: 'Pending' })
      setTasks(prev => [t, ...prev]); setTaskForm({ title: '', priority: 'Medium', due_date: '' }); setAddingTask(false)
    } catch (err) { alert(err.message) } finally { setSavingTask(false) }
  }
  const handleToggleTask = async (task) => {
    try { const u = await updateTask(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' }); setTasks(prev => prev.map(t => t.id === task.id ? u : t)) }
    catch (err) { alert(err.message) }
  }
  const handleBookAppt = async (e) => {
    e.preventDefault()
    if (!apptForm.date || !entity) return
    setSavingAppt(true)
    try {
      const scheduledAt = new Date(`${apptForm.date}T${apptForm.time || '10:00'}:00`)
      const appt = await createAppointment({
        organization_id: orgId,
        patient_id: entity.type === 'patient' ? id : null,
        lead_id: entity.type === 'lead' ? id : null,
        doctor_id: apptForm.doctor_id || null, scheduled_at: scheduledAt.toISOString(), notes: apptForm.notes || null, status: 'booked',
      })
      setAppointments(prev => [appt, ...prev]); setApptForm({ date: '', time: '10:00', doctor_id: '', notes: '' }); setAddingAppt(false)
    } catch (err) { alert(err.message) } finally { setSavingAppt(false) }
  }
  const handleApptStatus = async (aid, status) => {
    try { const u = await updateAppointment(aid, { status }); setAppointments(prev => prev.map(a => a.id === aid ? { ...a, status: u.status } : a)) }
    catch (err) { alert(err.message) }
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Spinner size={32} /></div>
  if (!entity) return <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Not found</div>

  const d = entity.data
  const isPatient = entity.type === 'patient'
  const name = isPatient
    ? `${d.first_name} ${d.last_name || ''}`.trim()
    : ([d.first_name, d.last_name].filter(Boolean).join(' ') || d.title)
  const phone = d.phone || d.contacts?.phone || null
  const email = d.email || d.contacts?.email || null
  const detail = isPatient ? (d.status || 'Active') : (d.stage || 'New')
  const stages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s, color: '#6366f1' } : s)
  const detailColor = isPatient ? (detail === 'Active' ? '#15803d' : '#b91c1c') : (stages.find(s => s.name === detail)?.color || '#6366f1')
  const history = isPatient && Array.isArray(d.medical_history) ? d.medical_history : []

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center justify-between" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/consultation" className="flex items-center gap-1.5 text-sm hover:opacity-60 transition-opacity shrink-0" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} /> Consultations
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{name}</span>
        </div>
        <Link href="/consultation/new"><Button size="sm"><Plus size={14} /> Log Consultation</Button></Link>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5 items-start">

          {/* LEFT */}
          <div className="space-y-5 min-w-0">
            {/* Profile */}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={name} size="lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-700" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full" style={isPatient ? { background: '#dcfce7', color: '#15803d' } : { background: '#dbeafe', color: '#1d4ed8' }}>
                      {isPatient ? <UserRound size={10} /> : <TrendingUp size={10} />}{isPatient ? 'Patient' : 'Lead'}
                    </span>
                    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: detailColor + '20', color: detailColor }}>{detail}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                    {phone && <span className="flex items-center gap-1"><Phone size={12} />{phone}</span>}
                    {email && <span className="flex items-center gap-1"><Mail size={12} />{email}</span>}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Link href={isPatient ? `/patients/${id}` : `/leads/${id}`} title="Edit profile"
                    className="p-1.5 rounded-lg transition-colors hover:bg-(--color-brand-50)" style={{ color: 'var(--color-text-muted)' }}>
                    <Edit2 size={13} />
                  </Link>
                  <Link href={isPatient ? `/patients/${id}` : `/leads/${id}`} className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>View full profile →</Link>
                </div>
              </div>
            </Card>

            {/* Consultations */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  <Stethoscope size={13} /> Consultations ({consultations.length})
                </p>
                <Link href="/consultation/new"><Button size="sm" type="button"><Plus size={14} /> New</Button></Link>
              </div>
              {consultations.length === 0 ? (
                <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
                  <Stethoscope size={26} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No consultations logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-150 overflow-y-auto pr-1">
                  {consultations.map(c => <ConsultationRecord key={c.id} c={c} doctors={doctors} />)}
                </div>
              )}
            </Card>

            {/* Medical History (patients) */}
            {isPatient && (
              <Card className="p-5">
                <p className="text-[10px] font-700 uppercase tracking-widest flex items-center gap-1.5 mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  <History size={13} /> Medical History
                </p>
                {history.length === 0 ? (
                  <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
                    <History size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No medical records yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-150 overflow-y-auto pr-1">
                    {history.map((rec, i) => (
                      <div key={i} className="p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                        <p className="text-[10px] font-600 uppercase mb-0.5" style={{ color: 'var(--color-brand)' }}>{rec.date ? format(new Date(rec.date), 'MMM d, yyyy') : '—'}</p>
                        <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{rec.diagnosis}</p>
                        {rec.treatment && <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{rec.treatment}</p>}
                        {rec.notes && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{rec.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-5">
            {/* Tasks / Timeline */}
            <Card className="border-(--color-border) overflow-hidden">
              <div className="flex items-center justify-between border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex">
                  {[{ id: 'tasks', label: 'Tasks', icon: CheckSquare }, { id: 'timeline', label: 'Timeline', icon: Clock }].map(tab => (
                    <button key={tab.id} type="button" onClick={() => setRightTab(tab.id)}
                      className={clsx('flex items-center gap-2 px-4 py-3 text-xs font-600 border-b-2', rightTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent')}
                      style={rightTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}>
                      <tab.icon size={14} />{tab.label}
                    </button>
                  ))}
                </div>
                {rightTab === 'tasks' && !addingTask && (
                  <Button size="sm" className="mr-3 shrink-0" type="button" onClick={() => setAddingTask(true)}><Plus size={14} /> New Task</Button>
                )}
              </div>
              <div className="p-4">
                {rightTab === 'tasks' ? (
                  <div className="space-y-3">
                    {addingTask && (
                      <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-(--color-border) space-y-2.5" style={{ background: 'var(--color-surface-2)' }}>
                        <Input label="Task *" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required />
                        <div className="grid grid-cols-2 gap-2">
                          <Select label="Priority" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} options={['Low','Medium','High','Urgent'].map(p => ({ value: p, label: p }))} />
                          <Input label="Due" type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" type="button" onClick={() => setAddingTask(false)}>Cancel</Button>
                          <Button size="sm" type="submit" disabled={savingTask || !taskForm.title.trim()}>{savingTask ? 'Adding…' : 'Add Task'}</Button>
                        </div>
                      </form>
                    )}
                    {tasks.length === 0 && !addingTask ? (
                      <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)"><CheckSquare size={24} className="mx-auto mb-2 opacity-30" /><p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No tasks yet.</p></div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {tasks.map(task => (
                          <div key={task.id} className={clsx('flex items-start gap-2.5 p-3 rounded-xl border border-(--color-border)', task.status === 'Completed' && 'opacity-50')} style={{ background: 'var(--color-surface-2)' }}>
                            <input type="checkbox" checked={task.status === 'Completed'} onChange={() => handleToggleTask(task)} className="mt-0.5 w-4 h-4 cursor-pointer shrink-0" style={{ accentColor: 'var(--color-brand)' }} />
                            <div className="flex-1 min-w-0">
                              <p className={clsx('text-xs font-500', task.status === 'Completed' && 'line-through')} style={{ color: 'var(--color-text-primary)' }}>{task.title}</p>
                              {task.due_date && <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Clock size={10} />{format(new Date(task.due_date), 'MMM d, h:mm a')}</p>}
                            </div>
                            <span className="text-[9px] font-600 px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>{task.priority}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Timeline activities={activities} maxHeight="24rem" emptyText="No activity yet." />
                )}
              </div>
            </Card>

            {/* Appointments */}
            <Card className="border-(--color-border) overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: 'var(--color-brand)' }} />
                  <p className="text-xs font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Appointments</p>
                </div>
                {!addingAppt && <Button size="sm" type="button" onClick={() => setAddingAppt(true)}><Plus size={14} /> Book Appointment</Button>}
              </div>
              <div className="p-3 space-y-3">
                {addingAppt && (
                  <form onSubmit={handleBookAppt} className="p-3 rounded-xl border border-(--color-border) space-y-2.5" style={{ background: 'var(--color-surface-2)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-500" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
                        <input type="date" required value={apptForm.date} onChange={e => setApptForm(f => ({ ...f, date: e.target.value }))} className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-500" style={{ color: 'var(--color-text-secondary)' }}>Time</label>
                        <input type="time" value={apptForm.time} onChange={e => setApptForm(f => ({ ...f, time: e.target.value }))} className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    {doctors.length > 0 && (
                      <select value={apptForm.doctor_id} onChange={e => setApptForm(f => ({ ...f, doctor_id: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                        <option value="">— Doctor —</option>
                        {doctors.map(dd => <option key={dd.id} value={dd.id}>{dd.name}</option>)}
                      </select>
                    )}
                    <Textarea label="Notes" value={apptForm.notes} onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" type="button" onClick={() => setAddingAppt(false)}>Cancel</Button>
                      <Button size="sm" type="submit" disabled={savingAppt || !apptForm.date}>{savingAppt ? 'Booking…' : 'Book'}</Button>
                    </div>
                  </form>
                )}
                {appointments.length === 0 && !addingAppt ? (
                  <div className="-mx-3 -mb-3 py-12 text-center border-t border-(--color-border)">
                    <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No appointments booked yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 -mx-3 -mb-3 px-2 py-3 border-t border-(--color-border)">
                    {[...appointments].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)).map(appt => {
                      const ST = { booked: { bg: '#dbeafe', color: '#1d4ed8' }, confirmed: { bg: '#dcfce7', color: '#15803d' }, completed: { bg: '#f3f4f6', color: '#374151' }, cancelled: { bg: '#fee2e2', color: '#b91c1c' } }
                      const st = ST[appt.status] || ST.booked
                      const doc = appt.doctor_id ? doctors.find(x => x.id === appt.doctor_id) : null
                      const canAct = appt.status === 'booked' || appt.status === 'confirmed'
                      return (
                        <div key={appt.id} className="flex items-start gap-3 p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                            <Calendar size={15} style={{ color: 'var(--color-brand)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{format(new Date(appt.scheduled_at), 'EEE, MMM d yyyy · h:mm a')}</span>
                              <span className="text-[10px] font-600 px-2 py-0.5 rounded-full capitalize" style={{ background: st.bg, color: st.color }}>{appt.status}</span>
                            </div>
                            {doc && <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><User size={11} />{doc.name}{doc.department ? ` · ${doc.department}` : ''}</p>}
                            {appt.notes && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{appt.notes}</p>}
                            {canAct && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <button type="button" onClick={() => handleApptStatus(appt.id, 'completed')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}><Check size={11} /> Complete</button>
                                <button type="button" onClick={() => handleApptStatus(appt.id, 'cancelled')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border" style={{ borderColor: '#fecaca', color: '#b91c1c' }}><X size={11} /> Cancel</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
