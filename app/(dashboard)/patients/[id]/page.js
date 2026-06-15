'use client'
import { useEffect, useState, use, useRef } from 'react'
import {
  ArrowLeft, Edit2, Trash2, Phone, Mail, MapPin, Calendar,
  Clock, Activity, FileText, History, Plus, Save, User, X,
  CheckSquare, Bell, MessageSquare, Check, RotateCcw, PhoneCall, ChevronLeft, ChevronRight, ChevronDown, Tag,
  List, Table2, ArrowUpDown, ArrowUp, ArrowDown, Search,
} from 'lucide-react'
import { Button, Card, Input, Textarea, Spinner, Select } from '@/components/ui'
import {
  getPatient, updatePatient, deletePatient, updateLead,
  getPersonTimeline, createActivity,
  getTasks, createTask, updateTask,
  getFollowups, createFollowup, updateFollowup, deleteFollowup,
  getTags, assignTagToPatient, removeTagFromPatient,
  getAppointments, createAppointment, updateAppointment,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Timeline from '@/components/crm/Timeline'
import { CustomModuleCard, CustomModuleTable } from '@/components/crm/CustomModule'
import FollowupTable from '@/components/crm/FollowupTable'
import VisitsTable from '@/components/crm/VisitsTable'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import { logAudit, AUDIT } from '@/lib/audit'
import { matchingRules, ruleActions } from '@/lib/rulesEngine'
import { format, formatDistanceToNow, differenceInYears, isPast, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isSameMonth, addDays } from 'date-fns'
import clsx from 'clsx'

const STATUS_STYLE = {
  Active: { bg: '#dcfce7', color: '#15803d' },
  Inactive: { bg: '#fee2e2', color: '#b91c1c' },
}

const GENDERS      = ['Male', 'Female', 'Other']
const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

// Timeline icon per activity type
const ACTIVITY_ICON = {
  comment:       MessageSquare,
  call:          Phone,
  email:         Mail,
  meeting:       Calendar,
  note:          Edit2,
  status_change: Tag,
  whatsapp:      MessageSquare,
}

const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email']
const FOLLOWUP_STATUS_OPTIONS = {
  Call: ['Not Connected', 'Switched Off', 'Busy', 'Not Reachable', 'Connected - Interested', 'Connected - Not Interested', 'Connected - Callback Requested', 'Wrong Number'],
  WhatsApp: ['Sent - No Reply', 'Delivered - No Reply', 'Seen - No Reply', 'Replied - Interested', 'Replied - Not Interested', 'Replied - Callback Requested', 'Number Not on WhatsApp'],
  Email: ['Sent - No Reply', 'Bounced', 'Opened - No Reply', 'Replied - Interested', 'Replied - Not Interested', 'Replied - Callback Requested'],
}

const TYPE_ICON = { Call: Phone, WhatsApp: MessageSquare, Email: Mail, Other: Bell }
const TYPE_COLOR = {
  Call: { bg: '#dbeafe', color: '#1d4ed8' },
  WhatsApp: { bg: '#dcfce7', color: '#15803d' },
  Email: { bg: '#fce7f3', color: '#be185d' },
  Other: { bg: '#f3f4f6', color: '#374151' },
}
const FU_STATUS_STYLE = {
  Scheduled: { bg: '#fef3c7', color: '#b45309' },
  Completed: { bg: '#dcfce7', color: '#15803d' },
  Missed: { bg: '#fee2e2', color: '#b91c1c' },
  Rescheduled: { bg: '#f3e8ff', color: '#7c3aed' },
}

export default function PatientDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const { orgId, org, hasPermission } = useOrg()
  const [patient, setPatient] = useState(null)
  const [activities, setActivities] = useState([])
  const [tasks, setTasks] = useState([])
  const [followups, setFollowups] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [addingTag, setAddingTag] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const tagBtnRef = useRef(null)
  const [tagMenuPos, setTagMenuPos] = useState({ top: 0, left: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tasks')
  const [bottomTab, setBottomTab] = useState('history')
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileDraft, setProfileDraft] = useState({})
  const [profileSaving, setProfileSaving] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', due_date: '' })
  const [addingRecord, setAddingRecord] = useState(false)
  const [medEntry, setMedEntry] = useState({ diagnosis: '', treatment: '', notes: '' })
  const [savingRecord, setSavingRecord] = useState(false)
  const [fuSort, setFuSort] = useState('scheduled_desc') // 'scheduled_desc' | 'scheduled_asc'
  const [assigningPatient, setAssigningPatient] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [addingAppt, setAddingAppt] = useState(false)
  const [apptForm, setApptForm] = useState({ date: '', time: '10:00', doctor_id: '', notes: '' })
  const [savingAppt, setSavingAppt] = useState(false)
  const [visitSort, setVisitSort] = useState('desc') // 'desc' | 'asc' by visit date
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  const doctors  = org?.settings?.doctors  || []
  const services = org?.settings?.services || []
  const packages = org?.settings?.packages || []

  // Pricing helpers — services/packages/doctor fees come from Settings (org config).
  const servicePrice = (sid) => { const s = services.find(x => x.id === sid); return s && s.price != null ? Number(s.price) : 0 }
  const packagePrice = (pid) => {
    const p = packages.find(x => x.id === pid); if (!p) return 0
    const items = (p.items || []).map(i => services.find(s => s.id === i)).filter(Boolean)
    const auto = items.reduce((sum, s) => sum + (s.price != null ? Number(s.price) : 0), 0)
    return p.customPriceEnabled && p.price != null && p.price !== '' ? Number(p.price) : auto
  }
  const doctorFee = (did) => { const d = doctors.find(x => x.id === did); return d && d.fee != null ? Number(d.fee) : 0 }
  const computeVisitTotal = (v) =>
    (v.service_ids || []).reduce((s, id) => s + servicePrice(id), 0)
    + (v.package_id ? packagePrice(v.package_id) : 0)
    + (v.doctor_id ? doctorFee(v.doctor_id) : 0)
    + (v.misc_cost ? Number(v.misc_cost) : 0)

  const logActivity = (type, content, entityType = 'patient', entityId = id) => orgId && createActivity({ organization_id: orgId, entity_type: entityType, entity_id: entityId, type, content, source_page: 'patient' })

  const loadAll = async () => {
    setLoading(true)
    try {
      const p = await getPatient(id)
      const leadIds = (p?.leads || []).map(l => l.id)
      const allIds = new Set([id, ...leadIds])
      const [mergedActs, patientTasks, patientFollowups, leadTasksList, leadFollowupsList, allAppts] = await Promise.all([
        // Unified person timeline — the full journey from first enquiry, shared
        // identically with the Lead and Consultation pages.
        getPersonTimeline({ patientId: id, leadIds, orgId }),
        getTasks({ entityType: 'patient', entityId: id, orgId }),
        getFollowups({ patientId: id, orgId }),
        Promise.all(leadIds.map(leadId => getTasks({ entityType: 'lead', entityId: leadId, orgId }))),
        Promise.all(leadIds.map(leadId => getFollowups({ leadId, orgId }))),
        getAppointments({ orgId }),
      ])

      const mergedTasks = [...(patientTasks || []), ...leadTasksList.flat()].reduce((acc, t) => (acc.some(x => x.id === t.id) ? acc : [...acc, t]), [])
      const mergedFollowups = [...(patientFollowups || []), ...leadFollowupsList.flat()].reduce((acc, f) => (acc.some(x => x.id === f.id) ? acc : [...acc, f]), [])
      const mergedAppts = (allAppts || []).filter(a => allIds.has(a.patient_id) || allIds.has(a.lead_id))
      const tags = await getTags(orgId, 'patients')

      setPatient(p)
      setActivities(mergedActs)
      setTasks(mergedTasks)
      setFollowups(mergedFollowups)
      setAppointments(mergedAppts)
      setAvailableTags(tags || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  // Audit: record that this patient record was viewed (once per patient).
  useEffect(() => {
    if (id && orgId) logAudit({ action: AUDIT.PATIENT_VIEW, entityType: 'patient', entityId: id, description: 'Viewed patient record' })
  }, [id, orgId])

  const handleDelete = async () => {
    const ok = await showConfirm({ title: 'Delete this patient?', message: 'This cannot be undone.', confirmLabel: 'Delete patient' })
    if (!ok) return
    await deletePatient(id)
    router.push('/patients')
  }

  const openProfileEdit = () => {
    setProfileDraft({
      first_name:    patient.first_name    || '',
      last_name:     patient.last_name     || '',
      phone:         patient.phone         || '',
      email:         patient.email         || '',
      gender:        patient.gender        || '',
      date_of_birth: patient.date_of_birth || '',
      blood_group:   patient.custom_data?.blood_group || '',
      address:       patient.address       || '',
      status:        patient.status        || 'Active',
    })
    setProfileEditing(true)
  }

  const handleProfileSave = async () => {
    setProfileSaving(true)
    try {
      const before = patient
      const patch = {
        first_name:    profileDraft.first_name?.trim() || patient.first_name,
        last_name:     profileDraft.last_name?.trim()  || null,
        phone:         profileDraft.phone?.trim()      || null,
        email:         profileDraft.email?.trim()      || null,
        gender:        profileDraft.gender             || null,
        date_of_birth: profileDraft.date_of_birth      || null,
        address:       profileDraft.address?.trim()    || null,
        status:        profileDraft.status             || 'Active',
        custom_data:   { ...(patient.custom_data || {}), blood_group: profileDraft.blood_group || null },
      }
      const updated = await updatePatient(id, patch)
      setPatient(prev => ({ ...prev, ...updated }))
      await logActivity('note', 'Profile details updated')
      if (before.status !== updated.status) await logActivity('status_change', `Status changed to ${updated.status}`)
      logAudit({ action: AUDIT.PATIENT_EDIT, entityType: 'patient', entityId: id, entityName: fullName, description: 'Patient profile updated' })
      setProfileEditing(false)
      if (before.status !== updated.status) await applyRules('status_changed')
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setProfileSaving(false) }
  }
  const handleTaskToggle = async (task) => { const status = task.status === 'Completed' ? 'Pending' : 'Completed'; const updated = await updateTask(task.id, { status }); setTasks(prev => prev.map(t => t.id === task.id ? updated : t)); if (status === 'Completed') await applyRules('task_completed') }
  const handleCreateTask = async (e) => { e.preventDefault(); if (!newTask.title.trim() || !orgId) return; const t = await createTask({ ...newTask, organization_id: orgId, entity_type: 'patient', entity_id: id }); setTasks(prev => [t, ...prev]); await logActivity('note', `Task added: ${newTask.title}`); logAudit({ action: AUDIT.TASK_CREATE, entityType: 'patient', entityId: id, entityName: fullName, description: `Task created: "${t.title}"`, metadata: { task_id: t.id, priority: t.priority, due_date: t.due_date } }); setTaskOpen(false); setNewTask({ title: '', priority: 'Medium', due_date: '' }); toast({ type: 'task', title: 'Task Added', message: `${fullName}: ${t.title}` }); await applyRules('task_added') }

  const handleAddRecord = async (e) => {
    e.preventDefault()
    if (!medEntry.diagnosis.trim()) return
    setSavingRecord(true)
    try {
      const newHistory = [{ ...medEntry, date: new Date().toISOString() }, ...(patient.medical_history || [])]
      await updatePatient(id, { medical_history: newHistory })
      await logActivity('note', `Medical record added: ${medEntry.diagnosis}`)
      await loadAll(); setAddingRecord(false); setMedEntry({ diagnosis: '', treatment: '', notes: '' })
      await applyRules('medical_record_added')
    } catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) } finally { setSavingRecord(false) }
  }

  // Add Follow-up inserts a blank row; values are filled inline in the table.
  const handleAddBlankFollowup = async () => {
    if (!orgId) return
    try {
      const f = await createFollowup({
        type: 'Call', scheduled_at: new Date().toISOString(),
        notes: null, outcome: null, caller_name: null, status: 'Scheduled',
        organization_id: orgId, patient_id: id, lead_id: null,
      })
      setFollowups(prev => [f, ...prev])
      const row = await logActivity('note', 'Follow-up added')
      if (row) setActivities(prev => [row, ...prev])
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  // Notes are shared with the lead this patient was converted from (single source
  // of truth = linked lead's description), so they stay in sync across both pages.
  // If there's no linked lead, fall back to patient.custom_data.notes.
  const handleSaveNotes = async () => {
    setNotesSaving(true)
    try {
      const linkedLead = patient.leads?.[0] || null
      if (linkedLead) {
        const updated = await updateLead(linkedLead.id, { description: notesDraft || null })
        setPatient(prev => ({ ...prev, leads: prev.leads.map(l => l.id === linkedLead.id ? { ...l, description: updated.description } : l) }))
      } else {
        const updated = await updatePatient(id, { custom_data: { ...(patient.custom_data || {}), notes: notesDraft || null } })
        setPatient(prev => ({ ...prev, custom_data: updated.custom_data }))
      }
      const row = await logActivity('note', 'Notes updated')
      if (row) setActivities(prev => [row, ...prev])
      setNotesEditing(false)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setNotesSaving(false) }
  }

  const handleDeleteFollowup = async (fuId) => {
    const ok = await showConfirm({ title: 'Delete this follow-up?', confirmLabel: 'Delete' })
    if (!ok) return
    const prev = followups
    setFollowups(list => list.filter(f => f.id !== fuId))
    try { await deleteFollowup(fuId) }
    catch (err) { setFollowups(prev); toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  // Inline cell edit from the table view.
  const handleFollowupField = async (fuId, patch) => {
    const prev = followups.find(f => f.id === fuId)
    setFollowups(list => list.map(f => f.id === fuId ? { ...f, ...patch } : f))
    try {
      const updated = await updateFollowup(fuId, patch)
      setFollowups(list => list.map(f => f.id === fuId ? updated : f))
    } catch (err) { setFollowups(list => list.map(f => f.id === fuId ? prev : f)); toast({ type: 'error', title: 'Error', message: err.message }) }
  }
  // Inline create from the table's empty bottom row.
  const handleCreateFollowupInline = async (patch) => {
    if (!orgId) return
    try {
      const scheduled_at = patch.scheduled_at || new Date().toISOString()
      const isFuture = new Date(scheduled_at).getTime() > Date.now()
      const f = await createFollowup({
        type: patch.type || 'Call', scheduled_at, notes: patch.notes ?? null,
        outcome: patch.outcome ?? null, caller_name: patch.caller_name ?? null,
        status: patch.status || (isFuture ? 'Scheduled' : 'Completed'),
        organization_id: orgId, patient_id: id, lead_id: null,
      })
      setFollowups(prev => [f, ...prev])
      const row = await logActivity('note', `${f.type} logged${f.outcome ? `: ${f.outcome}` : ''}`)
      if (row) setActivities(prev => [row, ...prev])
      toast({ type: 'followup', title: `${f.type} logged`, message: `${fullName}${f.outcome ? ` — ${f.outcome}` : ''}` })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  // Apply configured automation rules (Settings → Rules) for a patient event.
  const applyRules = async (eventKey) => {
    if (!patient) return
    const rules = matchingRules(org?.settings?.rules || [], { target: 'patient', event: eventKey, entity: patient })
    const staff = org?.settings?.staff_members || []
    let changed = false
    const by = (rule) => rule.name ? ` by rule "${rule.name}"` : ' by rule'
    for (const rule of rules) {
      for (const act of ruleActions(rule)) {
        const { type, value } = act
        try {
          if (type === 'set_status' && value && patient.status !== value) {
            const u = await updatePatient(id, { status: value }); setPatient(p => ({ ...p, status: u.status }))
            await logActivity('status_change', `Status auto-updated to ${value}${by(rule)}`); changed = true
          } else if (type === 'add_tag' && value) {
            if (!(patient.tags || []).some(t => t.tags?.id === value)) {
              await assignTagToPatient(id, value); const u = await getPatient(id); setPatient(u)
              const tag = availableTags.find(t => t.id === value)
              await logActivity('tag', `Tag "${tag?.name || 'tag'}" added${by(rule)}`); changed = true
            }
          } else if (type === 'remove_tag' && value) {
            if ((patient.tags || []).some(t => t.tags?.id === value)) {
              await removeTagFromPatient(id, value); const u = await getPatient(id); setPatient(u)
              const tag = availableTags.find(t => t.id === value)
              await logActivity('tag', `Tag "${tag?.name || 'tag'}" removed${by(rule)}`); changed = true
            }
          } else if (type === 'assign_to' && value && patient.assigned_to !== value) {
            const u = await updatePatient(id, { assigned_to: value }); setPatient(p => ({ ...p, assigned_to: u.assigned_to }))
            const m = staff.find(s => s.id === value)
            await logActivity('note', `Assigned to ${m?.name || 'team member'}${by(rule)}`); changed = true
          } else if (type === 'add_note' && value) {
            await logActivity('note', value); changed = true
          } else if (type === 'create_task' && act.title) {
            const due = act.dueInDays ? addDays(new Date(), Number(act.dueInDays)).toISOString() : null
            const t = await createTask({ title: act.title, priority: act.priority || 'Medium', due_date: due, status: 'Pending', organization_id: orgId, entity_type: 'patient', entity_id: id })
            setTasks(p => [t, ...p]); await logActivity('note', `Task created${by(rule)}: ${act.title}`); changed = true
          } else if (type === 'schedule_followup') {
            const when = addDays(new Date(), Number(act.inDays || 0)).toISOString()
            const f = await createFollowup({ type: act.fuType || 'Call', scheduled_at: when, status: 'Scheduled', organization_id: orgId, patient_id: id, lead_id: null })
            setFollowups(p => [f, ...p]); await logActivity('note', `Follow-up scheduled${by(rule)}: ${act.fuType || 'Call'}`); changed = true
          } else if (type === 'notify') {
            toast({ type: 'default', title: act.title || `Automation: ${rule.name || 'rule'}`, message: act.message || '' })
          }
        } catch { /* ignore individual action failures */ }
      }
    }
    if (changed) await loadAll()
  }

  const handleBookAppt = async (e) => {
    e.preventDefault()
    if (!apptForm.date || !orgId) return
    setSavingAppt(true)
    try {
      const scheduledAt = new Date(`${apptForm.date}T${apptForm.time || '10:00'}:00`)
      const appt = await createAppointment({
        organization_id: orgId, patient_id: id, lead_id: null,
        doctor_id: apptForm.doctor_id || null, scheduled_at: scheduledAt.toISOString(), notes: apptForm.notes || null, status: 'booked',
      })
      setAppointments(prev => [appt, ...prev])
      await logActivity('meeting', `Appointment booked for ${format(scheduledAt, 'MMM d, yyyy')}`)
      const apptDoc = doctors.find(d => d.id === apptForm.doctor_id)
      logAudit({ action: AUDIT.APPOINTMENT_CREATE, entityType: 'patient', entityId: id, entityName: fullName, description: `Appointment booked for ${format(scheduledAt, 'MMM d, yyyy')}${apptDoc ? ` with ${apptDoc.name}` : ''}`, metadata: { scheduled_at: appt.scheduled_at, doctor: apptDoc?.name || null } })
      toast({ type: 'appointment', title: 'Appointment Booked', message: `${fullName} on ${format(scheduledAt, 'MMM d, h:mm a')}${apptDoc ? ` with ${apptDoc.name}` : ''}` })
      setApptForm({ date: '', time: '10:00', doctor_id: '', notes: '' }); setAddingAppt(false)
      await applyRules('appointment_booked')
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) } finally { setSavingAppt(false) }
  }
  const handleApptStatus = async (aid, status) => {
    try { const u = await updateAppointment(aid, { status }); setAppointments(prev => prev.map(a => a.id === aid ? { ...a, status: u.status } : a)) }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  // ── Visit details (stored on patient.custom_data.visits) ──
  // Add Visit inserts a blank row at the top; values are filled inline in the table.
  const handleAddBlankVisit = async () => {
    if (!orgId) return
    const prevVisits = patient.custom_data?.visits || []
    const record = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      service_ids: [], package_id: null, doctor_id: null,
      misc_cost: 0, total: 0, next_visit_date: null,
      created_at: new Date().toISOString(),
    }
    const visits = [record, ...prevVisits]
    setPatient(prev => ({ ...prev, custom_data: { ...(prev.custom_data || {}), visits } }))
    try {
      const updated = await updatePatient(id, { custom_data: { ...(patient.custom_data || {}), visits } })
      setPatient(prev => ({ ...prev, custom_data: updated.custom_data }))
    } catch (err) {
      setPatient(prev => ({ ...prev, custom_data: { ...(prev.custom_data || {}), visits: prevVisits } }))
      toast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleDeleteVisit = async (visitId) => {
    const ok = await showConfirm({ title: 'Delete this visit record?', confirmLabel: 'Delete' })
    if (!ok) return
    try {
      const visits = (patient.custom_data?.visits || []).filter(v => v.id !== visitId)
      const updated = await updatePatient(id, { custom_data: { ...(patient.custom_data || {}), visits } })
      setPatient(prev => ({ ...prev, custom_data: updated.custom_data }))
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  // Inline cell edit from the visits table — recompute total on every change.
  const handleVisitField = async (visitId, patch) => {
    const prevVisits = patient.custom_data?.visits || []
    const next = prevVisits.map(v => {
      if (v.id !== visitId) return v
      const merged = { ...v, ...patch }
      merged.total = computeVisitTotal(merged)
      return merged
    })
    // optimistic update
    setPatient(prev => ({ ...prev, custom_data: { ...(prev.custom_data || {}), visits: next } }))
    try {
      const updated = await updatePatient(id, { custom_data: { ...(patient.custom_data || {}), visits: next } })
      setPatient(prev => ({ ...prev, custom_data: updated.custom_data }))
    } catch (err) {
      setPatient(prev => ({ ...prev, custom_data: { ...(prev.custom_data || {}), visits: prevVisits } }))
      toast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const linkedTagIds = (patient?.tags || []).map(t => t.tags?.id).filter(Boolean)
  const unlinkedTags = availableTags.filter(t => !linkedTagIds.includes(t.id))

  const handleAddTag = async (tagId) => {
    try {
      await assignTagToPatient(id, tagId)
      const updated = await getPatient(id)
      setPatient(updated)
      setAddingTag(false)
      const tag = availableTags.find(t => t.id === tagId)
      const row = await logActivity('tag', `Tag "${tag?.name || 'tag'}" added`)
      if (row) setActivities(prev => [row, ...prev])
      logAudit({ action: AUDIT.TAG_ADD, entityType: 'patient', entityId: id, entityName: fullName, description: `Tag "${tag?.name || tagId}" added to patient` })
      await applyRules('tag_added')
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const handleRemoveTag = async (tagId) => {
    try {
      await removeTagFromPatient(id, tagId)
      const updated = await getPatient(id)
      setPatient(updated)
      const tag = availableTags.find(t => t.id === tagId)
      const row = await logActivity('tag', `Tag "${tag?.name || 'tag'}" removed`)
      if (row) setActivities(prev => [row, ...prev])
      logAudit({ action: AUDIT.TAG_REMOVE, entityType: 'patient', entityId: id, entityName: fullName, description: `Tag "${tag?.name || tagId}" removed from patient` })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const openTagMenu = () => {
    const r = tagBtnRef.current?.getBoundingClientRect()
    if (r) setTagMenuPos({ top: r.bottom + 6, left: r.left })
    setTagSearch('')
    setAddingTag(true)
  }
  // Close the tag menu on scroll (it's fixed-positioned)
  useEffect(() => {
    if (!addingTag) return
    const close = () => setAddingTag(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [addingTag])

  const handleAssignPatient = async (memberId) => {
    if (memberId === patient.assigned_to) { setAssigningPatient(false); return }
    try {
      const updated = await updatePatient(id, { assigned_to: memberId || null })
      setPatient(prev => ({ ...prev, assigned_to: updated.assigned_to }))
      const staff = org?.settings?.staff_members || []
      const member = staff.find(m => m.id === memberId)
      await logActivity('note', memberId
        ? `Patient assigned to ${member?.name || 'team member'}`
        : 'Patient unassigned')
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    setAssigningPatient(false)
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Spinner size={32} /></div>
  if (!patient) return <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Patient not found</div>

  const fullName = `${patient.first_name} ${patient.last_name || ''}`.trim()
  const age = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null
  const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase()
  const statusS = STATUS_STYLE[patient.status] || STATUS_STYLE.Active
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length
  const staffMembers = org?.settings?.staff_members || []
  const assignee = patient.assigned_to ? staffMembers.find(m => m.id === patient.assigned_to) : null

  // Visit records (edited inline in the table)
  const visits = patient.custom_data?.visits || []
  // Notes: linked lead's description (synced) or patient.custom_data.notes
  const linkedLead = patient.leads?.[0] || null
  const notesValue = linkedLead ? linkedLead.description : patient.custom_data?.notes

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center justify-between" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-3"><Link href="/patients" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}><ArrowLeft size={16} /> Patients</Link><span style={{ color: 'var(--color-border)' }}>/</span><span className="text-sm font-600 truncate max-w-xs" style={{ color: 'var(--color-text-primary)' }}>{fullName}</span></div>
        <div className="flex items-center gap-2">

          {/* Assign Patient */}
          <div className="relative">
            {assigningPatient && <div className="fixed inset-0 z-10" onClick={() => setAssigningPatient(false)} />}
            <button
              type="button"
              onClick={() => setAssigningPatient(s => !s)}
              className="relative z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-600 transition-colors hover:bg-(--color-surface-2)"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              {assignee ? (
                <>
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-700 flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                  >
                    {assignee.name[0].toUpperCase()}
                  </span>
                  <span className="max-w-24 truncate">{assignee.name}</span>
                </>
              ) : (
                <>
                  <User size={13} />
                  Assign Patient
                </>
              )}
              <ChevronDown size={12} style={{ transform: assigningPatient ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
            </button>

            {assigningPatient && (
              <div
                className="absolute top-full right-0 mt-1.5 w-52 rounded-xl border border-(--color-border) overflow-hidden z-20"
                style={{ background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              >
                <div className="px-3 py-2 border-b border-(--color-border)">
                  <p className="text-[10px] font-600 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Assign to</p>
                </div>
                {staffMembers.length === 0 ? (
                  <p className="px-3 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    No team members yet. Add them in Settings → People.
                  </p>
                ) : (
                  <>
                    {staffMembers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleAssignPatient(m.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-500 text-left transition-colors hover:bg-(--color-surface-2)"
                      >
                        <span
                          className="w-6 h-6 rounded-full text-[10px] font-700 flex items-center justify-center shrink-0"
                          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                        >
                          {m.name[0].toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate" style={{ color: 'var(--color-text-primary)' }}>{m.name}</p>
                          {m.designation && <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{m.designation}</p>}
                        </div>
                        {patient.assigned_to === m.id && <Check size={12} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />}
                      </button>
                    ))}
                    {patient.assigned_to && (
                      <>
                        <div className="border-t border-(--color-border)" />
                        <button
                          type="button"
                          onClick={() => handleAssignPatient(null)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-500 text-left transition-colors hover:bg-red-50"
                          style={{ color: '#b91c1c' }}
                        >
                          <X size={13} />
                          Unassign
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {hasPermission('patients.delete') && (
            <button onClick={handleDelete} className="p-2 rounded-lg border border-(--color-border) hover:bg-red-50 hover:border-red-200 transition-colors">
              <Trash2 size={15} className="text-red-500" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-5 items-start">
          <div className="space-y-4">
            <Card className="p-5 border-(--color-border)">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Patient Profile</p>
                {!profileEditing && (
                  <button type="button" onClick={openProfileEdit}
                    className="p-1.5 -m-1.5 rounded-lg transition-colors hover:bg-(--color-brand-50)" title="Edit patient" style={{ color: 'var(--color-text-muted)' }}>
                    <Edit2 size={13} />
                  </button>
                )}
              </div>

              {profileEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>First name</label>
                      <input type="text" value={profileDraft.first_name} onChange={e => setProfileDraft(d => ({ ...d, first_name: e.target.value }))}
                        placeholder="First name"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Last name</label>
                      <input type="text" value={profileDraft.last_name} onChange={e => setProfileDraft(d => ({ ...d, last_name: e.target.value }))}
                        placeholder="Last name"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Phone</label>
                    <input type="tel" value={profileDraft.phone} onChange={e => setProfileDraft(d => ({ ...d, phone: e.target.value }))}
                      placeholder="Phone number"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Email</label>
                    <input type="email" value={profileDraft.email} onChange={e => setProfileDraft(d => ({ ...d, email: e.target.value }))}
                      placeholder="Email address"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Date of birth</label>
                      <input type="date" value={profileDraft.date_of_birth ? profileDraft.date_of_birth.slice(0, 10) : ''}
                        onChange={e => setProfileDraft(d => ({ ...d, date_of_birth: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Gender</label>
                      <select value={profileDraft.gender} onChange={e => setProfileDraft(d => ({ ...d, gender: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                        <option value="">—</option>
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Blood group</label>
                    <select value={profileDraft.blood_group} onChange={e => setProfileDraft(d => ({ ...d, blood_group: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      <option value="">—</option>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Address</label>
                    <input type="text" value={profileDraft.address} onChange={e => setProfileDraft(d => ({ ...d, address: e.target.value }))}
                      placeholder="Full address"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Status</label>
                    <div className="flex gap-2">
                      {['Active', 'Inactive'].map(s => (
                        <button key={s} type="button" onClick={() => setProfileDraft(d => ({ ...d, status: s }))}
                          className="flex-1 py-1.5 rounded-lg text-xs font-500 border transition-all"
                          style={profileDraft.status === s ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1 border-t border-(--color-border)">
                    <Button variant="secondary" size="sm" type="button" onClick={() => setProfileEditing(false)}>Cancel</Button>
                    <Button size="sm" type="button" onClick={handleProfileSave} disabled={profileSaving}>
                      {profileSaving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5"><div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-800" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{initials || <User size={22} />}</div><div><p className="text-base font-700" style={{ color: 'var(--color-text-primary)' }}>{fullName}</p>{patient.patient_code && <p className="text-[11px] font-600 font-mono mt-0.5" style={{ color: 'var(--color-brand)' }}>{patient.patient_code}</p>}<div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: statusS.bg, color: statusS.color }}>{patient.status || 'Active'}</span>{patient.gender && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{patient.gender}</span>}{age != null && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{age} yrs</span>}</div></div></div>
                  <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(patient.tags || []).map(t => t.tags).filter(Boolean).map(tag => {
                        const tc = tag.color || '#6366f1'
                        return (
                          <span key={tag.id}
                            className="relative inline-flex items-center gap-1.5 pl-4 pr-2.5 py-1 text-xs font-600"
                            style={{ background: tc, color: 'white', clipPath: 'polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%)' }}>
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }} />
                            {tag.name}
                            <button type="button" onClick={() => handleRemoveTag(tag.id)} className="opacity-70 hover:opacity-100 transition-opacity">
                              <X size={11} />
                            </button>
                          </span>
                        )
                      })}

                      {/* Add Tag + searchable dropdown (fixed-positioned so it never gets clipped) */}
                      <button ref={tagBtnRef} type="button" onClick={() => addingTag ? setAddingTag(false) : openTagMenu()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed text-[10px] font-600 transition-colors hover:bg-(--color-surface-2)"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <Plus size={10} /> Add Tag
                      </button>
                      {addingTag && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setAddingTag(false)} />
                          <div className="fixed w-56 rounded-lg border border-(--color-border) overflow-hidden z-50"
                            style={{ top: tagMenuPos.top, left: tagMenuPos.left, background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                            <div className="p-2 border-b border-(--color-border)">
                              <div className="relative">
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                  autoFocus
                                  value={tagSearch}
                                  onChange={e => setTagSearch(e.target.value)}
                                  placeholder="Search tags…"
                                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-(--color-border) outline-none"
                                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                                />
                              </div>
                            </div>
                            <div className="max-h-52 overflow-y-auto py-1">
                              {unlinkedTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 ? (
                                <p className="px-3 py-3 text-[11px] text-center" style={{ color: 'var(--color-text-muted)' }}>
                                  {availableTags.length === 0 ? 'No patient tags. Create them in Settings → Tags.' : 'No matching tags.'}
                                </p>
                              ) : (
                                unlinkedTags
                                  .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                                  .map(tag => (
                                    <button key={tag.id} type="button" onClick={() => handleAddTag(tag.id)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-(--color-surface-2)">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tag.color }} />
                                      <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{tag.name}</span>
                                      <Plus size={11} style={{ color: 'var(--color-text-muted)' }} />
                                    </button>
                                  ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { icon: Phone,    label: patient.phone || '—' },
                      { icon: Mail,     label: patient.email || '—' },
                      { icon: Calendar, label: patient.date_of_birth ? `DOB: ${format(new Date(patient.date_of_birth), 'MMM d, yyyy')}` : 'DOB: —' },
                      { icon: MapPin,   label: patient.address || '—' },
                      { icon: Tag,      label: patient.custom_data?.blood_group ? `Blood: ${patient.custom_data.blood_group}` : 'Blood: —' },
                    ].map(({ icon: Icon, label }, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Icon size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <span className="text-xs truncate" style={{ color: label.endsWith('—') ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
            <Card className="p-5 border-(--color-border)"><p className="text-[10px] font-700 uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Quick Stats</p><div className="grid grid-cols-2 gap-3">{[{ label: 'Visits', value: patient.appointments?.length || 0 }, { label: 'Invoices', value: patient.invoices?.length || 0 }, { label: 'Records', value: patient.medical_history?.length || 0 }, { label: 'Leads', value: patient.leads?.length || 0 }].map(s => <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}><p className="text-xl font-800">{s.value}</p><p className="text-[10px]">{s.label}</p></div>)}</div></Card>
          </div>

          <div className="col-span-2">
            <Card className="border-(--color-border) overflow-hidden">
              <div className="flex items-center justify-between border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex">
                  {[{ id: 'tasks', label: 'Tasks', icon: CheckSquare, count: pendingTasks }, { id: 'timeline', label: 'Timeline', icon: Clock }].map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={clsx('flex items-center gap-2 px-5 py-3.5 text-xs font-600 border-b-2', activeTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent')} style={activeTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}><tab.icon size={14} />{tab.label}{tab.count > 0 && <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{tab.count}</span>}</button>)}
                </div>
                {activeTab === 'tasks' && !taskOpen && (
                  <Button size="sm" className="mr-3 shrink-0" onClick={() => setTaskOpen(true)}><Plus size={14} /> New Task</Button>
                )}
              </div>
              <div className="p-3">
                {activeTab === 'tasks' && <div className="space-y-3">{taskOpen && <form onSubmit={handleCreateTask} className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}><Input label="Task *" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} required /><div className="grid grid-cols-2 gap-3"><Select label="Priority" value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))} options={['Low', 'Medium', 'High', 'Urgent'].map(s => ({ value: s, label: s }))} /><Input label="Due Date" type="datetime-local" value={newTask.due_date} onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))} /></div><div className="flex justify-end gap-2"><Button variant="secondary" size="sm" type="button" onClick={() => setTaskOpen(false)}>Cancel</Button><Button size="sm" type="submit">Create Task</Button></div></form>}{tasks.length === 0 ? <div className="py-16 text-center border border-dashed rounded-xl border-(--color-border)"><CheckSquare size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No tasks yet.</p></div> : tasks.map(task => <div key={task.id} className={clsx('flex items-start gap-3 p-4 rounded-xl border border-(--color-border)', task.status === 'Completed' && 'opacity-50')} style={{ background: 'var(--color-surface-2)' }}><input type="checkbox" checked={task.status === 'Completed'} className="mt-0.5 w-4 h-4" onChange={() => handleTaskToggle(task)} /><div className="flex-1"><p className={clsx('text-sm font-500', task.status === 'Completed' && 'line-through')}>{task.title}</p>{task.due_date && <p className="text-xs mt-0.5"><Calendar size={10} className="inline mr-1" />{format(new Date(task.due_date), 'MMM d, h:mm a')}</p>}</div></div>)}</div>}
                {activeTab === 'timeline' && <Timeline activities={activities} maxHeight="28rem" />}
              </div>
            </Card>
          </div>
        </div>

        <Card className="border-(--color-border) overflow-hidden">
          <div className="flex border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            {[{ id: 'history', label: 'Medical History', icon: History }, { id: 'documents', label: 'Documents', icon: FileText }].map(tab => <button key={tab.id} onClick={() => setBottomTab(tab.id)} className={clsx('flex items-center gap-2 px-5 py-3.5 text-xs font-600 border-b-2', bottomTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent')} style={bottomTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}><tab.icon size={14} />{tab.label}</button>)}
          </div>
          <div className="p-5">
            {bottomTab === 'history' && <div className="space-y-4"><div className="flex justify-end">{!addingRecord && <Button size="sm" onClick={() => setAddingRecord(true)}><Plus size={14} /> Add Record</Button>}</div>{addingRecord && <form onSubmit={handleAddRecord} className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}><Input label="Diagnosis / Reason for Visit *" value={medEntry.diagnosis} onChange={e => setMedEntry(m => ({ ...m, diagnosis: e.target.value }))} required /><Textarea label="Treatment / Prescription" value={medEntry.treatment} onChange={e => setMedEntry(m => ({ ...m, treatment: e.target.value }))} rows={3} /><Textarea label="Additional Notes" value={medEntry.notes} onChange={e => setMedEntry(m => ({ ...m, notes: e.target.value }))} rows={2} /><div className="flex justify-end gap-2"><Button variant="secondary" size="sm" type="button" onClick={() => setAddingRecord(false)}>Cancel</Button><Button size="sm" type="submit" disabled={savingRecord}>{savingRecord ? 'Saving...' : <><Save size={13} /> Save Record</>}</Button></div></form>}{!patient.medical_history?.length && !addingRecord ? <div className="py-16 text-center border border-dashed rounded-xl border-(--color-border)"><History size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No medical records yet.</p></div> : <div className="space-y-3">{(patient.medical_history || []).map((rec, i) => <div key={i} className="p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}><p className="text-[10px] font-600 uppercase mb-0.5" style={{ color: 'var(--color-brand)' }}>{rec.date ? format(new Date(rec.date), 'MMM d, yyyy') : '—'}</p><p className="text-sm font-700">{rec.diagnosis}</p>{rec.treatment && <p className="text-xs mt-2">{rec.treatment}</p>}</div>)}</div>}</div>}
            {bottomTab === 'documents' && <div className="py-16 text-center border-2 border-dashed rounded-xl border-(--color-border)"><FileText size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Upload reports, prescriptions, or scan documents</p><p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Coming soon</p></div>}
          </div>
        </Card>

        {/* Appointments */}
        <Card className="border-(--color-border) overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}><Calendar size={13} /> Appointments</p>
            {!addingAppt && <Button size="sm" onClick={() => setAddingAppt(true)}><Plus size={14} /> Book Appointment</Button>}
          </div>
          <div className="p-3 space-y-3">
            {addingAppt && (
              <form onSubmit={handleBookAppt} className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
                    <input type="date" required value={apptForm.date} onChange={e => setApptForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Time</label>
                    <input type="time" value={apptForm.time} onChange={e => setApptForm(f => ({ ...f, time: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  </div>
                </div>
                {doctors.length > 0 && (
                  <select value={apptForm.doctor_id} onChange={e => setApptForm(f => ({ ...f, doctor_id: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                    <option value="">— Doctor —</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}{d.department ? ` · ${d.department}` : ''}</option>)}
                  </select>
                )}
                <Textarea label="Notes" value={apptForm.notes} onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setAddingAppt(false)}>Cancel</Button>
                  <Button size="sm" type="submit" disabled={savingAppt || !apptForm.date}>{savingAppt ? 'Booking…' : <><Calendar size={13} /> Book</>}</Button>
                </div>
              </form>
            )}
            {appointments.length === 0 && !addingAppt ? (
              <div className="-mx-3 -mb-3 py-16 text-center border-t border-(--color-border)"><Calendar size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No appointments yet.</p></div>
            ) : (
              <div className="-mx-3 -mb-3 px-2 py-3 space-y-2 border-t border-(--color-border)">
                {[...appointments].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)).map(appt => {
                  const ST = { booked: { bg: '#dbeafe', color: '#1d4ed8' }, confirmed: { bg: '#dcfce7', color: '#15803d' }, completed: { bg: '#f3f4f6', color: '#374151' }, cancelled: { bg: '#fee2e2', color: '#b91c1c' } }
                  const st = ST[appt.status] || ST.booked
                  const doc = appt.doctor_id ? doctors.find(d => d.id === appt.doctor_id) : null
                  const canAct = appt.status === 'booked' || appt.status === 'confirmed'
                  return (
                    <div key={appt.id} className="flex items-start gap-3 p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}><Calendar size={15} style={{ color: 'var(--color-brand)' }} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{format(new Date(appt.scheduled_at), 'EEE, MMM d yyyy · h:mm a')}</span>
                          <span className="text-[10px] font-600 px-2 py-0.5 rounded-full capitalize" style={{ background: st.bg, color: st.color }}>{appt.status}</span>
                          {appt.lead_id && !appt.patient_id && <span className="text-[9px] font-600 px-1.5 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#1d4ed8' }}>from lead</span>}
                        </div>
                        {doc && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{doc.name}{doc.department ? ` · ${doc.department}` : ''}</p>}
                        {appt.notes && <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>{appt.notes}</p>}
                      </div>
                      {canAct && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => handleApptStatus(appt.id, 'completed')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}><Check size={11} /> Complete</button>
                          <button type="button" onClick={() => handleApptStatus(appt.id, 'cancelled')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border" style={{ borderColor: '#fecaca', color: '#b91c1c' }}><X size={11} /> Cancel</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Visit Details */}
        <Card className="border-(--color-border) overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}><Activity size={13} /> Visit Details</p>
            <div className="flex items-center gap-2">
              {visits.length > 1 && (
                <button type="button" onClick={() => setVisitSort(s => s === 'desc' ? 'asc' : 'desc')}
                  title={visitSort === 'desc' ? 'Date: newest first' : 'Date: oldest first'}
                  className="p-1.5 rounded-md border border-(--color-border) transition-colors hover:bg-(--color-surface)" style={{ color: 'var(--color-text-muted)' }}>
                  {visitSort === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                </button>
              )}
              <Button size="sm" onClick={handleAddBlankVisit}><Plus size={14} /> Add Visit</Button>
            </div>
          </div>
          <div className="p-3 space-y-3">
            {visits.length === 0 ? (
              <div className="-mx-3 -mb-3 py-16 text-center border-t border-(--color-border)"><Activity size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No visits recorded yet. Click “Add Visit” to add a row.</p></div>
            ) : (
              <div className="-mx-3 -mb-3">
                <VisitsTable
                  visits={visits}
                  services={services}
                  packages={packages}
                  doctors={doctors}
                  sort={visitSort}
                  onField={handleVisitField}
                  onDelete={handleDeleteVisit}
                />
              </div>
            )}
          </div>
        </Card>

        {(org?.settings?.modules || []).filter(m => m.page === 'patients' && m.active).map(m => {
          const moduleData = patient?.custom_data?.[m.id] || {}
          const handleModuleSave = async (values) => {
            const custom_data = { ...(patient.custom_data || {}), [m.id]: values }
            const updated = await updatePatient(id, { custom_data })
            setPatient(prev => ({ ...prev, custom_data: updated.custom_data }))
            await logActivity('note', `${m.name} details updated`)
            await loadAll()
          }
          return m.view === 'table'
            ? <CustomModuleTable key={m.id} module={m} data={moduleData} onSave={handleModuleSave} />
            : <CustomModuleCard  key={m.id} module={m} data={moduleData} onSave={handleModuleSave} />
        })}

        <Card className="border-(--color-border) overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}><PhoneCall size={13} /> Follow-ups</p>
            <Button size="sm" onClick={handleAddBlankFollowup}><Plus size={14} /> Add Follow-up</Button>
          </div>
          <div className="p-3 space-y-3">
            {followups.length === 0 ? (
              <div className="-mx-3 -mb-3 py-16 text-center border-t border-(--color-border)"><PhoneCall size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No follow-ups yet. Click “Add Follow-up” to add a row.</p></div>
            ) : (
              <div className="-mx-3 -mb-3 max-h-150 overflow-y-auto">
                <FollowupTable
                  followups={followups}
                  staff={org?.settings?.staff_members || []}
                  onField={handleFollowupField}
                  onCreate={handleCreateFollowupInline}
                  onDelete={handleDeleteFollowup}
                  statusStyle={FU_STATUS_STYLE}
                  typeStyle={TYPE_COLOR}
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

        {/* ── Notes (synced with the linked lead) ── */}
        <Card className="border-(--color-border) overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Notes</p>
            {!notesEditing && (
              <Button size="sm" onClick={() => { setNotesDraft(notesValue || ''); setNotesEditing(true) }}>
                <Edit2 size={13} /> {notesValue ? 'Edit' : 'Add note'}
              </Button>
            )}
          </div>
          <div className="p-4">
            {notesEditing ? (
              <div className="space-y-3">
                <Textarea placeholder="Write a note about this patient…" value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={5} />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setNotesEditing(false)}>Cancel</Button>
                  <Button size="sm" type="button" onClick={handleSaveNotes} disabled={notesSaving}>{notesSaving ? 'Saving…' : 'Save'}</Button>
                </div>
              </div>
            ) : notesValue ? (
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{notesValue}</p>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No notes yet. Click “Add note” to write one.</p>
            )}
          </div>
        </Card>
      </div>

    </div>
  )
}
