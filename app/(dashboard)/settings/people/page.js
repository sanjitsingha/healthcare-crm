'use client'
import { useState } from 'react'
import { Users, Plus, Trash2, X } from 'lucide-react'
import { Button, Card, Input, Avatar } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'

export default function PeoplePage() {
  const { org, orgId } = useOrg()
  const [staff, setStaff] = useState(() => org?.settings?.staff_members || [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', designation: '' })
  const [saving, setSaving] = useState(false)

  const resetForm = () => { setForm({ name: '', designation: '' }); setShowForm(false) }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !orgId) return
    setSaving(true)
    const newMember = { id: crypto.randomUUID(), name: form.name.trim(), designation: form.designation.trim() }
    const updated = [...staff, newMember]
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), staff_members: updated } })
      setStaff(updated)
      resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this team member?')) return
    const updated = staff.filter(m => m.id !== id)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), staff_members: updated } })
      setStaff(updated)
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Users size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Team Members</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Staff and team members in your organization</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add Member
            </Button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleAdd}
            className="flex items-end gap-3 mb-4 p-4 rounded-xl border border-(--color-border)"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <div className="flex-1">
              <Input
                label="Full Name *"
                placeholder="Dr. Ramesh Kumar"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex-1">
              <Input
                label="Designation"
                placeholder="General Physician"
                value={form.designation}
                onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
                {saving ? 'Adding...' : 'Add'}
              </Button>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
              >
                <X size={15} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
          </form>
        )}

        {staff.length === 0 && !showForm ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No team members added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {staff.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-(--color-border) group"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <Avatar name={m.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{m.name}</p>
                  {m.designation && <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{m.designation}</p>}
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
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
