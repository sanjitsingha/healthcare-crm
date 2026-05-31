'use client'
import { useEffect, useState, use } from 'react'
import {
  ArrowLeft, Edit2, Trash2, Phone, Mail, MapPin, Calendar,
  Clock, Activity, FileText, History, Plus, Save, User, X,
} from 'lucide-react'
import { Button, Card, Input, Textarea, Spinner, Modal } from '@/components/ui'
import {
  getPatient, updatePatient, deletePatient,
  getActivities, createActivity,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow, differenceInYears } from 'date-fns'
import clsx from 'clsx'

const STATUS_STYLE = {
  Active:   { bg: '#dcfce7', color: '#15803d' },
  Inactive: { bg: '#fee2e2', color: '#b91c1c' },
}

// ── Custom field renderer (mirrors leads/[id]/page.js) ─────────
function CustomFieldInput({ field, value, onChange }) {
  if (field.type === 'textarea')
    return <Textarea label={field.label} value={value || ''} onChange={e => onChange(e.target.value)} rows={2} />
  if (field.type === 'select') {
    const opts = (field.options || '').split(',').map(s => s.trim()).filter(Boolean)
    return (
      <select
        className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
        style={{ background: 'var(--color-surface)' }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select...</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (field.type === 'boolean') return (
    <div className="space-y-1.5">
      <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{field.label}</label>
      <div className="flex gap-2">
        {['Yes', 'No'].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className="flex-1 py-1.5 rounded-lg text-xs font-500 border transition-all"
            style={value === opt
              ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
              : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
          >{opt}</button>
        ))}
      </div>
    </div>
  )
  const typeMap = { phone: 'tel', email: 'email', number: 'number', date: 'date', text: 'text' }
  return <Input label={field.label} type={typeMap[field.type] || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} />
}

function CustomModuleCard({ module, data, onSave }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues]   = useState({ ...data })
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(values); setEditing(false) }
    catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Card className="p-5 border-(--color-border)">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{module.name}</p>
        {!editing && (
          <button onClick={() => { setValues({ ...data }); setEditing(true) }}
            className="text-xs font-500 px-2.5 py-1 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-brand-50)"
            style={{ color: 'var(--color-brand)' }}
          ><Edit2 size={12} className="inline mr-1" />Edit</button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          {module.fields.map(f => (
            <CustomFieldInput key={f.id} field={f} value={values[f.id]} onChange={v => setValues(p => ({ ...p, [f.id]: v }))} />
          ))}
          <div className="flex gap-2 justify-end pt-2 border-t border-(--color-border)">
            <Button variant="secondary" size="sm" type="button" onClick={() => { setValues({ ...data }); setEditing(false) }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      ) : Object.values(data).some(Boolean) ? (
        <div className="space-y-2">
          {module.fields.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-4">
              <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>{f.label}</span>
              <span className="text-xs font-500 text-right truncate" style={{ color: 'var(--color-text-primary)' }}>{data[f.id] || '—'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data filled yet. Click Edit to fill.</p>
      )}
    </Card>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function PatientDetailPage({ params }) {
  const { id }           = use(params)
  const router           = useRouter()
  const { orgId, org }   = useOrg()

  const [patient,    setPatient]    = useState(null)
  const [activities, setActivities] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('history')
  const [editOpen,   setEditOpen]   = useState(false)
  const [editForm,   setEditForm]   = useState({})

  // Add medical record inline state
  const [addingRecord, setAddingRecord]   = useState(false)
  const [medEntry,     setMedEntry]       = useState({ diagnosis: '', treatment: '', notes: '' })
  const [savingRecord, setSavingRecord]   = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [p, a] = await Promise.all([
        getPatient(id),
        getActivities('patient', id, orgId),
      ])
      setPatient(p)
      setActivities(a || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  const handleAddRecord = async (e) => {
    e.preventDefault()
    if (!medEntry.diagnosis.trim()) return
    setSavingRecord(true)
    try {
      const newHistory = [
        { ...medEntry, date: new Date().toISOString() },
        ...(patient.medical_history || []),
      ]
      await updatePatient(id, { medical_history: newHistory })
      if (orgId) await createActivity({
        organization_id: orgId,
        entity_type: 'patient',
        entity_id: id,
        type: 'note',
        content: `Medical record added: ${medEntry.diagnosis}`,
      })
      await loadAll()
      setAddingRecord(false)
      setMedEntry({ diagnosis: '', treatment: '', notes: '' })
    } catch (err) { alert(err.message) }
    finally { setSavingRecord(false) }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      const updated = await updatePatient(id, editForm)
      setPatient(prev => ({ ...prev, ...updated }))
      setEditOpen(false)
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this patient? This cannot be undone.')) return
    await deletePatient(id)
    router.push('/patients')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32"><Spinner size={32} /></div>
  )
  if (!patient) return (
    <div className="p-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Patient not found</div>
  )

  const fullName  = `${patient.first_name} ${patient.last_name || ''}`.trim()
  const age       = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null
  const initials  = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase()
  const statusS   = STATUS_STYLE[patient.status] || STATUS_STYLE.Active

  const patientModules = (org?.settings?.modules || []).filter(m => m.page === 'patients' && m.active)

  const TABS = [
    { id: 'history',   label: 'Medical History', icon: History },
    { id: 'timeline',  label: 'Timeline',        icon: Activity },
    { id: 'documents', label: 'Documents',        icon: FileText },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>

      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-6 py-4 border-b border-(--color-border) flex items-center justify-between"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/patients" className="flex items-center gap-1.5 text-sm hover:opacity-60 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} /> Patients
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-600 truncate max-w-xs" style={{ color: 'var(--color-text-primary)' }}>{fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setEditForm({ first_name: patient.first_name, last_name: patient.last_name || '', phone: patient.phone || '', email: patient.email || '', address: patient.address || '', status: patient.status || 'Active' }); setEditOpen(true) }}>
            <Edit2 size={14} /> Edit
          </Button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg border border-(--color-border) hover:bg-red-50 hover:border-red-200 transition-colors"
          >
            <Trash2 size={15} className="text-red-500" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Main grid */}
        <div className="grid grid-cols-3 gap-5 items-start">

          {/* Left column */}
          <div className="space-y-4">

            {/* Profile card */}
            <Card className="p-5 border-(--color-border)">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-800 shrink-0"
                  style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                >
                  {initials || <User size={22} />}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-700 truncate" style={{ color: 'var(--color-text-primary)' }}>{fullName}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ background: statusS.bg, color: statusS.color }}>
                      {patient.status || 'Active'}
                    </span>
                    {patient.gender && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{patient.gender}</span>}
                    {age != null && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{age} yrs</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Phone,    value: patient.phone },
                  { icon: Mail,     value: patient.email },
                  { icon: MapPin,   value: patient.address },
                  { icon: Calendar, value: patient.date_of_birth ? `DOB: ${format(new Date(patient.date_of_birth), 'MMM d, yyyy')}` : null },
                  { icon: Clock,    value: `Registered: ${format(new Date(patient.created_at), 'MMM d, yyyy')}` },
                ].filter(r => r.value).map(({ icon: Icon, value }, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Icon size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick stats */}
            <Card className="p-5 border-(--color-border)">
              <p className="text-[10px] font-700 uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Quick Stats</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Visits',   value: patient.appointments?.length || 0 },
                  { label: 'Invoices', value: patient.invoices?.length || 0 },
                  { label: 'Records',  value: patient.medical_history?.length || 0 },
                  { label: 'Leads',    value: patient.leads?.length || 0 },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <p className="text-xl font-800" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
                    <p className="text-[10px] font-500 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Custom patient modules */}
            {patientModules.map(m => (
              <CustomModuleCard
                key={m.id}
                module={m}
                data={patient?.custom_data?.[m.id] || {}}
                onSave={async (values) => {
                  const custom_data = { ...(patient.custom_data || {}), [m.id]: values }
                  const updated = await updatePatient(id, { custom_data })
                  setPatient(prev => ({ ...prev, custom_data: updated.custom_data }))
                }}
              />
            ))}
          </div>

          {/* Right column — tabs */}
          <div className="col-span-2">
            <Card className="border-(--color-border) overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx('flex items-center gap-2 px-5 py-3.5 text-xs font-600 border-b-2 transition-all',
                      activeTab === tab.id ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent hover:bg-(--color-surface)'
                    )}
                    style={activeTab === tab.id ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}
                  >
                    <tab.icon size={14} />{tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* Medical History */}
                {activeTab === 'history' && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      {!addingRecord && (
                        <Button size="sm" onClick={() => setAddingRecord(true)}><Plus size={14} /> Add Record</Button>
                      )}
                    </div>

                    {/* Inline add record form */}
                    {addingRecord && (
                      <form onSubmit={handleAddRecord} className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
                        <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>New Medical Record</p>
                        <Input
                          label="Diagnosis / Reason for Visit *"
                          placeholder="e.g. Annual Checkup, Dental Extraction"
                          value={medEntry.diagnosis}
                          onChange={e => setMedEntry(m => ({ ...m, diagnosis: e.target.value }))}
                          required
                        />
                        <Textarea
                          label="Treatment / Prescription"
                          placeholder="Describe the treatment or prescribed medications..."
                          value={medEntry.treatment}
                          onChange={e => setMedEntry(m => ({ ...m, treatment: e.target.value }))}
                          rows={3}
                        />
                        <Textarea
                          label="Additional Notes"
                          placeholder="Any other observations..."
                          value={medEntry.notes}
                          onChange={e => setMedEntry(m => ({ ...m, notes: e.target.value }))}
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end pt-2 border-t border-(--color-border)">
                          <Button variant="secondary" size="sm" type="button" onClick={() => { setAddingRecord(false); setMedEntry({ diagnosis: '', treatment: '', notes: '' }) }}>
                            Cancel
                          </Button>
                          <Button size="sm" type="submit" disabled={savingRecord}>{savingRecord ? 'Saving...' : <><Save size={13} /> Save Record</>}</Button>
                        </div>
                      </form>
                    )}

                    {/* Records list */}
                    {!patient.medical_history?.length && !addingRecord ? (
                      <div className="py-16 text-center border border-dashed rounded-xl border-(--color-border)">
                        <History size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No medical records yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(patient.medical_history || []).map((rec, i) => (
                          <div key={i} className="p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-[10px] font-600 uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-brand)' }}>
                                  {rec.date ? format(new Date(rec.date), 'MMM d, yyyy') : '—'}
                                </p>
                                <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{rec.diagnosis}</p>
                              </div>
                            </div>
                            {rec.treatment && (
                              <div className="mt-2 p-3 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
                                <p className="text-[10px] font-600 uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Treatment</p>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{rec.treatment}</p>
                              </div>
                            )}
                            {rec.notes && (
                              <p className="text-xs mt-2 italic" style={{ color: 'var(--color-text-muted)' }}>{rec.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <div className="py-16 text-center border border-dashed rounded-xl border-(--color-border)">
                        <Activity size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No activity recorded yet.</p>
                      </div>
                    ) : activities.map((a, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="p-2 rounded-lg h-fit shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                          <Activity size={13} style={{ color: 'var(--color-brand)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{a.content}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Documents */}
                {activeTab === 'documents' && (
                  <div>
                    <div className="py-16 text-center border-2 border-dashed rounded-xl border-(--color-border) hover:border-(--color-brand) transition-colors cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-colors group-hover:bg-(--color-brand-50)" style={{ background: 'var(--color-surface-2)' }}>
                        <Plus size={22} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                      <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>Upload reports, prescriptions, or scan documents</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Coming soon</p>
                    </div>
                  </div>
                )}

              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Edit Patient modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Patient">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" value={editForm.first_name || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} required />
            <Input label="Last Name" value={editForm.last_name || ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Input label="Address" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Status</label>
            <div className="flex gap-2">
              {['Active', 'Inactive'].map(s => (
                <button key={s} type="button" onClick={() => setEditForm(f => ({ ...f, status: s }))}
                  className="flex-1 py-2 rounded-lg text-xs font-500 border transition-all"
                  style={editForm.status === s
                    ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                    : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                >{s}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
            <Button variant="secondary" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
