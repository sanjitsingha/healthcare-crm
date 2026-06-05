'use client'
import { useState } from 'react'
import { LayoutTemplate, Plus, X, RotateCcw } from 'lucide-react'
import GridLayout, { useContainerWidth } from 'react-grid-layout'
import { Button, Card } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import {
  GRID_COLS, GRID_ROW_H, availableBlocks, blockSize, defaultGrid, isModuleKey, isGridLayout,
} from '@/lib/leadLayout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// Only Lead is wired today; others are placeholders for the future.
const PAGE_TABS = [
  { id: 'lead',      label: 'Lead Page',      enabled: true },
  { id: 'patient',   label: 'Patient Page',   enabled: false },
  { id: 'dashboard', label: 'Dashboard',      enabled: false },
]

export default function LayoutBuilderPage() {
  const { org, orgId } = useOrg()
  const [page, setPage] = useState('lead')

  const leadModules = (org?.settings?.modules || []).filter(m => m.page === 'leads' && m.active)
  const allBlocks = availableBlocks(leadModules)
  const labelFor = (key) => allBlocks.find(b => b.key === key)?.label
    || (isModuleKey(key) ? 'Custom module (removed)' : key)

  // Layout state: array of { i, x, y, w, h }
  const [layout, setLayout] = useState(() => {
    const saved = org?.settings?.lead_layout
    return isGridLayout(saved) ? saved.map(b => ({ i: b.key, x: b.x, y: b.y, w: b.w, h: b.h })) : []
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [dirty, setDirty] = useState(false)
  const { width, containerRef, mounted } = useContainerWidth()

  const placed = new Set(layout.map(l => l.i))
  const unused = allBlocks.filter(b => !placed.has(b.key))

  const onLayoutChange = (next) => {
    // Keep our `i` keys; RGL returns the same items.
    setLayout(next.map(n => ({ i: n.i, x: n.x, y: n.y, w: n.w, h: n.h })))
    setDirty(true)
  }
  const addBlock = (key) => {
    const { w, h } = blockSize(key)
    setLayout(prev => [...prev, { i: key, x: 0, y: Infinity, w, h }])
    setDirty(true)
  }
  const removeBlock = (key) => { setLayout(prev => prev.filter(l => l.i !== key)); setDirty(true) }
  const loadDefault = () => {
    setLayout(defaultGrid(leadModules).map(b => ({ i: b.key, x: b.x, y: b.y, w: b.w, h: b.h })))
    setDirty(true)
  }
  const clearAll = () => { setLayout([]); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const lead_layout = layout.map(l => ({ key: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), lead_layout } })
      setSavedAt(Date.now()); setDirty(false)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <LayoutTemplate size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Layout Builder</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Drag sections onto the canvas, move and resize them on the grid.
                {saving ? ' · Saving…' : dirty ? ' · Unsaved changes' : savedAt ? ' · Saved' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadDefault}><RotateCcw size={13} /> Default</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>

        {/* Page target tabs */}
        <div className="flex gap-1.5 mb-4">
          {PAGE_TABS.map(t => (
            <button key={t.id} type="button" disabled={!t.enabled} onClick={() => t.enabled && setPage(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-600 transition-all disabled:cursor-not-allowed"
              style={page === t.id
                ? { background: 'var(--color-brand)', color: 'white' }
                : { background: 'var(--color-surface-2)', color: t.enabled ? 'var(--color-text-secondary)' : 'var(--color-text-muted)', opacity: t.enabled ? 1 : 0.5 }}>
              {t.label}{!t.enabled && ' · soon'}
            </button>
          ))}
        </div>

        {/* Palette */}
        <div className="mb-3">
          <p className="text-xs font-600 mb-2" style={{ color: 'var(--color-text-secondary)' }}>Available sections</p>
          {unused.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>All sections are on the canvas.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unused.map(b => (
                <button key={b.key} type="button" onClick={() => addBlock(b.key)}
                  className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-dashed transition-colors hover:bg-(--color-brand-50)"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <Plus size={13} /> {b.label}
                  {isModuleKey(b.key) && <span className="text-[9px] font-700 px-1 rounded uppercase" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>module</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Canvas */}
        {layout.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed rounded-xl border-(--color-border)">
            <LayoutTemplate size={30} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Empty canvas — add sections above, or click Default.</p>
          </div>
        ) : (
          <div ref={containerRef} className="rounded-xl border border-(--color-border) p-2 lb-canvas" style={{ background: 'var(--color-surface-2)' }}>
            {mounted && (
            <GridLayout
              className="layout"
              width={width}
              layout={layout}
              cols={GRID_COLS}
              rowHeight={GRID_ROW_H}
              margin={[12, 12]}
              containerPadding={[8, 8]}
              compactType="vertical"
              draggableHandle=".lb-handle"
              onLayoutChange={onLayoutChange}
            >
              {layout.map(item => (
                <div key={item.i} className="rounded-lg border overflow-hidden flex flex-col"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-brand)' }}>
                  <div className="lb-handle flex items-center justify-between px-2.5 py-1.5 cursor-move"
                    style={{ background: 'var(--color-brand-50)' }}>
                    <span className="text-[11px] font-700 truncate" style={{ color: 'var(--color-brand)' }}>
                      {labelFor(item.i)}
                    </span>
                    <button type="button" onClick={() => removeBlock(item.i)} className="shrink-0 opacity-60 hover:opacity-100" style={{ color: 'var(--color-brand)' }}>
                      <X size={13} />
                    </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {item.w}×{item.h}
                  </div>
                </div>
              ))}
            </GridLayout>
            )}
          </div>
        )}

        {layout.length > 0 && (
          <div className="flex justify-end mt-2">
            <button type="button" onClick={clearAll} className="text-[11px] font-600 hover:underline" style={{ color: 'var(--color-text-muted)' }}>Clear canvas</button>
          </div>
        )}

        <p className="text-[11px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
          Tip: drag the colored header to move a section; drag its bottom-right corner to resize. Changes apply to the live lead page after you Save (reload an open lead to see it).
        </p>
      </Card>
    </div>
  )
}
