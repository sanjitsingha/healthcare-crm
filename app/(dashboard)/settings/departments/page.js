'use client'
import { useState } from 'react'
import { Network, Plus, Trash2, X, Edit2 } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { logAudit, AUDIT } from '@/lib/audit'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'

const EMPTY_FORM = { name: '', description: '' }

export default function DepartmentsPage() {
  const { org, orgId } = useOrg()
  const [departments, setDepartments] = useState(() => org?.settings?.departments || [])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false) }
  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (d) => { setForm({ name: d.name || '', description: d.description || '' }); setEditingId(d.id); setShowForm(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !orgId) return
    setSaving(true)
    const payload = { name: form.name.trim(), description: form.description.trim() }
    const updated = editingId
      ? departments.map(d => d.id === editingId ? { ...d, ...payload } : d)
      : [...departments, { id: crypto.randomUUID(), ...payload }]
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), departments: updated } })
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `${editingId ? 'Updated' : 'Added'} department: ${payload.name}`, metadata: { name: payload.name } })
      setDepartments(updated); resetForm()
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const ok = await showConfirm({ title: 'Remove this department?', confirmLabel: 'Remove' })
    if (!ok) return
    const dept = departments.find(d => d.id === id)
    const updated = departments.filter(d => d.id !== id)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), departments: updated } })
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `Department removed: ${dept?.name || id}`, metadata: { name: dept?.name } })
      setDepartments(updated)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Network size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Departments</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>The departments or units in your clinic or hospital</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={openAdd}>
              <Plus size={15} /> Add Department
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Department Name *" placeholder="Cardiology" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <Input label="Short description" placeholder="Heart care & diagnostics" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
              <Button variant="secondary" size="sm" type="button" onClick={resetForm}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Department'}
              </Button>
            </div>
          </form>
        )}

        {departments.length === 0 && !showForm ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <Network size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No departments added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {departments.map(d => (
              <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-(--color-border) group" style={{ background: 'var(--color-surface-2)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                  <Network size={14} style={{ color: 'var(--color-brand)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{d.name}</p>
                  {d.description && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{d.description}</p>}
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
