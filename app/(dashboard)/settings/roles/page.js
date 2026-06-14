'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, Plus, Trash2, Save, X, Check, ChevronRight, Edit2, AlertCircle,
} from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { showConfirm } from '@/lib/confirm'

const PERMISSION_GROUPS = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard',     label: 'Dashboard' },
      { key: 'notifications', label: 'Notifications' },
      { key: 'reports',       label: 'Reports' },
    ],
  },
  {
    label: 'Leads',
    items: [
      { key: 'leads',        label: 'View Leads' },
      { key: 'leads.create', label: 'Create' },
      { key: 'leads.edit',   label: 'Edit' },
      { key: 'leads.delete', label: 'Delete' },
      { key: 'leads.import', label: 'Import' },
    ],
  },
  {
    label: 'Contacts',
    items: [
      { key: 'contacts',        label: 'View Contacts' },
      { key: 'contacts.create', label: 'Create' },
      { key: 'contacts.edit',   label: 'Edit' },
      { key: 'contacts.delete', label: 'Delete' },
      { key: 'organizations',   label: 'Organizations' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { key: 'patients',        label: 'View Patients' },
      { key: 'patients.create', label: 'Create' },
      { key: 'patients.edit',   label: 'Edit' },
      { key: 'patients.delete', label: 'Delete' },
    ],
  },
  {
    label: 'Appointments',
    items: [
      { key: 'appointments',        label: 'View Appointments' },
      { key: 'appointments.create', label: 'Create' },
      { key: 'appointments.edit',   label: 'Edit' },
      { key: 'appointments.delete', label: 'Delete' },
    ],
  },
  {
    label: 'Consultations',
    items: [
      { key: 'consultations',        label: 'View Consultations' },
      { key: 'consultations.create', label: 'Create' },
      { key: 'consultations.edit',   label: 'Edit' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'tasks',   label: 'Tasks' },
      { key: 'billing', label: 'Billing & Finance' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { key: 'automation', label: 'Automation' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { key: 'settings',               label: 'Access Settings' },
      { key: 'settings.organization',  label: 'Organization' },
      { key: 'settings.users',         label: 'Users' },
      { key: 'settings.roles',         label: 'Roles' },
      { key: 'settings.doctors',       label: 'Doctors' },
      { key: 'settings.departments',   label: 'Departments' },
      { key: 'settings.tags',          label: 'Tags' },
      { key: 'settings.modules',       label: 'Modules' },
      { key: 'settings.services',      label: 'Services' },
      { key: 'settings.rules',         label: 'Rules' },
      { key: 'settings.configuration', label: 'Configuration' },
      { key: 'settings.logs',          label: 'Logs' },
    ],
  },
]

const ALL_PERM_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key))

function PermissionToggle({ permKey, label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(permKey)}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-500 transition-all border"
      style={checked
        ? { background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }
        : { background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
    >
      <span
        className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
        style={checked
          ? { background: 'var(--color-brand)' }
          : { background: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}
      >
        {checked && <Check size={8} className="text-white" />}
      </span>
      {label}
    </button>
  )
}

export default function RolesPage() {
  const { orgId } = useOrg()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  const fetchRoles = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/roles?orgId=${orgId}`)
      const data = await res.json()
      if (data.roles) {
        setRoles(data.roles)
        if (!selectedId && data.roles.length > 0) setSelectedId(data.roles[0].id)
      }
    } finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  useEffect(() => {
    const role = roles.find(r => r.id === selectedId)
    if (role) {
      setEditing({ id: role.id, name: role.name, description: role.description || '', permissions: new Set(role.permissions) })
      setError('')
      setSaveOk(false)
    }
  }, [selectedId, roles])

  const togglePerm = (key) => {
    setEditing(prev => {
      const perms = new Set(prev.permissions)
      perms.has(key) ? perms.delete(key) : perms.add(key)
      return { ...prev, permissions: perms }
    })
    setSaveOk(false)
  }

  const toggleGroup = (groupItems) => {
    const keys = groupItems.map(i => i.key)
    setEditing(prev => {
      const perms = new Set(prev.permissions)
      const allOn = keys.every(k => perms.has(k))
      keys.forEach(k => allOn ? perms.delete(k) : perms.add(k))
      return { ...prev, permissions: perms }
    })
    setSaveOk(false)
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.name.trim()) { setError('Role name is required'); return }
    setSaving(true); setError(''); setSaveOk(false)
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roleId: editing.id,
          name: editing.name,
          description: editing.description,
          permissions: [...editing.permissions],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setRoles(prev => prev.map(r => r.id === editing.id
        ? { ...r, name: editing.name, description: editing.description, permissions: [...editing.permissions] }
        : r
      ))
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2000)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editing) return
    const ok = await showConfirm({ title: `Delete role "${editing.name}"?`, message: 'This cannot be undone.', confirmLabel: 'Delete role' })
    if (!ok) return
    setDeleting(true); setError('')
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roleId: editing.id, orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      const remaining = roles.filter(r => r.id !== editing.id)
      setRoles(remaining)
      setSelectedId(remaining[0]?.id || null)
      setEditing(null)
    } catch (err) { setError(err.message) }
    finally { setDeleting(false) }
  }

  const handleCreate = async () => {
    if (!createForm.name.trim()) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orgId,
          name: createForm.name.trim(),
          description: createForm.description.trim(),
          permissions: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      const newRole = { ...data.role, permissions: [] }
      setRoles(prev => [...prev, newRole].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedId(newRole.id)
      setShowCreate(false)
      setCreateForm({ name: '', description: '' })
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 rounded bg-(--color-border)" />
            <div className="h-4 w-48 rounded bg-(--color-border)" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Role Management</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Create roles and assign granular permissions — down to individual actions like Create, Edit, Delete.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => { setShowCreate(true); setError('') }}>
            <Plus size={14} /> New Role
          </Button>
        </div>

        {showCreate && (
          <div className="mt-4 p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Create New Role</p>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-(--color-brand-50)">
                <X size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Role Name *" placeholder="e.g. Receptionist"
                value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Description" placeholder="Brief description"
                value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" disabled={!createForm.name.trim() || saving} onClick={handleCreate}>
                <Plus size={13} /> {saving ? 'Creating…' : 'Create Role'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {roles.length > 0 ? (
        <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
          {/* Role list */}
          <Card className="p-2 sticky top-0">
            <div className="space-y-0.5">
              {roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all"
                  style={selectedId === role.id
                    ? { background: 'var(--color-brand)', color: 'white' }
                    : { color: 'var(--color-text-secondary)' }}
                >
                  <ShieldCheck size={13} />
                  <span className="flex-1 font-500 truncate text-xs">{role.name}</span>
                  <span
                    className="text-[10px] font-700 px-1.5 py-0.5 rounded-full shrink-0"
                    style={selectedId === role.id
                      ? { background: 'rgba(255,255,255,0.25)', color: 'white' }
                      : { background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                  >
                    {role.permissions.length}
                  </span>
                  {selectedId === role.id && <ChevronRight size={12} />}
                </button>
              ))}
            </div>
          </Card>

          {/* Permission editor */}
          {editing && (
            <Card className="p-5 space-y-5">
              {/* Name + description */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Edit2 size={13} style={{ color: 'var(--color-brand)' }} />
                  <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Role Details</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Role Name *" value={editing.name}
                    onChange={e => { setEditing(p => ({ ...p, name: e.target.value })); setSaveOk(false) }} />
                  <Input label="Description" value={editing.description} placeholder="What does this role do?"
                    onChange={e => { setEditing(p => ({ ...p, description: e.target.value })); setSaveOk(false) }} />
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Permissions</p>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      className="text-[11px] font-500 px-2.5 py-1 rounded-lg border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onClick={() => { setEditing(p => ({ ...p, permissions: new Set(ALL_PERM_KEYS) })); setSaveOk(false) }}>
                      Select All
                    </button>
                    <button type="button"
                      className="text-[11px] font-500 px-2.5 py-1 rounded-lg border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onClick={() => { setEditing(p => ({ ...p, permissions: new Set() })); setSaveOk(false) }}>
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  {PERMISSION_GROUPS.map(group => {
                    const allOn = group.items.every(i => editing.permissions.has(i.key))
                    const someOn = group.items.some(i => editing.permissions.has(i.key))
                    return (
                      <div key={group.label} className="p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                        {/* Group header with toggle-all */}
                        <div className="flex items-center gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.items)}
                            className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                            style={allOn
                              ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' }
                              : someOn
                                ? { background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }
                                : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                          >
                            {allOn && <Check size={9} className="text-white" />}
                            {!allOn && someOn && <span className="w-2 h-0.5 rounded-full" style={{ background: 'var(--color-brand)' }} />}
                          </button>
                          <p className="text-[11px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                            {group.label}
                          </p>
                          <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                            {group.items.filter(i => editing.permissions.has(i.key)).length}/{group.items.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map(item => (
                            <PermissionToggle
                              key={item.key}
                              permKey={item.key}
                              label={item.label}
                              checked={editing.permissions.has(item.key)}
                              onChange={togglePerm}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-500" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                  <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}
              {saveOk && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-500" style={{ background: '#dcfce7', color: '#15803d' }}>
                  <Check size={13} /> Role saved successfully
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-(--color-border)">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 text-xs font-500 px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {deleting ? 'Deleting…' : 'Delete Role'}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {editing.permissions.size} / {ALL_PERM_KEYS.length} permissions
                  </span>
                  <Button size="sm" disabled={saving} onClick={handleSave}>
                    <Save size={13} />
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <ShieldCheck size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No roles yet. Create your first role above.</p>
        </Card>
      )}
    </div>
  )
}
