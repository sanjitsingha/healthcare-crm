'use client'
import { useState } from 'react'
import {
  LayoutGrid, Plus, Trash2, X, Save,
  GripVertical, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { Button, Card, Input, Select } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'

const FIELD_TYPES = [
  { value: 'text',     label: 'Text' },
  { value: 'number',   label: 'Number' },
  { value: 'date',     label: 'Date' },
  { value: 'phone',    label: 'Phone' },
  { value: 'email',    label: 'Email' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'boolean',  label: 'Yes / No' },
]

const PAGE_OPTS = [
  { value: 'patients', label: 'Patients' },
]

const blankForm = () => ({ name: '', page: 'leads', fields: [] })
const blankField = () => ({ id: crypto.randomUUID(), label: '', type: 'text', required: false, options: '' })

export default function ModulesPage() {
  const { org, orgId } = useOrg()
  const [modules, setModules] = useState(() => org?.settings?.modules || [])
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(blankForm())
  const [saving, setSaving]       = useState(false)

  const persist = async (updated) => {
    await updateOrganization(orgId, { settings: { ...(org?.settings || {}), modules: updated } })
    setModules(updated)
  }

  const handleToggle = async (id) => {
    await persist(modules.map(m => m.id === id ? { ...m, active: !m.active } : m))
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this module? Custom data already saved will remain but won\'t be shown.')) return
    await persist(modules.filter(m => m.id !== id))
  }

  const startCreate = () => { setEditingId(null); setForm(blankForm()); setShowForm(true) }
  const startEdit   = (m) => { setEditingId(m.id); setForm({ name: m.name, page: m.page, fields: m.fields.map(f => ({ ...f })) }); setShowForm(true) }
  const cancelForm  = () => { setShowForm(false); setEditingId(null); setForm(blankForm()) }

  const addField    = () => setForm(f => ({ ...f, fields: [...f.fields, blankField()] }))
  const removeField = (fid) => setForm(f => ({ ...f, fields: f.fields.filter(x => x.id !== fid) }))
  const setField    = (fid, key, val) => setForm(f => ({
    ...f,
    fields: f.fields.map(x => x.id === fid ? { ...x, [key]: val } : x),
  }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || form.fields.length === 0) return
    setSaving(true)
    try {
      const validFields = form.fields.filter(f => f.label.trim())
      if (!validFields.length) { alert('Add at least one field with a label.'); setSaving(false); return }
      const mod = {
        id:     editingId || crypto.randomUUID(),
        name:   form.name.trim(),
        page:   form.page,
        active: editingId ? (modules.find(m => m.id === editingId)?.active ?? true) : true,
        fields: validFields,
      }
      await persist(editingId
        ? modules.map(m => m.id === editingId ? mod : m)
        : [...modules, mod]
      )
      cancelForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <LayoutGrid size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Custom Modules</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Add custom sections and fields to Leads or Patients pages</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={startCreate}><Plus size={15} /> Create Module</Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="mb-5 p-4 rounded-xl border border-(--color-border) space-y-4" style={{ background: 'var(--color-surface-2)' }}>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Input
                  label="Module Name *"
                  placeholder="e.g. Insurance Details, Vitals, Emergency Contact"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5 shrink-0">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>For Page</label>
                <div className="flex rounded-lg overflow-hidden border border-(--color-border)">
                  {PAGE_OPTS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, page: value }))}
                      className="px-4 py-2 text-xs font-600 transition-all"
                      style={form.page === value
                        ? { background: 'var(--color-brand)', color: 'white' }
                        : { color: 'var(--color-text-muted)', background: 'transparent' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>Fields</label>
                <button type="button" onClick={addField} className="flex items-center gap-1 text-xs font-600 transition-opacity hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
                  <Plus size={13} /> Add Field
                </button>
              </div>

              {form.fields.length === 0 ? (
                <div className="py-6 text-center border border-dashed rounded-lg border-(--color-border)">
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No fields yet. Click "Add Field" above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.fields.map(field => (
                    <div key={field.id} className="flex items-end gap-2 p-3 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
                      <GripVertical size={14} className="mb-2 shrink-0 opacity-30" />
                      <div className="flex-1">
                        <Input
                          label="Label"
                          placeholder="Field name"
                          value={field.label}
                          onChange={e => setField(field.id, 'label', e.target.value)}
                        />
                      </div>
                      <div className="w-36">
                        <Select
                          label="Type"
                          value={field.type}
                          onChange={e => setField(field.id, 'type', e.target.value)}
                          options={FIELD_TYPES}
                        />
                      </div>
                      {field.type === 'select' && (
                        <div className="flex-1">
                          <Input
                            label="Options (comma separated)"
                            placeholder="Option A, Option B, Option C"
                            value={field.options}
                            onChange={e => setField(field.id, 'options', e.target.value)}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                        <label className="text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Required</label>
                        <button
                          type="button"
                          onClick={() => setField(field.id, 'required', !field.required)}
                          style={{ color: field.required ? 'var(--color-brand)' : 'var(--color-text-muted)' }}
                        >
                          {field.required ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </div>
                      <button type="button" onClick={() => removeField(field.id)} className="mb-1.5 shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
              <Button variant="secondary" type="button" onClick={cancelForm}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name.trim() || form.fields.length === 0}>
                {saving ? 'Saving...' : editingId ? 'Update Module' : 'Save Module'}
              </Button>
            </div>
          </form>
        )}

        {modules.length === 0 && !showForm ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <LayoutGrid size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No modules yet. Create one to add custom fields to Leads or Patients.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map(m => (
              <div key={m.id} className="rounded-xl border border-(--color-border) overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--color-surface-2)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{m.name}</span>
                    <span
                      className="text-[10px] font-600 px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                    >
                      {m.page}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{m.fields.length} field{m.fields.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(m.id)}
                      className="flex items-center gap-1.5 text-xs font-600 px-2.5 py-1 rounded-full border transition-all"
                      style={m.active
                        ? { background: '#dcfce7', color: '#16a34a', borderColor: '#bbf7d0' }
                        : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                    >
                      {m.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {m.active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      <Save size={13} />
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {m.fields.map(f => (
                    <span key={f.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-(--color-border)" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
                      {f.label}
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-600" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                        {FIELD_TYPES.find(t => t.value === f.type)?.label || f.type}
                      </span>
                      {f.required && <span className="text-red-400 text-[10px]">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
