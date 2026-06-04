'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Stethoscope, UserPlus, Plus, X, History, FileText, Save, Calendar, CheckSquare, Clock, MessageSquare, Phone, Mail, Edit2, Tag, Bell } from 'lucide-react'
import { Button, Card, Input, Select, Textarea, Spinner } from '@/components/ui'
import {
  getConsultations, createConsultation, updateConsultation,
  getPatients, getLeads, getPatient, updatePatient,
  getTasks, createTask, updateTask, getActivities,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Timeline from '@/components/crm/Timeline'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const CONSULTATION_TYPES = ['Initial', 'Follow-up', 'Urgent', 'Routine', 'Teleconsultation', 'Walk-in']
const STATUSES           = ['Scheduled', 'Completed', 'Cancelled', 'No-Show']

// Timeline icon per activity type (matches lead detail page)
const ACTIVITY_ICON = {
  comment:       MessageSquare,
  call:          Phone,
  email:         Mail,
  meeting:       Calendar,
  note:          Edit2,
  status_change: Tag,
  whatsapp:      MessageSquare,
}

const BLANK_FORM = () => ({
  contact: '', doctor_id: '',
  consultation_type: 'Initial', status: 'Completed',
  consulted_at_date: format(new Date(), 'yyyy-MM-dd'),
  consulted_at_time: format(new Date(), 'HH:mm'),
  chief_complaint: '', clinical_notes: '', diagnosis: '',
  treatment_plan: '', prescription: '',
  vitals: { bp_sys: '', bp_dia: '', pulse: '', temp: '', weight: '', spo2: '' },
  visit_details: [],
  follow_up_required: false, follow_up_date: '',
  duration_minutes: 30, amount: '',
})

function ConsultationForm({ form, setForm, contacts, doctors }) {
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setVital = (key, val) => setForm(f => ({ ...f, vitals: { ...f.vitals, [key]: val } }))

  const rows = form.visit_details || []
  const addRow    = () => setForm(f => ({ ...f, visit_details: [...(f.visit_details || []), { label: '', value: '' }] }))
  const removeRow = (i) => setForm(f => ({ ...f, visit_details: f.visit_details.filter((_, idx) => idx !== i) }))
  const setRow    = (i, key, val) => setForm(f => ({
    ...f,
    visit_details: f.visit_details.map((r, idx) => idx === i ? { ...r, [key]: val } : r),
  }))

  return (
    <div className="space-y-5">
      {/* Name */}
      <Card className="p-5">
        <p className="text-[10px] font-700 uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Name</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select label="Name" value={form.contact} onChange={e => set('contact', e.target.value)}
              options={[{ value: '', label: '— Select a patient or lead —' }, ...contacts.map(c => ({ value: c.value, label: `${c.label} · ${c.type}` }))]} />
          </div>
          <Link href="/patients/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-600 border transition-colors hover:bg-(--color-brand-50) shrink-0"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-brand)', background: 'var(--color-surface)' }}
            title="Add a new patient">
            <UserPlus size={14} /> Add
          </Link>
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          Not in the list? Click <span className="font-600">Add</span> to create a patient first, then come back.
        </p>
      </Card>

      {/* Visit Details */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Visit Details</p>
          {rows.length > 0 && (
            <Button size="sm" type="button" onClick={addRow}><Plus size={14} /> Add</Button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="py-8 text-center border border-dashed rounded-xl border-(--color-border)">
            <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No visit details added yet.</p>
            <button type="button" onClick={addRow} className="mt-2 inline-flex items-center gap-1 text-xs font-600 transition-opacity hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
              <Plus size={13} /> Add a detail
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r, i) => (
              <div key={i} className="flex items-end gap-3 p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Detail</label>
                  <input
                    value={r.label}
                    onChange={e => setRow(i, 'label', e.target.value)}
                    placeholder="e.g. Blood Group"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Value</label>
                  <input
                    value={r.value}
                    onChange={e => setRow(i, 'value', e.target.value)}
                    placeholder="e.g. O+"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <button type="button" onClick={() => removeRow(i)}
                  className="mb-0.5 p-2 rounded-lg border border-(--color-border) text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Follow-up */}
      <Card className="p-5">
        <p className="text-[10px] font-700 uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Follow-up</p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.follow_up_required} onChange={e => set('follow_up_required', e.target.checked)}
              className="w-4 h-4" style={{ accentColor: 'var(--color-brand)' }} />
            <span className="text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Follow-up required</span>
          </label>
          {form.follow_up_required && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Date</label>
              <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
            </div>
          )}
        </div>
      </Card>

      {/* Clinical Notes */}
      <Card className="p-5">
        <p className="text-[10px] font-700 uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Clinical Notes</p>
        <Textarea placeholder="Observations, history, symptoms…" value={form.clinical_notes} onChange={e => set('clinical_notes', e.target.value)} rows={4} />
      </Card>
    </div>
  )
}

function NewConsultationInner() {
  const { orgId, org } = useOrg()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

  const [form, setForm]         = useState(BLANK_FORM())
  const [contacts, setContacts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  // Medical history (mapped to the selected patient)
  const [patientHistory, setPatientHistory] = useState([])
  const [bottomTab, setBottomTab]           = useState('history')
  const [addingRecord, setAddingRecord]     = useState(false)
  const [medEntry, setMedEntry]             = useState({ diagnosis: '', treatment: '', notes: '' })
  const [savingRecord, setSavingRecord]     = useState(false)

  const doctors = org?.settings?.doctors || []

  // Selected contact
  const [contactType, contactId] = (form.contact || '').split(':')
  const selectedPatientId = contactType === 'patient' ? contactId : null
  const selectedLeadId    = contactType === 'lead'    ? contactId : null

  // Load the selected patient's existing medical history
  useEffect(() => {
    if (!selectedPatientId) { setPatientHistory([]); setAddingRecord(false); return }
    let active = true
    getPatient(selectedPatientId)
      .then(p => { if (active) setPatientHistory(Array.isArray(p?.medical_history) ? p.medical_history : []) })
      .catch(() => { if (active) setPatientHistory([]) })
    return () => { active = false }
  }, [selectedPatientId])

  // ── Tasks & Timeline (synced with selected contact) ──
  const entity = selectedPatientId ? { type: 'patient', id: selectedPatientId }
    : selectedLeadId ? { type: 'lead', id: selectedLeadId } : null
  const [tasks, setTasks]         = useState([])
  const [activities, setActivities] = useState([])
  const [rightTab, setRightTab]   = useState('tasks')   // tasks active by default
  const [addingTask, setAddingTask] = useState(false)
  const [taskForm, setTaskForm]   = useState({ title: '', priority: 'Medium', due_date: '' })
  const [savingTask, setSavingTask] = useState(false)

  useEffect(() => {
    if (!orgId || !entity) { setTasks([]); setActivities([]); setAddingTask(false); return }
    let active = true
    ;(async () => {
      try {
        // For a patient, merge in activity/tasks from its linked leads (same as patient detail page)
        let leadIds = []
        if (entity.type === 'patient') {
          const p = await getPatient(entity.id).catch(() => null)
          leadIds = (p?.leads || []).map(l => l.id)
        }
        const [ownActs, ownTasks, leadActsList, leadTasksList] = await Promise.all([
          getActivities(entity.type, entity.id, orgId),
          getTasks({ entityType: entity.type, entityId: entity.id, orgId }),
          Promise.all(leadIds.map(id => getActivities('lead', id, orgId))),
          Promise.all(leadIds.map(id => getTasks({ entityType: 'lead', entityId: id, orgId }))),
        ])
        if (!active) return
        const acts = [...(ownActs || []), ...leadActsList.flat()]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const tks = [...(ownTasks || []), ...leadTasksList.flat()]
          .reduce((acc, t) => acc.some(x => x.id === t.id) ? acc : [...acc, t], [])
        setActivities(acts)
        setTasks(tks)
      } catch { /* ignore */ }
    })()
    return () => { active = false }
  }, [orgId, entity?.type, entity?.id])

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!taskForm.title.trim() || !orgId || !entity) return
    setSavingTask(true)
    try {
      const t = await createTask({ ...taskForm, organization_id: orgId, entity_type: entity.type, entity_id: entity.id, status: 'Pending' })
      setTasks(prev => [t, ...prev])
      setTaskForm({ title: '', priority: 'Medium', due_date: '' })
      setAddingTask(false)
    } catch (err) { alert(err.message) }
    finally { setSavingTask(false) }
  }

  const handleToggleTask = async (task) => {
    const status = task.status === 'Completed' ? 'Pending' : 'Completed'
    try {
      const u = await updateTask(task.id, { status })
      setTasks(prev => prev.map(t => t.id === task.id ? u : t))
    } catch (err) { alert(err.message) }
  }

  const handleAddRecord = async (e) => {
    e.preventDefault()
    if (!medEntry.diagnosis.trim() || !selectedPatientId) return
    setSavingRecord(true)
    try {
      const newHistory = [{ ...medEntry, date: new Date().toISOString() }, ...patientHistory]
      await updatePatient(selectedPatientId, { medical_history: newHistory })
      setPatientHistory(newHistory)
      setMedEntry({ diagnosis: '', treatment: '', notes: '' })
      setAddingRecord(false)
    } catch (err) { alert(err.message) }
    finally { setSavingRecord(false) }
  }

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    Promise.all([getPatients({ orgId }), getLeads({ orgId }), editId ? getConsultations({ orgId }) : Promise.resolve(null)])
      .then(([p, l, cs]) => {
        if (!active) return
        const patientOpts = (p || []).map(x => ({
          value: `patient:${x.id}`, type: 'Patient',
          label: `${x.first_name} ${x.last_name || ''}`.trim() || 'Unnamed',
        }))
        const leadOpts = (l || []).filter(x => !x.patient_id).map(x => ({
          value: `lead:${x.id}`, type: 'Lead',
          label: [x.first_name, x.last_name].filter(Boolean).join(' ') || x.title || 'Unnamed',
        }))
        setContacts([...patientOpts, ...leadOpts])
        if (editId && cs) {
          const c = cs.find(x => x.id === editId)
          if (c) {
            const d = new Date(c.consulted_at)
            setForm({
              contact: c.patient_id ? `patient:${c.patient_id}` : c.lead_id ? `lead:${c.lead_id}` : '',
              doctor_id: c.doctor_id || '',
              consultation_type: c.consultation_type, status: c.status,
              consulted_at_date: format(d, 'yyyy-MM-dd'), consulted_at_time: format(d, 'HH:mm'),
              chief_complaint: c.chief_complaint || '', clinical_notes: c.clinical_notes || '',
              diagnosis: c.diagnosis || '', treatment_plan: c.treatment_plan || '', prescription: c.prescription || '',
              vitals: { bp_sys: '', bp_dia: '', pulse: '', temp: '', weight: '', spo2: '', ...(c.vitals || {}) },
              visit_details: Array.isArray(c.visit_details) ? c.visit_details : [],
              follow_up_required: c.follow_up_required || false, follow_up_date: c.follow_up_date || '',
              duration_minutes: c.duration_minutes || 30, amount: c.amount || '',
            })
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orgId, editId])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)
    try {
      const scheduledAt = new Date(`${form.consulted_at_date}T${form.consulted_at_time || '10:00'}:00`)
      const vitals = Object.fromEntries(Object.entries(form.vitals).filter(([, v]) => v !== ''))
      const payload = {
        organization_id: orgId,
        patient_id: contactType === 'patient' ? contactId : null,
        lead_id:    contactType === 'lead'    ? contactId : null,
        doctor_id: form.doctor_id || null,
        consultation_type: form.consultation_type,
        status: form.status,
        consulted_at: scheduledAt.toISOString(),
        chief_complaint: form.chief_complaint || null,
        clinical_notes: form.clinical_notes || null,
        diagnosis: form.diagnosis || null,
        treatment_plan: form.treatment_plan || null,
        prescription: form.prescription || null,
        vitals,
        visit_details: (form.visit_details || []).filter(r => (r.label || '').trim() || (r.value || '').trim()),
        follow_up_required: form.follow_up_required,
        follow_up_date: form.follow_up_required && form.follow_up_date ? form.follow_up_date : null,
        duration_minutes: Number(form.duration_minutes) || 30,
        amount: form.amount !== '' ? Number(form.amount) : 0,
      }
      if (editId) await updateConsultation(editId, payload)
      else await createConsultation(payload)
      router.push('/consultation')
    } catch (err) { alert(err.message); setSaving(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center gap-3" style={{ background: 'var(--color-surface)' }}>
        <Link href="/consultation" className="flex items-center gap-1.5 text-sm hover:opacity-60 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={16} /> Consultations
        </Link>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{editId ? 'Edit Consultation' : 'New Consultation'}</span>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
            <Stethoscope size={20} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <h1 className="text-lg font-700" style={{ color: 'var(--color-text-primary)' }}>{editId ? 'Edit Consultation' : 'New Consultation'}</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Record the clinical details of this visit.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5 items-start">
          {/* ── LEFT (70%) ── */}
          <div className="space-y-5 min-w-0">
          {loading ? (
            <div className="flex justify-center py-20"><Spinner size={28} /></div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <ConsultationForm form={form} setForm={setForm} contacts={contacts} doctors={doctors} />
              <div className="flex justify-end gap-2">
                <Link href="/consultation"><Button variant="secondary" type="button">Cancel</Button></Link>
                <Button type="submit" disabled={saving || !form.consulted_at_date}>
                  {saving ? 'Saving…' : editId ? 'Save Changes' : 'Log Consultation'}
                </Button>
              </div>
            </form>
          )}

          {/* ── Medical History & Documents (tabbed — same as patient page) ── */}
          {!loading && (
            <Card className="border-(--color-border) overflow-hidden mt-5">
              <div className="flex border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                {[{ id: 'history', label: 'Medical History', icon: History }, { id: 'documents', label: 'Documents', icon: FileText }].map(tab => (
                  <button key={tab.id} type="button" onClick={() => setBottomTab(tab.id)}
                    className={clsx('flex items-center gap-2 px-5 py-3.5 text-xs font-600 border-b-2', bottomTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent')}
                    style={bottomTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}>
                    <tab.icon size={14} />{tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {bottomTab === 'history' && (
                  !selectedPatientId ? (
                    <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
                      <History size={26} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Select a patient to view or add medical history.</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Leads don't carry medical records — use <span className="font-600">Add</span> to create a patient first.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        {!addingRecord && <Button size="sm" type="button" onClick={() => setAddingRecord(true)}><Plus size={14} /> Add Record</Button>}
                      </div>
                      {addingRecord && (
                        <form onSubmit={handleAddRecord} className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
                          <Input label="Diagnosis / Reason for Visit *" value={medEntry.diagnosis} onChange={e => setMedEntry(m => ({ ...m, diagnosis: e.target.value }))} required />
                          <Textarea label="Treatment / Prescription" value={medEntry.treatment} onChange={e => setMedEntry(m => ({ ...m, treatment: e.target.value }))} rows={3} />
                          <Textarea label="Additional Notes" value={medEntry.notes} onChange={e => setMedEntry(m => ({ ...m, notes: e.target.value }))} rows={2} />
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" type="button" onClick={() => setAddingRecord(false)}>Cancel</Button>
                            <Button size="sm" type="submit" disabled={savingRecord}>{savingRecord ? 'Saving...' : <><Save size={13} /> Save Record</>}</Button>
                          </div>
                        </form>
                      )}
                      {patientHistory.length === 0 && !addingRecord ? (
                        <div className="py-16 text-center border border-dashed rounded-xl border-(--color-border)">
                          <History size={28} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No medical records yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patientHistory.map((rec, i) => (
                            <div key={i} className="p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                              <p className="text-[10px] font-600 uppercase mb-0.5" style={{ color: 'var(--color-brand)' }}>{rec.date ? format(new Date(rec.date), 'MMM d, yyyy') : '—'}</p>
                              <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{rec.diagnosis}</p>
                              {rec.treatment && <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{rec.treatment}</p>}
                              {rec.notes && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{rec.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
                {bottomTab === 'documents' && (
                  <div className="py-16 text-center border-2 border-dashed rounded-xl border-(--color-border)">
                    <FileText size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Upload reports, prescriptions, or scan documents</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Coming soon</p>
                  </div>
                )}
              </div>
            </Card>
          )}
          </div>

          {/* ── RIGHT (30%) ── */}
          <div className="space-y-5">

            {/* Tasks / Timeline */}
            <Card className="border-(--color-border) overflow-hidden">
              <div className="flex border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                {[{ id: 'tasks', label: 'Tasks', icon: CheckSquare }, { id: 'timeline', label: 'Timeline', icon: Clock }].map(tab => (
                  <button key={tab.id} type="button" onClick={() => setRightTab(tab.id)}
                    className={clsx('flex items-center gap-2 px-4 py-3 text-xs font-600 border-b-2', rightTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent')}
                    style={rightTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}>
                    <tab.icon size={14} />{tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {!entity ? (
                  <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
                    <CheckSquare size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Select a patient or lead to see tasks &amp; activity.</p>
                  </div>
                ) : rightTab === 'tasks' ? (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      {!addingTask && <Button size="sm" type="button" onClick={() => setAddingTask(true)}><Plus size={14} /> New Task</Button>}
                    </div>
                    {addingTask && (
                      <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-(--color-border) space-y-2.5" style={{ background: 'var(--color-surface-2)' }}>
                        <Input label="Task *" placeholder="e.g. Call to confirm" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required />
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
                    {tasks.length === 0 && !addingTask ? (
                      <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
                        <CheckSquare size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No tasks yet.</p>
                      </div>
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

          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewConsultationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-32"><Spinner size={32} /></div>}>
      <NewConsultationInner />
    </Suspense>
  )
}
