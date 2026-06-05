'use client'
import { useState } from 'react'
import { LayoutTemplate, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { LEAD_BLOCKS, WIDTH_OPTIONS, availableBlocks, isModuleKey } from '@/lib/leadLayout'

const DEFAULT_ROWS = [
  { key: 'profile',      width: 'third' },
  { key: 'info',         width: 'third' },
  { key: 'notes',        width: 'third' },
  { key: 'activity',     width: 'half' },
  { key: 'appointments', width: 'half' },
  { key: 'followups',    width: 'full' },
]

export default function LeadLayoutPage() {
  const { org, orgId } = useOrg()
  const leadModules = (org?.settings?.modules || []).filter(m => m.page === 'leads' && m.active)
  const allBlocks = availableBlocks(leadModules)
  const labelFor = (key) => allBlocks.find(b => b.key === key)?.label
    || (isModuleKey(key) ? 'Custom module (removed)' : key)

  const [rows, setRows] = useState(() => org?.settings?.lead_layout || [])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [dirty, setDirty] = useState(false)

  const used = new Set(rows.map(r => r.key))
  const unused = allBlocks.filter(b => !used.has(b.key))

  const mark = (next) => { setRows(next); setDirty(true) }
  const addRow    = (key) => mark([...rows, { key, width: 'full' }])
  const removeRow = (i)   => mark(rows.filter((_, idx) => idx !== i))
  const setWidth  = (i, width) => mark(rows.map((r, idx) => idx === i ? { ...r, width } : r))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]; [next[i], next[j]] = [next[j], next[i]]; mark(next)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), lead_layout: rows } })
      setSavedAt(Date.now()); setDirty(false)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }
  const useDefault = () => mark(DEFAULT_ROWS.filter(r => allBlocks.some(b => b.key === r.key)))
  const clearAll   = () => mark([])

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <LayoutTemplate size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Lead Page Layout</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Choose which sections appear on the lead page, their order, and width.
                {saving ? ' · Saving…' : dirty ? ' · Unsaved changes' : savedAt ? ' · Saved' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={useDefault}><RotateCcw size={13} /> Default</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>

        {rows.length === 0 && (
          <p className="text-[11px] mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            No custom layout yet — the lead page uses the default arrangement. Add sections below (or click Default) to start customizing.
          </p>
        )}

        {/* Layout rows */}
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={`${row.key}-${i}`} className="flex items-center gap-2 p-2.5 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
              <GripVertical size={14} className="shrink-0 opacity-30" />
              <span className="flex-1 min-w-0 text-sm font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>
                {labelFor(row.key)}
                {isModuleKey(row.key) && (
                  <span className="ml-2 text-[9px] font-700 px-1.5 py-0.5 rounded uppercase" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>module</span>
                )}
              </span>
              <div className="flex rounded-lg overflow-hidden border border-(--color-border) shrink-0">
                {WIDTH_OPTIONS.map(w => (
                  <button key={w.value} type="button" onClick={() => setWidth(i, w.value)}
                    className="px-2.5 py-1 text-[11px] font-600 transition-all"
                    style={row.width === w.value
                      ? { background: 'var(--color-brand)', color: 'white' }
                      : { color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}>
                    {w.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-25" style={{ color: 'var(--color-text-muted)' }}><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="p-1 disabled:opacity-25" style={{ color: 'var(--color-text-muted)' }}><ArrowDown size={14} /></button>
              <button type="button" onClick={() => removeRow(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {rows.length > 0 && (
          <div className="flex justify-end mt-2">
            <button type="button" onClick={clearAll} className="text-[11px] font-600 hover:underline" style={{ color: 'var(--color-text-muted)' }}>Clear all</button>
          </div>
        )}

        {/* Available blocks */}
        <div className="mt-5 pt-4 border-t border-(--color-border)">
          <p className="text-xs font-600 mb-2" style={{ color: 'var(--color-text-secondary)' }}>Add a section</p>
          {unused.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>All available sections are in the layout.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unused.map(b => (
                <button key={b.key} type="button" onClick={() => addRow(b.key)}
                  className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-dashed transition-colors hover:bg-(--color-brand-50)"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <Plus size={13} /> {b.label}
                  {isModuleKey(b.key) && <span className="text-[9px] font-700 px-1 rounded uppercase" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>module</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
