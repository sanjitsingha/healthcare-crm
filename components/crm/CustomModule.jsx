'use client'
import { useEffect, useMemo, useState } from 'react'
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

// A custom-module card: fields are always editable; a Save bar appears only
// when there are unsaved changes. `data` is the per-module values object;
// `onSave(values)` persists it.
export function CustomModuleCard({ module, data, onSave }) {
  const [values, setValues] = useState({ ...data })
  const [saving, setSaving] = useState(false)

  // Re-sync from props only when the *saved* content changes (not on every
  // parent re-render), so typing isn't wiped out.
  const dataKey = JSON.stringify(data || {})
  useEffect(() => { setValues({ ...(data || {}) }) }, [dataKey])

  const dirty = useMemo(
    () => module.fields.some(f => (values[f.id] ?? '') !== (data?.[f.id] ?? '')),
    [values, data, module.fields],
  )

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(values) }
    catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Card className="p-5 border-(--color-border)">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{module.name}</p>
        {dirty && <span className="text-[10px] font-600" style={{ color: 'var(--color-brand)' }}>Unsaved</span>}
      </div>

      <div className="space-y-3">
        {module.fields.map(f => (
          <CustomFieldInput key={f.id} field={f} value={values[f.id]} onChange={v => setValues(p => ({ ...p, [f.id]: v }))} />
        ))}
      </div>

      {dirty && (
        <div className="flex gap-2 justify-end pt-3 mt-3 border-t border-(--color-border)">
          <Button variant="secondary" size="sm" type="button" onClick={() => setValues({ ...(data || {}) })}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      )}
    </Card>
  )
}
