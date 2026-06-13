'use client'
import { useState } from 'react'
import { Stethoscope, Plus, Trash2, X, Edit2, Clock, IndianRupee } from 'lucide-react'
import { Button, Card, Input, Textarea, Avatar } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { logAudit, AUDIT } from '@/lib/audit'

const EMPTY_FORM = { name: '', department: '', qualification: '', description: '', timing: '', fee: '' }

export default function DoctorsPage() {
  const { org, orgId } = useOrg()
  const [doctors,  setDoctors]  = useState(() => org?.settings?.doctors || [])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false) }
  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (d) => {
    setForm({
      name: d.name || '', department: d.department || '', qualification: d.qualification || '',
      description: d.description || '', timing: d.timing || '', fee: d.fee ?? '',
    })
    setEditingId(d.id); setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !orgId) return
    setSaving(true)
    const payload = {
      name:          form.name.trim(),
      department:    form.department.trim(),
      qualification: form.qualification.trim(),
      description:   form.description.trim(),
      timing:        form.timing.trim(),
      fee:           form.fee === '' ? null : Number(form.fee),
    }
    const updated = editingId
      ? doctors.map(d => d.id === editingId ? { ...d, ...payload } : d)
      : [...doctors, { id: crypto.randomUUID(), ...payload }]
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), doctors: updated } })
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `${editingId ? 'Updated' : 'Added'} doctor: ${payload.name}`, metadata: { name: payload.name, department: payload.department, fee: payload.fee } })
      setDoctors(updated); resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this doctor?')) return
    const doc = doctors.find(d => d.id === id)
    const updated = doctors.filter(d => d.id !== id)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), doctors: updated } })
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `Doctor removed: ${doc?.name || id}`, metadata: { name: doc?.name } })
      setDoctors(updated)
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Stethoscope size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Doctors</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Medical staff with department, timing, and consultation fees</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={openAdd}>
              <Plus size={15} /> Add Doctor
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Full Name *" placeholder="Dr. Priya Sharma" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <Input label="Department" placeholder="Cardiology" value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              <Input label="Qualification" placeholder="MBBS, MD" value={form.qualification}
                onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Timing" placeholder="Mon–Sat, 10:00 AM – 2:00 PM" value={form.timing}
                onChange={e => setForm(f => ({ ...f, timing: e.target.value }))} />
              <Input label="Consultation Fee (₹)" type="number" min="0" step="0.01" placeholder="500" value={form.fee}
                onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
            </div>
            <Textarea label="Description" placeholder="Brief note about the doctor, specialities, experience…" rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
              <Button variant="secondary" size="sm" type="button" onClick={resetForm}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Doctor'}
              </Button>
            </div>
          </form>
        )}

        {doctors.length === 0 && !showForm ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <Stethoscope size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No doctors added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {doctors.map(d => (
              <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-(--color-border) group" style={{ background: 'var(--color-surface-2)' }}>
                <Avatar name={d.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{d.name}</p>
                    {d.department && (
                      <span className="text-[10px] font-600 px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                        {d.department}
                      </span>
                    )}
                  </div>
                  {d.qualification && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{d.qualification}</p>}

                  {(d.timing || d.fee != null) && (
                    <div className="flex items-center gap-3 flex-wrap mt-1.5">
                      {d.timing && (
                        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                          <Clock size={11} style={{ color: 'var(--color-text-muted)' }} /> {d.timing}
                        </span>
                      )}
                      {d.fee != null && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-600" style={{ color: 'var(--color-text-secondary)' }}>
                          <IndianRupee size={11} style={{ color: 'var(--color-text-muted)' }} />{Number(d.fee).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {d.description && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{d.description}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEdit(d)} title="Edit" className="p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(d.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
