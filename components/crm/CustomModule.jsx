'use client'
import { useState } from 'react'
import { Edit2 } from 'lucide-react'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'

// Renders one custom-module field input based on its configured type.
export function CustomFieldInput({ field, value, onChange }) {
  if (field.type === 'textarea')
    return <Textarea label={field.label} value={value || ''} onChange={e => onChange(e.target.value)} rows={2} />
  if (field.type === 'select') {
    const opts = (field.options || '').split(',').map(s => s.trim()).filter(Boolean)
    return (
      <Select label={field.label} value={value || ''} onChange={e => onChange(e.target.value)}
        options={[{ value: '', label: 'Select...' }, ...opts.map(o => ({ value: o, label: o }))]} />
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

// A custom-module card: view saved values, or edit + save them.
// `data` is the per-module values object; `onSave(values)` persists it.
export function CustomModuleCard({ module, data, onSave }) {
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
