'use client'
import { useEffect, useState, use } from 'react'
import {
  ArrowLeft, Edit2, Phone, Mail, Calendar, Clock,
  FileText, History, Activity, Tag, Plus, Download,
  Stethoscope, Thermometer, ClipboardList
} from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Spinner, Avatar, Tag as TagComp, Textarea } from '@/components/ui'
import { getPatient, updatePatient, getActivities, createActivity } from '@/lib/supabase/queries'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

export default function PatientDetailPage({ params }) {
  const { id } = use(params)
  const [patient, setPatient] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [medicalModal, setMedicalModal] = useState(false)
  const [medicalEntry, setMedicalEntry] = useState({ diagnosis: '', treatment: '', notes: '' })

  const loadAll = async () => {
    setLoading(true)
    try {
      const [p, a] = await Promise.all([
        getPatient(id),
        getActivities('patient', id)
      ])
      setPatient(p)
      setActivities(a || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleAddMedical = async (e) => {
    e.preventDefault()
    if (!medicalEntry.diagnosis) return

    const newHistory = [
      { ...medicalEntry, date: new Date().toISOString() },
      ...(patient.medical_history || [])
    ]

    try {
      await updatePatient(id, { medical_history: newHistory })
      await createActivity({
        organization_id: '00000000-0000-0000-0000-000000000000',
        entity_type: 'patient',
        entity_id: id,
        type: 'note',
        content: `New medical record added: ${medicalEntry.diagnosis}`,
        created_by: null
      })
      await loadAll()
      setMedicalModal(false)
      setMedicalEntry({ diagnosis: '', treatment: '', notes: '' })
    } catch (e) { alert(e.message) }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Spinner size={32} />
      <p className="text-xs font-500 text-[var(--color-text-muted)]">Loading patient profile...</p>
    </div>
  )
  if (!patient) return <div className="p-12 text-center text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>Patient not found</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center gap-5">
          <Link href="/patients" className="p-2 rounded-xl bg-gray-50 border border-transparent hover:border-[var(--color-border)] transition-all">
            <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </Link>
          <div className="flex items-center gap-4">
            <Avatar name={`${patient.first_name} ${patient.last_name || ''}`} size="lg" />
            <div>
              <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                {patient.first_name} {patient.last_name || ''}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge>{patient.status}</Badge>
                <span className="text-[11px] font-600 text-[var(--color-text-muted)] uppercase tracking-wider">
                  {patient.gender} · {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm"><Download size={14} /> Reports</Button>
          <Button size="sm"><Edit2 size={14} /> Edit Profile</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Quick Info */}
        <div className="space-y-6">
          <Card className="p-5 border-[var(--color-border)]">
            <h3 className="text-[11px] font-700 uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 text-green-600"><Phone size={14} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-600 text-gray-400 uppercase">Phone</p>
                  <p className="text-sm font-600 text-[var(--color-text-primary)]">{patient.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Mail size={14} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-600 text-gray-400 uppercase">Email</p>
                  <p className="text-sm font-600 text-[var(--color-text-primary)] truncate">{patient.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><Calendar size={14} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-600 text-gray-400 uppercase">Registered</p>
                  <p className="text-sm font-600 text-[var(--color-text-primary)]">{format(new Date(patient.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-[var(--color-border)]">
            <h3 className="text-[11px] font-700 uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] font-700 text-gray-400 uppercase mb-1">Leads</p>
                <p className="text-xl font-800 text-[var(--color-text-primary)]">{patient.leads?.length || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] font-700 text-gray-400 uppercase mb-1">Visits</p>
                <p className="text-xl font-800 text-[var(--color-text-primary)]">{patient.appointments?.length || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex border-b border-[var(--color-border)]">
            {[
              { id: 'overview', label: 'Overview', icon: ClipboardList },
              { id: 'history', label: 'Medical History', icon: History },
              { id: 'timeline', label: 'Timeline', icon: Activity },
              { id: 'documents', label: 'Documents', icon: FileText },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-6 py-4 text-xs font-700 transition-all border-b-2',
                  activeTab === tab.id
                    ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 border-[var(--color-border)]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-700 text-[var(--color-text-primary)]">Latest Diagnosis</h3>
                    <Stethoscope size={16} className="text-[var(--color-brand)]" />
                  </div>
                  {patient.medical_history?.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-base font-700 text-[var(--color-brand)]">{patient.medical_history[0].diagnosis}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{patient.medical_history[0].treatment}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] italic">No medical records found.</p>
                  )}
                </Card>

                <Card className="p-5 border-[var(--color-border)]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-700 text-[var(--color-text-primary)]">Upcoming Appointment</h3>
                    <Calendar size={16} className="text-blue-500" />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] italic">No upcoming appointments scheduled.</p>
                </Card>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-700 text-[var(--color-text-primary)]">Medical Records</h3>
                  <Button size="sm" onClick={() => setMedicalModal(true)}><Plus size={14} /> Add Record</Button>
                </div>
                <div className="space-y-4">
                  {patient.medical_history?.map((record, i) => (
                    <Card key={i} className="p-5 border-[var(--color-border)] hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-700 text-[var(--color-brand)] uppercase tracking-widest">{format(new Date(record.date), 'MMM d, yyyy')}</p>
                          <h4 className="text-base font-800 text-[var(--color-text-primary)] mt-1">{record.diagnosis}</h4>
                        </div>
                        <Thermometer size={18} className="text-gray-300" />
                      </div>
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-white border border-gray-100 shadow-sm">
                          <p className="text-[10px] font-700 text-gray-400 uppercase mb-1">Treatment Plan</p>
                          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{record.treatment}</p>
                        </div>
                        {record.notes && (
                          <p className="text-xs text-[var(--color-text-muted)] italic">Note: {record.notes}</p>
                        )}
                      </div>
                    </Card>
                  ))}
                  {(!patient.medical_history || patient.medical_history.length === 0) && (
                    <div className="py-20 text-center border border-dashed rounded-2xl bg-gray-50/30">
                      <p className="text-sm font-500 text-[var(--color-text-muted)]">No medical history recorded for this patient.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-6 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-px before:bg-gray-100">
                {activities.map((a, i) => (
                  <div key={i} className="relative z-10 flex gap-4 bg-white pl-2 py-1">
                    <div className="p-2 rounded-xl bg-[var(--color-brand-50)] h-fit border border-white shadow-sm">
                      <Activity size={14} className="text-[var(--color-brand)]" />
                    </div>
                    <div>
                      <p className="text-sm font-600 text-[var(--color-text-primary)]">{a.content}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1 uppercase font-700 tracking-wider">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-50)] transition-all group">
                  <div className="p-4 rounded-full bg-gray-50 group-hover:bg-white mb-3 transition-all">
                    <Plus size={24} className="text-gray-400 group-hover:text-[var(--color-brand)]" />
                  </div>
                  <p className="text-xs font-700 text-gray-400 group-hover:text-[var(--color-brand)]">Upload Reports</p>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={medicalModal} onClose={() => setMedicalModal(false)} title="Add Medical Record">
        <form onSubmit={handleAddMedical} className="space-y-4">
          <Input
            label="Diagnosis / Reason for Visit *"
            placeholder="e.g. Annual Checkup, Dental Extraction"
            value={medicalEntry.diagnosis}
            onChange={e => setMedicalEntry(m => ({ ...m, diagnosis: e.target.value }))}
            required
          />
          <Textarea
            label="Treatment / Prescription *"
            placeholder="Describe the treatment or prescribed medications..."
            value={medicalEntry.treatment}
            onChange={e => setMedicalEntry(m => ({ ...m, treatment: e.target.value }))}
            required
            rows={4}
          />
          <Textarea
            label="Additional Notes"
            placeholder="Any other observations..."
            value={medicalEntry.notes}
            onChange={e => setMedicalEntry(m => ({ ...m, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setMedicalModal(false)} type="button">Cancel</Button>
            <Button type="submit">Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
