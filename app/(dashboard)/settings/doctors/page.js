'use client'
import { useState } from 'react'
import { Stethoscope, Plus, Trash2, X } from 'lucide-react'
import { Button, Card, Input, Avatar } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { logAudit, AUDIT } from '@/lib/audit'

export default function DoctorsPage() {
  const { org, orgId } = useOrg()
  const [doctors,  setDoctors]  = useState(() => org?.settings?.doctors || [])
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ name: '', department: '', qualification: '' })
  const [saving,   setSaving]   = useState(false)

  const resetForm = () => { setForm({ name: '', department: '', qualification: '' }); setShowForm(false) }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !orgId) return
    setSaving(true)
    const newDoc = {
      id:            crypto.randomUUID(),
      name:          form.name.trim(),
      department:    form.department.trim(),
      qualification: form.qualification.trim(),
    }
    const updated = [...doctors, newDoc]
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), doctors: updated } })
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `Doctor added: ${newDoc.name}`, metadata: { name: newDoc.name, department: newDoc.department } })
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
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Medical staff with department and qualification details</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add Doctor
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="mb-4 p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Full Name *"
                placeholder="Dr. Priya Sharma"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label="Department"
                placeholder="Cardiology"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
              <Input
                label="Qualification"
                placeholder="MBBS, MD"
                value={form.qualification}
                onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
              <Button variant="secondary" size="sm" type="button" onClick={resetForm}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
                {saving ? 'Adding...' : 'Add Doctor'}
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
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-(--color-border) group" style={{ background: 'var(--color-surface-2)' }}>
                <Avatar name={d.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{d.name}</p>
                    {d.department && (
                      <span
                        className="text-[10px] font-600 px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                      >
                        {d.department}
                      </span>
                    )}
                  </div>
                  {d.qualification && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{d.qualification}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
