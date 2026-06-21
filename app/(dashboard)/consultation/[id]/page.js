'use client'

import { useEffect, useState, use, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Stethoscope, Plus, Calendar, Clock, CheckSquare, History,
  Phone, Mail, User, UserRound, TrendingUp, ChevronDown, Check, X,
  MessageSquare, Edit2, Tag, Bell, FileText,
  List, Table2, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, PhoneCall,
} from 'lucide-react'
import { Button, Card, Spinner, Avatar, Input, Select, Textarea, Modal } from '@/components/ui'
import {
  getPatient, getLead, updatePatient, updateLead, getConsultations, createConsultation,
  getAppointments, createAppointment, updateAppointment,
  getTasks, createTask, updateTask, deleteTask,
  getPersonTimeline, createActivity,
  getFollowups, createFollowup, updateFollowup, deleteFollowup,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { logAudit, AUDIT } from '@/lib/audit'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import Timeline from '@/components/crm/Timeline'
import FollowupTable from '@/components/crm/FollowupTable'
import AppointmentList from '@/components/crm/AppointmentList'
import BookAppointmentForm from '@/components/crm/BookAppointmentForm'
import TaskList from '@/components/crm/TaskList'
import { CustomModuleCard, CustomModuleTable } from '@/components/crm/CustomModule'
import MedicalHistory from '@/components/crm/MedicalHistory'
import { format, isFuture, isToday, isPast } from 'date-fns'
import clsx from 'clsx'

const CONSULTATION_TYPES = ['Initial', 'Follow-up', 'Urgent', 'Routine', 'Teleconsultation', 'Walk-in']
const STATUSES           = ['Scheduled', 'Completed', 'Cancelled', 'No-Show']

const TYPE_STYLE = {
  'Initial':        { bg: '#dbeafe', color: '#1d4ed8' },
  'Follow-up':      { bg: '#f3e8ff', color: '#7c3aed' },
  'Urgent':         { bg: '#fee2e2', color: '#b91c1c' },
  'Routine':        { bg: '#dcfce7', color: '#15803d' },
  'Teleconsultation': { bg: '#fef9c3', color: '#a16207' },
  'Walk-in':        { bg: '#f3f4f6', color: '#374151' },
}
const C_STATUS_STYLE = {
  'Scheduled':  { bg: '#fef9c3', color: '#a16207' },
  'Completed':  { bg: '#dcfce7', color: '#15803d' },
  'Cancelled':  { bg: '#fee2e2', color: '#b91c1c' },
  'No-Show':    { bg: '#f3f4f6', color: '#6b7280' },
}

const CHANNELS = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Other']
const CHANNEL_OUTCOMES = {
  Call:     ['Connected - Interested','Connected - Not Interested','Connected - Callback Requested','Ringing - No Response','Switched Off','Busy'],
  WhatsApp: ['Replied - Interested','Replied - Not Interested','Message Sent - No Reply','Seen - No Reply'],
  Email:    ['Replied - Interested','Replied - Not Interested','Sent - No Reply','Bounced'],
  Meeting:  ['Attended - Interested','Attended - Not Interested','No Show','Rescheduled'],
  Other:    ['Updated','Waiting for Response','Closed'],
}
const CHANNEL_COLOR = {
  Call:     { color: '#15803d', bg: '#dcfce7' },
  WhatsApp: { color: '#15803d', bg: '#dcfce7' },
  Email:    { color: '#1d4ed8', bg: '#dbeafe' },
  Meeting:  { color: '#7c3aed', bg: '#f3e8ff' },
  Other:    { color: '#374151', bg: '#f3f4f6' },
}
const CHANNEL_ICON = { Call: Phone, WhatsApp: MessageSquare, Email: Mail, Meeting: Calendar, Other: Bell }

const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email']
const FOLLOWUP_STATUS_OPTIONS = {
  Call:     ['Not Connected','Switched Off','Busy','Not Reachable','Connected - Interested','Connected - Not Interested','Connected - Callback Requested','Wrong Number'],
  WhatsApp: ['Sent - No Reply','Delivered - No Reply','Seen - No Reply','Replied - Interested','Replied - Not Interested','Replied - Callback Requested','Number Not on WhatsApp'],
  Email:    ['Sent - No Reply','Opened - No Reply','Replied - Interested','Replied - Not Interested','Bounced','Unsubscribed'],
}
const FU_TYPE_COLOR = {
  Call:     { bg: '#dbeafe', color: '#1d4ed8' },
  WhatsApp: { bg: '#dcfce7', color: '#15803d' },
  Email:    { bg: '#fef9c3', color: '#a16207' },
  Other:    { bg: '#f3f4f6', color: '#374151' },
}
const FU_TYPE_ICON = { Call: Phone, WhatsApp: MessageSquare, Email: Mail, Other: Bell }
const FU_STATUS_STYLE = {
  Scheduled:   { bg: '#fef3c7', color: '#b45309' },
  Completed:   { bg: '#dcfce7', color: '#15803d' },
  Missed:      { bg: '#fee2e2', color: '#b91c1c' },
  Rescheduled: { bg: '#f3f4f6', color: '#6b7280' },
}

// ── Timeline (read-only activity feed) ────────────────────────
function TimelinePanel({ activities }) {
  return <Timeline activities={activities} maxHeight="22rem" emptyText="No activity yet." />
}

// ── Main page ─────────────────────────────────────────────────
export default function ConsultationDetailPage({ params }) {
  const { id } = use(params)
  const { orgId, org } = useOrg()
  const doctors = org?.settings?.doctors || []

  const [loading, setLoading]       = useState(true)
  const [entity, setEntity]         = useState(null)
  const [consultations, setConsultations] = useState([])
  const [appointments, setAppointments]   = useState([])
  const [tasks, setTasks]           = useState([])
  const [activities, setActivities] = useState([])
  const [followups, setFollowups]   = useState([])

  // right tab
  const [rightTab, setRightTab]     = useState('tasks')

  // modals / inline forms
  const [addingTask, setAddingTask] = useState(false)
  const [taskForm, setTaskForm]     = useState({ title: '', priority: 'Medium', due_date: '' })
  const [savingTask, setSavingTask] = useState(false)
  const [addingAppt, setAddingAppt] = useState(false)
  const [savingAppt, setSavingAppt] = useState(false)

  const [fuSort, setFuSort] = useState('scheduled_desc') // 'scheduled_desc' | 'scheduled_asc'

  // Notes
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes,  setSavingNotes]  = useState(false)
  const [notesText,    setNotesText]    = useState('')

  useEffect(() => {
    if (!orgId || !id) return
    let active = true
    setLoading(true)
    ;(async () => {
      try {
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
        const allIds  = new Set([id, ...leadIds])
        const [ownCons, appts, mergedActs, ownTasks, ownFups, leadConsList, leadTasksList, leadFupsList] = await Promise.all([
          getConsultations(ent.type === 'patient' ? { orgId, patientId: id } : { orgId, leadId: id }),
          getAppointments({ orgId }),
          // Unified person timeline — shared identically with the Lead and Patient pages.
          getPersonTimeline(ent.type === 'patient' ? { patientId: id, leadIds, orgId } : { leadIds: [id], orgId }),
          getTasks({ entityType: ent.type, entityId: id, orgId }),
          getFollowups(ent.type === 'patient' ? { orgId, patientId: id } : { orgId, leadId: id }),
          Promise.all(leadIds.map(lid => getConsultations({ orgId, leadId: lid }))),
          Promise.all(leadIds.map(lid => getTasks({ entityType: 'lead', entityId: lid, orgId }))),
          Promise.all(leadIds.map(lid => getFollowups({ orgId, leadId: lid }))),
        ])
        if (!active) return

        setConsultations([...(ownCons || []), ...leadConsList.flat()]
          .reduce((acc, c) => acc.some(x => x.id === c.id) ? acc : [...acc, c], [])
          .sort((a, b) => new Date(b.consulted_at) - new Date(a.consulted_at)))
        setAppointments((appts || []).filter(a => allIds.has(a.patient_id) || allIds.has(a.lead_id)))
        setActivities(mergedActs)
        setTasks([...(ownTasks || []), ...leadTasksList.flat()].reduce((acc, t) => acc.some(x => x.id === t.id) ? acc : [...acc, t], []))
        setFollowups([...(ownFups || []), ...leadFupsList.flat()]
          .reduce((acc, f) => acc.some(x => x.id === f.id) ? acc : [...acc, f], [])
          .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)))

        // Seed notes text after entity resolves
        if (ent.type === 'lead') {
          setNotesText(l?.description || '')
        } else {
          const linkedDesc = (p?.leads || [])[0]?.description
          setNotesText(linkedDesc ?? p?.custom_data?.notes ?? '')
        }
      } catch { /* ignore */ }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [orgId, id])

  useEffect(() => {
    if (id && orgId) logAudit({ action: AUDIT.CONSULTATION_VIEW, entityType: 'patient', entityId: id, description: 'Viewed consultation record' })
  }, [id, orgId]) // eslint-disable-line

  // Logs an activity for an action taken on this page and prepends it to the
  // timeline so it shows immediately — tagged [Consultation Page].
  const addActivity = async (type, content) => {
    if (!orgId || !entity) return
    try {
      const row = await createActivity({ organization_id: orgId, entity_type: entity.type, entity_id: id, type, content, source_page: 'consultation' })
      setActivities(prev => [row, ...prev])
    } catch { /* non-blocking */ }
  }

  const handleAddTask = async e => {
    e.preventDefault()
    if (!taskForm.title.trim() || !entity) return
    setSavingTask(true)
    try {
      const t = await createTask({ ...taskForm, organization_id: orgId, entity_type: entity.type, entity_id: id, status: 'Pending' })
      setTasks(prev => [t, ...prev]); setTaskForm({ title: '', priority: 'Medium', due_date: '' }); setAddingTask(false)
      await addActivity('note', `Task added: ${t.title}`)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) } finally { setSavingTask(false) }
  }
  const handleToggleTask = async task => {
    try {
      const u = await updateTask(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })
      setTasks(prev => prev.map(t => t.id === task.id ? u : t))
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }
  const handleDeleteTask = async task => {
    const ok = await showConfirm({ title: 'Delete this task?', confirmLabel: 'Delete' })
    if (!ok) return
    try {
      await deleteTask(task.id)
      setTasks(prev => prev.filter(t => t.id !== task.id))
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }
  const handleBookAppt = async (data) => {
    if (!data.scheduled_at || !entity) return
    setSavingAppt(true)
    try {
      const scheduledAt = new Date(data.scheduled_at)
      const appt = await createAppointment({
        organization_id: orgId,
        patient_id: entity.type === 'patient' ? id : null,
        lead_id:    entity.type === 'lead'    ? id : null,
        doctor_id: data.doctor_id,
        scheduled_at: data.scheduled_at,
        notes: data.notes,
        status: 'booked',
        consultation_fee: data.consultation_fee,
        consultation_fee_status: data.consultation_fee_status,
        payment_mode: data.payment_mode,
      })
      setAppointments(prev => [appt, ...prev]); setAddingAppt(false)
      await addActivity('meeting', `Appointment booked for ${format(scheduledAt, 'MMM d, yyyy')}`)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) } finally { setSavingAppt(false) }
  }
  const handleApptStatus = async (aid, status) => {
    try {
      const u = await updateAppointment(aid, { status })
      setAppointments(prev => prev.map(a => a.id === aid ? { ...a, ...u } : a))
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }
  const handleApptPayment = async (aid, patch) => {
    try {
      const u = await updateAppointment(aid, patch)
      setAppointments(prev => prev.map(a => a.id === aid ? { ...a, ...u } : a))
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }
  const handleApptReschedule = async (aid, iso) => {
    try {
      const u = await updateAppointment(aid, { scheduled_at: iso })
      setAppointments(prev => prev.map(a => a.id === aid ? { ...a, ...u } : a))
      await addActivity('meeting', `Appointment rescheduled to ${format(new Date(iso), 'MMM d, yyyy')}`)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  // Add Follow-up inserts a blank row; values are filled inline in the table.
  const handleAddBlankFollowup = async () => {
    if (!orgId || !entity) return
    try {
      const f = await createFollowup({
        type: 'Call', scheduled_at: new Date().toISOString(),
        notes: null, outcome: null, caller_name: null, status: 'Scheduled',
        organization_id: orgId,
        lead_id:    entity.type === 'lead'    ? id : null,
        patient_id: entity.type === 'patient' ? id : null,
      })
      setFollowups(prev => [f, ...prev])
      await addActivity('note', 'Follow-up added')
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const handleDeleteFollowup = async (fuId) => {
    const ok = await showConfirm({ title: 'Delete this follow-up?', confirmLabel: 'Delete' })
    if (!ok) return
    const prev = followups
    setFollowups(list => list.filter(f => f.id !== fuId))
    try { await deleteFollowup(fuId) }
    catch (err) { setFollowups(prev); toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const handleFollowupField = async (fuId, patch) => {
    const prev = followups.find(f => f.id === fuId)
    setFollowups(list => list.map(f => f.id === fuId ? { ...f, ...patch } : f))
    try {
      const updated = await updateFollowup(fuId, patch)
      setFollowups(list => list.map(f => f.id === fuId ? updated : f))
    } catch (err) {
      setFollowups(list => list.map(f => f.id === fuId ? prev : f))
      toast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleSaveNotes = async () => {
    if (!entity) return
    setSavingNotes(true)
    try {
      if (entity.type === 'lead') {
        await updateLead(id, { description: notesText })
        setEntity(prev => ({ ...prev, data: { ...prev.data, description: notesText } }))
      } else {
        const linkedLead = (entity.data.leads || [])[0]
        if (linkedLead) {
          await updateLead(linkedLead.id, { description: notesText })
          setEntity(prev => ({
            ...prev,
            data: {
              ...prev.data,
              leads: prev.data.leads.map(l => l.id === linkedLead.id ? { ...l, description: notesText } : l),
            },
          }))
        } else {
          const updated = await updatePatient(id, { custom_data: { ...(entity.data.custom_data || {}), notes: notesText } })
          setEntity(prev => ({ ...prev, data: { ...prev.data, custom_data: updated.custom_data } }))
        }
      }
      setEditingNotes(false)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSavingNotes(false) }
  }

  const handleCreateFollowupInline = async (patch) => {
    if (!orgId) return
    try {
      const scheduled_at = patch.scheduled_at || new Date().toISOString()
      const isFut = new Date(scheduled_at).getTime() > Date.now()
      const f = await createFollowup({
        type: patch.type || 'Call',
        scheduled_at,
        notes: patch.notes ?? null,
        outcome: patch.outcome ?? null,
        caller_name: patch.caller_name ?? null,
        status: patch.status || (isFut ? 'Scheduled' : 'Completed'),
        organization_id: orgId,
        lead_id:    entity.type === 'lead'    ? id : null,
        patient_id: entity.type === 'patient' ? id : null,
      })
      setFollowups(prev => [f, ...prev])
      await addActivity('note', `${f.type} logged${f.outcome ? `: ${f.outcome}` : ''}`)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Spinner size={32} /></div>
  if (!entity)  return <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Not found</div>

  const d = entity.data
  const isPatient = entity.type === 'patient'
  const name   = isPatient ? `${d.first_name} ${d.last_name || ''}`.trim() : ([d.first_name, d.last_name].filter(Boolean).join(' ') || d.title)
  const phone  = d.phone || d.contacts?.phone || null
  const email  = d.email || d.contacts?.email || null
  const detail = isPatient ? (d.status || 'Active') : (d.stage || 'New')
  const stages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s, color: '#6366f1' } : s)
  const detailColor = isPatient ? (detail === 'Active' ? '#15803d' : '#b91c1c') : (stages.find(s => s.name === detail)?.color || '#6366f1')
  const history = isPatient && Array.isArray(d.medical_history) ? d.medical_history : []

  const RIGHT_TABS = [
    { id: 'tasks',    label: 'Tasks',    icon: CheckSquare, count: tasks.filter(t => t.status !== 'Completed').length },
    { id: 'timeline', label: 'Timeline', icon: Clock,       count: null },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-3.5 border-b border-(--color-border) flex items-center justify-between" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/consultation" className="flex items-center gap-1 text-sm hover:opacity-60 transition-opacity shrink-0" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={15} /> Consultations
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{name}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5 items-start">

          {/* ── LEFT ── */}
          <div className="space-y-4 min-w-0">

            {/* Profile */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={name} size="lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-700" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full"
                      style={isPatient ? { background: '#dcfce7', color: '#15803d' } : { background: '#dbeafe', color: '#1d4ed8' }}>
                      {isPatient ? <UserRound size={10} /> : <TrendingUp size={10} />}{isPatient ? 'Patient' : 'Lead'}
                    </span>
                    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: detailColor + '20', color: detailColor }}>{detail}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                    {phone && <span className="flex items-center gap-1"><Phone size={12} />{phone}</span>}
                    {email && <span className="flex items-center gap-1"><Mail size={12} />{email}</span>}
                  </div>
                </div>
                <Link href={isPatient ? `/patients/${id}` : `/leads/${id}`}
                  className="ml-auto text-xs font-600 shrink-0 hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-brand)' }}>View full profile →</Link>
              </div>
            </Card>

            {/* Follow-ups */}
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <p className="text-xs font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}><PhoneCall size={13} /> Follow-ups</p>
                <Button size="sm" onClick={handleAddBlankFollowup}><Plus size={14} /> Add Follow-up</Button>
              </div>
              <div className="p-3 space-y-3">
                {followups.length === 0 ? (
                  <div className="-mx-3 -mb-3 py-16 text-center border-t border-(--color-border)">
                    <PhoneCall size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No follow-ups yet. Click “Add Follow-up” to add a row.</p>
                  </div>
                ) : (
                  <div className="-mx-3 -mb-3 max-h-150 overflow-y-auto">
                    <FollowupTable
                      followups={followups}
                      staff={org?.settings?.staff_members || []}
                      onField={handleFollowupField}
                      onCreate={handleCreateFollowupInline}
                      onDelete={handleDeleteFollowup}
                      statusStyle={FU_STATUS_STYLE}
                      typeStyle={FU_TYPE_COLOR}
                      types={FOLLOWUP_TYPES}
                      outcomeOptions={(t) => FOLLOWUP_STATUS_OPTIONS[t] || []}
                      sort={fuSort}
                      onSortToggle={() => setFuSort(s => s === 'scheduled_desc' ? 'scheduled_asc' : 'scheduled_desc')}
                      showDraftRow={false}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Appointments */}
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <p className="text-xs font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  <Calendar size={13} style={{ color: 'var(--color-brand)' }} /> Appointments <span style={{ color: 'var(--color-text-primary)' }}>({appointments.length})</span>
                </p>
                {!addingAppt && <Button size="sm" type="button" onClick={() => setAddingAppt(true)}><Plus size={14} /> Book</Button>}
              </div>
              <div className="p-3 space-y-3">
                {addingAppt && (
                  <BookAppointmentForm
                    doctors={doctors}
                    saving={savingAppt}
                    onCancel={() => setAddingAppt(false)}
                    onSubmit={handleBookAppt}
                  />
                )}

                {appointments.length === 0 && !addingAppt ? (
                  <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
                    <Calendar size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No appointments yet.</p>
                  </div>
                ) : (
                  <AppointmentList
                    appointments={appointments}
                    doctors={doctors}
                    onStatusChange={handleApptStatus}
                    onPaymentUpdate={handleApptPayment}
                    onReschedule={handleApptReschedule}
                  />
                )}
              </div>
            </Card>

            {/* Custom modules — consultations page */}
            {(org?.settings?.modules || []).filter(m => m.page === 'consultations' && m.active).map(m => {
              const moduleData = entity.data?.custom_data?.[m.id] || {}
              const handleModuleSave = async (values) => {
                const custom_data = { ...(entity.data?.custom_data || {}), [m.id]: values }
                if (entity.type === 'patient') {
                  const updated = await updatePatient(id, { custom_data })
                  setEntity(prev => ({ ...prev, data: { ...prev.data, custom_data: updated.custom_data } }))
                } else {
                  const updated = await updateLead(id, { custom_data })
                  setEntity(prev => ({ ...prev, data: { ...prev.data, custom_data: updated.custom_data } }))
                }
              }
              return m.view === 'table'
                ? <CustomModuleTable key={m.id} module={m} data={moduleData} onSave={handleModuleSave} />
                : <CustomModuleCard  key={m.id} module={m} data={moduleData} onSave={handleModuleSave} />
            })}

            {/* Notes */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  <FileText size={13} /> Notes
                </p>
                {!editingNotes && (
                  <Button size="sm" onClick={() => setEditingNotes(true)}>
                    <Edit2 size={13} /> Edit
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    rows={5}
                    value={notesText}
                    onChange={e => setNotesText(e.target.value)}
                    placeholder="Add notes about this consultation…"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditingNotes(false)}>Cancel</Button>
                    <Button size="sm" disabled={savingNotes} onClick={handleSaveNotes}>
                      {savingNotes ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : notesText ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{notesText}</p>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No notes yet. Click Edit to add notes.</p>
              )}
            </Card>

            {/* Medical History — same shared component, synced to the patient/lead record */}
            <MedicalHistory
              record={entity.data}
              onPersist={async (custom_data) => {
                const updated = entity.type === 'patient'
                  ? await updatePatient(id, { custom_data })
                  : await updateLead(id, { custom_data })
                setEntity(prev => ({ ...prev, data: { ...prev.data, custom_data: updated.custom_data } }))
              }}
            />
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-4 sticky top-16">
            <Card className="border-(--color-border) overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center justify-between border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex">
                  {RIGHT_TABS.map(tab => (
                    <button key={tab.id} type="button" onClick={() => setRightTab(tab.id)}
                      className={clsx('flex items-center gap-1.5 px-4 py-3 text-xs font-600 border-b-2 transition-colors',
                        rightTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent hover:bg-(--color-brand-50)')}
                      style={rightTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}>
                      <tab.icon size={13} />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full"
                          style={rightTab === tab.id
                            ? { background: 'var(--color-brand)', color: 'white' }
                            : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {rightTab === 'tasks' && !addingTask && (
                  <Button size="sm" type="button" className="mr-3 shrink-0" onClick={() => setAddingTask(true)}><Plus size={14} /> New Task</Button>
                )}
              </div>

              <div className="p-3">
                {/* Tasks */}
                {rightTab === 'tasks' && (
                  <div className="space-y-3">
                    {addingTask && (
                      <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-(--color-border) space-y-2.5" style={{ background: 'var(--color-surface-2)' }}>
                        <Input label="Task *" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required />
                        <div className="grid grid-cols-2 gap-2">
                          <Select label="Priority" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                            options={['Low','Medium','High','Urgent'].map(p => ({ value: p, label: p }))} />
                          <Input label="Due" type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" type="button" onClick={() => setAddingTask(false)}>Cancel</Button>
                          <Button size="sm" type="submit" disabled={savingTask || !taskForm.title.trim()}>{savingTask ? 'Adding…' : 'Add Task'}</Button>
                        </div>
                      </form>
                    )}
                    <div className="max-h-96 overflow-y-auto pr-1">
                      <TaskList tasks={tasks} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {rightTab === 'timeline' && (
                  <TimelinePanel activities={activities} />
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>

    </div>
  )
}
