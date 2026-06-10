'use client'
import { useRef, useState } from 'react'
import { LayoutGrid, Plus, Trash2, X, Save, GripVertical, Layers } from 'lucide-react'
import { Button, Card, Input, Select, Switch } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { logAudit, AUDIT } from '@/lib/audit'

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
  { value: 'leads',    label: 'Leads' },
  { value: 'patients', label: 'Patients' },
]

const blankField   = () => ({ id: crypto.randomUUID(), label: '', type: 'text', required: false, options: '' })
const blankSlot    = () => ({ kind: 'field', ...blankField() })
const makeGroup    = (a, b) => ({ kind: 'group', id: crypto.randomUUID(), children: [a, b] })
const slotId       = s => s.id  // groups have their own id; field slots use field id
const cloneRows    = rows => rows.map(row => row.map(s =>
  s.kind === 'group' ? { ...s, children: s.children.map(c => ({ ...c })) } : { ...s }
))

// Stored: { fields: [{id,label,...}], layout: [[{kind,id}|{kind:'group',id,children:[id,...]}]] }
// Editor: rows = [[slot]] where slot = {kind:'field',id,label,...} | {kind:'group',id,children:[{kind:'field',...}]}
function toRows(fields = [], layout) {
  const map = Object.fromEntries(fields.map(f => [f.id, f]))
  if (!layout?.length) return fields.map(f => [{ kind: 'field', ...f }])
  return layout.map(rowDef =>
    rowDef.map(s => {
      if (typeof s === 'string') return map[s] ? { kind: 'field', ...map[s] } : null
      if (!s.kind || s.kind === 'field') return map[s.id] ? { kind: 'field', ...map[s.id] } : null
      if (s.kind === 'group') {
        const children = (s.children || []).map(id => map[id] ? { kind: 'field', ...map[id] } : null).filter(Boolean)
        return children.length ? { kind: 'group', id: s.id, children } : null
      }
      return null
    }).filter(Boolean)
  ).filter(r => r.length > 0)
}

function fromRows(rows) {
  const fields = []
  const layout = rows.map(row => row.map(s => {
    if (s.kind === 'field') { const { kind, ...f } = s; fields.push(f); return { kind: 'field', id: f.id } }
    if (s.kind === 'group') {
      const children = s.children.map(c => { const { kind, ...f } = c; fields.push(f); return f.id })
      return { kind: 'group', id: s.id, children }
    }
  }))
  return { fields, layout }
}

// ── Compact field card (inside a group) ───────────────────────
function ChildCard({ f, gRi, gCi, idx, dragging, childOver, ctx, onUpdate, onRemove }) {
  const isMe = dragging?.kind === 'child' && dragging.ri === gRi && dragging.ci === gCi && dragging.idx === idx
  const isOver = childOver?.ri === gRi && childOver?.ci === gCi && childOver?.idx === idx
  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); ctx.startChild(e, gRi, gCi, idx) }}
      onDragEnd={ctx.end}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); ctx.overChild(gRi, gCi, idx) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); ctx.dropChild(gRi, gCi, idx) }}
      className="p-2.5 space-y-2 transition-all"
      style={{ opacity: isMe ? 0.3 : 1, background: isOver ? 'var(--color-brand-50)' : 'transparent' }}
    >
      <div className="flex items-center gap-1">
        <GripVertical size={11} style={{ color: 'var(--color-text-muted)', cursor: 'grab' }} className="shrink-0" />
        <span className="flex-1 text-[9px] font-600" style={{ color: 'var(--color-text-muted)' }}>Stacked field</span>
        <button type="button" onClick={onRemove} className="p-0.5 rounded hover:bg-red-50 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <X size={11} />
        </button>
      </div>
      <Input label="Label" placeholder="Field name" value={f.label} onChange={e => onUpdate('label', e.target.value)} />
      <Select label="Type" value={f.type} onChange={e => onUpdate('type', e.target.value)} options={FIELD_TYPES} />
      {f.type === 'select' && (
        <Input label="Options (comma-sep)" placeholder="A, B, C" value={f.options} onChange={e => onUpdate('options', e.target.value)} />
      )}
      <div className="flex items-center gap-2">
        <Switch size="sm" checked={f.required} onChange={() => onUpdate('required', !f.required)} />
        <span className="text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Required</span>
      </div>
    </div>
  )
}

// ── Slot wrapper — handles left/right/into drop zones ─────────
function SlotWrapper({ ri, ci, rowLen, isDragging, overZone, ctx, children }) {
  const W = { 1: 'Full width', 2: '½ width', 3: '⅓ width' }
  return (
    <div className="flex-1 rounded-xl border flex flex-col transition-all relative overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        borderColor: overZone === 'into' ? 'var(--color-brand)' : overZone ? 'var(--color-brand)' : 'var(--color-border)',
        boxShadow: overZone === 'into' ? '0 0 0 2px var(--color-brand-50)' : 'none',
        opacity: isDragging ? 0.3 : 1,
        minWidth: 0,
      }}
      onDragOver={e => { e.preventDefault(); ctx.overSlot(e, ri, ci) }}
      onDrop={e => { e.preventDefault(); ctx.dropSlot(ri, ci) }}
    >
      {overZone === 'left'  && <div className="absolute left-0 inset-y-0 w-1 z-10 rounded-l" style={{ background: 'var(--color-brand)' }} />}
      {overZone === 'right' && <div className="absolute right-0 inset-y-0 w-1 z-10 rounded-r" style={{ background: 'var(--color-brand)' }} />}
      {children}
    </div>
  )
}

// ── Field slot content ─────────────────────────────────────────
function FieldSlotContent({ slot, ri, ci, rowLen, overZone, ctx, onChange, onRemove }) {
  const W = { 1: 'Full width', 2: '½ width', 3: '⅓ width' }
  return (
    <>
      <div
        draggable
        onDragStart={e => ctx.startSlot(e, ri, ci)}
        onDragEnd={ctx.end}
        className="flex items-center gap-1.5 px-2.5 py-2 border-b border-(--color-border) cursor-grab"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <GripVertical size={13} style={{ color: 'var(--color-text-muted)' }} />
        <span className="flex-1 text-center text-[9px] font-700 px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
          {W[rowLen]}{overZone === 'into' ? ' · merge ↓' : ''}
        </span>
        <button type="button" onClick={onRemove} className="p-0.5 rounded hover:bg-red-50 transition-colors shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          <X size={12} />
        </button>
      </div>
      <div className="p-2.5 space-y-2 flex-1">
        <Input label="Label" placeholder="Field name" value={slot.label} onChange={e => onChange('label', e.target.value)} />
        <Select label="Type" value={slot.type} onChange={e => onChange('type', e.target.value)} options={FIELD_TYPES} />
        {slot.type === 'select' && (
          <Input label="Options (comma-sep)" placeholder="A, B, C" value={slot.options} onChange={e => onChange('options', e.target.value)} />
        )}
        <div className="flex items-center gap-2 pt-0.5">
          <Switch size="sm" checked={slot.required} onChange={() => onChange('required', !slot.required)} />
          <span className="text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>Required</span>
        </div>
      </div>
      {overZone === 'into' && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none"
          style={{ background: 'color-mix(in srgb, var(--color-brand) 8%, transparent)' }}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-700"
            style={{ background: 'var(--color-brand)', color: 'white' }}>
            <Layers size={10} /> Stack into container
          </div>
        </div>
      )}
    </>
  )
}

// ── Group slot content ─────────────────────────────────────────
function GroupSlotContent({ slot, ri, ci, rowLen, ctx, onUpdateChild, onRemoveChild, onAddChild, onRemove }) {
  const W = { 1: 'Full width', 2: '½ width', 3: '⅓ width' }
  const { dragging, childOver } = ctx
  return (
    <>
      {/* Group header — drag handle for whole group */}
      <div
        draggable
        onDragStart={e => ctx.startSlot(e, ri, ci)}
        onDragEnd={ctx.end}
        className="flex items-center gap-1.5 px-2.5 py-2 border-b border-(--color-border) cursor-grab"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <GripVertical size={13} style={{ color: 'var(--color-text-muted)' }} />
        <Layers size={11} style={{ color: 'var(--color-brand)' }} />
        <span className="flex-1 text-center text-[9px] font-700 px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
          {W[rowLen]} · {slot.children.length} stacked
        </span>
        <button type="button" onClick={onAddChild} title="Add field to group"
          className="p-0.5 rounded hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-brand)' }}>
          <Plus size={12} />
        </button>
        <button type="button" onClick={onRemove} className="p-0.5 rounded hover:bg-red-50 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <X size={12} />
        </button>
      </div>
      {/* Stacked child fields */}
      <div className="divide-y divide-(--color-border) flex-1">
        {slot.children.map((c, idx) => (
          <ChildCard key={c.id} f={c} gRi={ri} gCi={ci} idx={idx}
            dragging={dragging} childOver={childOver} ctx={ctx}
            onUpdate={(k, v) => onUpdateChild(idx, k, v)}
            onRemove={() => onRemoveChild(idx)}
          />
        ))}
      </div>
    </>
  )
}

// ── Gap zone ───────────────────────────────────────────────────
function GapZone({ gapIdx, visible, isOver, ctx }) {
  if (!visible) return <div className="h-1" />
  return (
    <div onDragOver={e => { e.preventDefault(); e.stopPropagation(); ctx.overGap(gapIdx) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); ctx.dropGap(gapIdx) }}
      className="flex items-center gap-2 px-1 transition-all" style={{ height: isOver ? 28 : 14 }}>
      <div className="flex-1 rounded-full transition-all"
        style={{ height: isOver ? 3 : 2, background: isOver ? 'var(--color-brand)' : 'var(--color-border)', opacity: isOver ? 1 : 0.4 }} />
      {isOver && <span className="text-[9px] font-700 px-2 py-0.5 rounded-full shrink-0"
        style={{ background: 'var(--color-brand)', color: 'white' }}>New row</span>}
      <div className="flex-1 rounded-full transition-all"
        style={{ height: isOver ? 3 : 2, background: isOver ? 'var(--color-brand)' : 'var(--color-border)', opacity: isOver ? 1 : 0.4 }} />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function ModulesPage() {
  const { org, orgId } = useOrg()
  const [modules,   setModules]   = useState(() => org?.settings?.modules || [])
  const [showForm,  setShowForm]  = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formName,  setFormName]  = useState('')
  const [formPage,  setFormPage]  = useState('leads')
  const [rows,      setRows]      = useState([])
  const [saving,    setSaving]    = useState(false)

  // DnD refs + state
  const dragRef    = useRef(null)   // { kind:'slot'|'child', ri, ci, idx? }
  const overRef    = useRef(null)   // { ri, ci, zone } | { gap: number }
  const [dragging,  setDragging]  = useState(null)
  const [over,      setOver_]     = useState(null)
  const [childOver, setChildOver] = useState(null)
  const setOver = v => { overRef.current = v; setOver_(v) }
  const resetDrag = () => { dragRef.current = null; setDragging(null); setOver(null); setChildOver(null) }

  // ── Persistence ────────────────────────────────────────────────
  const persist = async updated => {
    await updateOrganization(orgId, { settings: { ...(org?.settings || {}), modules: updated } })
    setModules(updated)
  }
  const handleToggle = id => {
    const m = modules.find(mod => mod.id === id)
    const next = !m?.active
    persist(modules.map(mod => mod.id === id ? { ...mod, active: next } : mod))
    logAudit({ action: AUDIT.MODULE_CHANGE, description: `Module "${m?.name}" ${next ? 'activated' : 'deactivated'}`, metadata: { module_id: id, module_name: m?.name, active: next } })
  }
  const handleDelete = async id => {
    if (!confirm("Delete this module? Saved data will remain but won't be shown.")) return
    const m = modules.find(mod => mod.id === id)
    await persist(modules.filter(mod => mod.id !== id))
    logAudit({ action: AUDIT.MODULE_CHANGE, description: `Deleted module "${m?.name}"`, metadata: { module_id: id, module_name: m?.name, page: m?.page } })
  }

  // ── Form open/close ────────────────────────────────────────────
  const startCreate = () => { setEditingId(null); setFormName(''); setFormPage('leads'); setRows([]); setShowForm(true) }
  const startEdit   = m  => { setEditingId(m.id); setFormName(m.name); setFormPage(m.page); setRows(toRows(m.fields, m.layout)); setShowForm(true) }
  const cancelForm  = () => { setShowForm(false); setEditingId(null); setRows([]) }

  // ── Row/slot helpers ───────────────────────────────────────────
  const addSlot = () => setRows(r => [...r, [blankSlot()]])

  const removeSlot = (ri, ci) => setRows(prev => {
    const next = cloneRows(prev)
    next[ri].splice(ci, 1)
    if (next[ri].length === 0) next.splice(ri, 1)
    return next
  })

  const updateSlot = (ri, ci, key, val) => setRows(prev =>
    prev.map((row, r) => r !== ri ? row : row.map((s, c) => c !== ci ? s : { ...s, [key]: val }))
  )

  const addChildToGroup = (ri, ci) => setRows(prev => {
    const next = cloneRows(prev)
    next[ri][ci].children.push({ kind: 'field', ...blankField() })
    return next
  })

  const updateGroupChild = (ri, ci, idx, key, val) => setRows(prev => {
    const next = cloneRows(prev)
    next[ri][ci].children[idx] = { ...next[ri][ci].children[idx], [key]: val }
    return next
  })

  const removeGroupChild = (ri, ci, idx) => setRows(prev => {
    const next = cloneRows(prev)
    const group = next[ri][ci]
    group.children.splice(idx, 1)
    if (group.children.length === 0) {
      next[ri].splice(ci, 1)
      if (next[ri].length === 0) next.splice(ri, 1)
    } else if (group.children.length === 1) {
      // Unwrap single-child group to field slot
      const { kind: _, ...f } = group.children[0]
      next[ri][ci] = { kind: 'field', ...f }
    }
    return next
  })

  // ── DnD: slot-level drag ───────────────────────────────────────
  const startSlot = (e, ri, ci) => {
    e.stopPropagation()
    dragRef.current = { kind: 'slot', ri, ci }
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => setDragging({ kind: 'slot', ri, ci }))
  }

  // ── DnD: child drag (field inside group) ──────────────────────
  const startChild = (e, ri, ci, idx) => {
    e.stopPropagation()
    dragRef.current = { kind: 'child', ri, ci, idx }
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => setDragging({ kind: 'child', ri, ci, idx }))
  }

  // ── DnD: over slot — compute left/right/into from mouse X ─────
  const overSlot = (e, ri, ci) => {
    e.preventDefault(); e.stopPropagation()
    if (!dragRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    let zone = pct < 0.22 ? 'left' : pct > 0.78 ? 'right' : 'into'
    // Can't add more slots beside if row is full (unless same row reorder)
    if ((zone === 'left' || zone === 'right') && rows[ri]?.length >= 3 && dragRef.current.ri !== ri) zone = 'into'
    e.dataTransfer.dropEffect = 'move'
    setOver({ ri, ci, zone })
  }

  // ── DnD: drop on slot ─────────────────────────────────────────
  const dropSlot = (ri, ci) => {
    const src  = dragRef.current
    const zone = overRef.current?.zone
    if (!src || !zone) { resetDrag(); return }

    setRows(prev => {
      const next = cloneRows(prev)
      const targetSlot = next[ri]?.[ci]
      if (!targetSlot) return prev
      const tid = slotId(targetSlot)

      // ── Extract dragged item ──
      let dragged
      if (src.kind === 'slot') {
        dragged = next[src.ri][src.ci]
        next[src.ri].splice(src.ci, 1)
        if (next[src.ri].length === 0) next.splice(src.ri, 1)
      } else {
        // child being dragged out of group
        const grp = next[src.ri][src.ci]
        const [child] = grp.children.splice(src.idx, 1)
        dragged = { kind: 'field', ...child }
        if (grp.children.length === 0) {
          next[src.ri].splice(src.ci, 1)
          if (next[src.ri].length === 0) next.splice(src.ri, 1)
        } else if (grp.children.length === 1) {
          const { kind: _, ...f } = grp.children[0]
          next[src.ri][src.ci] = { kind: 'field', ...f }
        }
      }

      // ── Re-find target by ID (index may have shifted) ──
      let tRi = -1, tCi = -1
      outer: for (let r = 0; r < next.length; r++) {
        for (let c = 0; c < next[r].length; c++) {
          if (slotId(next[r][c]) === tid) { tRi = r; tCi = c; break outer }
        }
      }
      if (tRi === -1) { next.push([dragged]); return next }

      const tSlot = next[tRi][tCi]

      if (zone === 'left' || zone === 'right') {
        const at = zone === 'left' ? tCi : tCi + 1
        if (next[tRi].length < 3) next[tRi].splice(at, 0, dragged)
        else next.splice(zone === 'left' ? tRi : tRi + 1, 0, [dragged])
      } else {
        // 'into'
        if (dragged.kind === 'group') {
          // Can't nest groups — insert beside instead
          if (next[tRi].length < 3) next[tRi].splice(tCi + 1, 0, dragged)
          else next.splice(tRi + 1, 0, [dragged])
        } else if (tSlot.kind === 'group') {
          tSlot.children.push(dragged)
        } else {
          // Both fields → create container
          next[tRi][tCi] = makeGroup(tSlot, dragged)
        }
      }

      return next
    })

    resetDrag()
  }

  // ── DnD: over/drop child within group ─────────────────────────
  const overChild = (ri, ci, idx) => {
    setChildOver({ ri, ci, idx })
    setOver({ ri, ci, zone: 'into' })
  }

  const dropChild = (gRi, gCi, targetIdx) => {
    const src = dragRef.current
    if (!src) { resetDrag(); return }

    setRows(prev => {
      const next = cloneRows(prev)

      if (src.kind === 'child' && src.ri === gRi && src.ci === gCi) {
        // Reorder within same group
        const grp = next[gRi][gCi]
        const [child] = grp.children.splice(src.idx, 1)
        grp.children.splice(targetIdx > src.idx ? targetIdx - 1 : targetIdx, 0, child)
      } else if (src.kind === 'slot') {
        // Dropping a whole field slot into the group
        const srcSlot = next[src.ri][src.ci]
        if (srcSlot.kind !== 'field') return prev
        next[src.ri].splice(src.ci, 1)
        if (next[src.ri].length === 0) next.splice(src.ri, 1)
        // Adjust group indices if source row was before it
        let tRi = gRi, tCi = gCi
        if (src.ri < gRi || (src.ri === gRi && src.ci < gCi)) {
          if (next[tRi - (src.ri < gRi ? 1 : 0)]) { tRi = src.ri < gRi ? gRi - 1 : gRi }
        }
        const g = next[tRi]?.[tCi] || next[gRi]?.[gCi]
        if (g?.kind === 'group') g.children.splice(targetIdx, 0, srcSlot)
      } else if (src.kind === 'child') {
        // From another group
        const srcGrp = next[src.ri][src.ci]
        if (srcGrp?.kind !== 'group') return prev
        const [child] = srcGrp.children.splice(src.idx, 1)
        if (srcGrp.children.length === 0) {
          next[src.ri].splice(src.ci, 1)
          if (next[src.ri].length === 0) next.splice(src.ri, 1)
        } else if (srcGrp.children.length === 1) {
          const { kind: _, ...f } = srcGrp.children[0]
          next[src.ri][src.ci] = { kind: 'field', ...f }
        }
        const g = next[gRi]?.[gCi]
        if (g?.kind === 'group') g.children.splice(targetIdx, 0, child)
      }

      return next
    })

    resetDrag()
  }

  // ── DnD: gap zone ─────────────────────────────────────────────
  const overGap = gapIdx => { if (dragRef.current) setOver({ gap: gapIdx }) }

  const dropGap = gapIdx => {
    const src = dragRef.current
    if (!src) { resetDrag(); return }

    setRows(prev => {
      const next = cloneRows(prev)
      let dragged
      let insertAt = gapIdx

      if (src.kind === 'slot') {
        dragged = next[src.ri][src.ci]
        next[src.ri].splice(src.ci, 1)
        if (next[src.ri].length === 0) { next.splice(src.ri, 1); if (src.ri < insertAt) insertAt-- }
      } else {
        const grp = next[src.ri][src.ci]
        const [child] = grp.children.splice(src.idx, 1)
        dragged = { kind: 'field', ...child }
        if (grp.children.length === 0) {
          next[src.ri].splice(src.ci, 1)
          if (next[src.ri].length === 0) { next.splice(src.ri, 1); if (src.ri < insertAt) insertAt-- }
        } else if (grp.children.length === 1) {
          const { kind: _, ...f } = grp.children[0]
          next[src.ri][src.ci] = { kind: 'field', ...f }
        }
      }

      next.splice(insertAt, 0, [dragged])
      return next
    })

    resetDrag()
  }

  // ── DnD context object passed to components ────────────────────
  const ctx = {
    dragging, over, childOver,
    startSlot, startChild, end: resetDrag,
    overSlot, dropSlot,
    overChild, dropChild, setChildOver,
    overGap, dropGap,
  }

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = async e => {
    e?.preventDefault()
    const validRows = rows
      .map(row => row.map(s => {
        if (s.kind === 'field') return s.label.trim() ? s : null
        if (s.kind === 'group') {
          const ch = s.children.filter(c => c.label.trim())
          return ch.length ? { ...s, children: ch } : null
        }
        return null
      }).filter(Boolean))
      .filter(r => r.length > 0)

    if (!formName.trim() || validRows.length === 0) {
      alert('Module name and at least one labelled field are required.')
      return
    }
    setSaving(true)
    try {
      const { fields, layout } = fromRows(validRows)
      const mod = {
        id:     editingId || crypto.randomUUID(),
        name:   formName.trim(),
        page:   formPage,
        active: editingId ? (modules.find(m => m.id === editingId)?.active ?? true) : true,
        fields,
        layout,
      }
      const isEdit = !!editingId
      await persist(isEdit ? modules.map(m => m.id === editingId ? mod : m) : [...modules, mod])
      logAudit({
        action: AUDIT.MODULE_CHANGE,
        description: isEdit ? `Updated module "${mod.name}"` : `Created module "${mod.name}"`,
        metadata: { module_id: mod.id, module_name: mod.name, page: mod.page, field_count: fields.length },
      })
      cancelForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const isDragging = !!dragging

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {/* Header */}
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
          {!showForm && <Button size="sm" onClick={startCreate}><Plus size={15} /> Create Module</Button>}
        </div>

        {/* ── Editor form ────────────────────────────────────── */}
        {showForm && (
          <form onSubmit={handleSave} className="mb-5 p-4 rounded-xl border border-(--color-border) space-y-4"
            style={{ background: 'var(--color-surface-2)' }}>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Input label="Module Name *" placeholder="e.g. Insurance Details, Vitals"
                  value={formName} onChange={e => setFormName(e.target.value)} required />
              </div>
              <div className="space-y-1.5 shrink-0">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>For Page</label>
                <div className="flex rounded-lg overflow-hidden border border-(--color-border)">
                  {PAGE_OPTS.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setFormPage(value)}
                      className="px-4 py-2 text-xs font-600 transition-all"
                      style={formPage === value ? { background: 'var(--color-brand)', color: 'white' }
                        : { color: 'var(--color-text-muted)', background: 'transparent' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field canvas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>Fields</span>
                  <span className="ml-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    Drag beside = share row · Drag onto center = stack into container
                  </span>
                </div>
                <button type="button" onClick={addSlot}
                  className="flex items-center gap-1 text-xs font-600 hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-brand)' }}>
                  <Plus size={13} /> Add Field
                </button>
              </div>

              {rows.length === 0 ? (
                <div className="py-8 text-center border border-dashed rounded-xl border-(--color-border)">
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No fields yet — click "Add Field" above.</p>
                </div>
              ) : (
                <div onDragOver={e => e.preventDefault()}>
                  <GapZone gapIdx={0} visible={isDragging} isOver={over?.gap === 0} ctx={ctx} />

                  {rows.map((row, ri) => (
                    <div key={`row-${ri}`}>
                      <div className="flex gap-2 items-stretch">
                        {row.map((slot, ci) => {
                          const isMe = dragging?.kind === 'slot' && dragging.ri === ri && dragging.ci === ci
                          const oz = (over?.ri === ri && over?.ci === ci) ? over.zone : null
                          return (
                            <SlotWrapper key={slot.id} ri={ri} ci={ci} rowLen={row.length}
                              isDragging={isMe} overZone={oz} ctx={ctx}>
                              {slot.kind === 'field' ? (
                                <FieldSlotContent slot={slot} ri={ri} ci={ci} rowLen={row.length}
                                  overZone={oz} ctx={ctx}
                                  onChange={(k, v) => updateSlot(ri, ci, k, v)}
                                  onRemove={() => removeSlot(ri, ci)} />
                              ) : (
                                <GroupSlotContent slot={slot} ri={ri} ci={ci} rowLen={row.length}
                                  ctx={ctx}
                                  onUpdateChild={(idx, k, v) => updateGroupChild(ri, ci, idx, k, v)}
                                  onRemoveChild={idx => removeGroupChild(ri, ci, idx)}
                                  onAddChild={() => addChildToGroup(ri, ci)}
                                  onRemove={() => removeSlot(ri, ci)} />
                              )}
                            </SlotWrapper>
                          )
                        })}

                        {/* Inline slot: visible when row has room and something is being dragged from a different row */}
                        {isDragging && row.length < 3 && dragging?.ri !== ri && (
                          <div className="flex-1 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all"
                            style={{
                              borderColor: over?.type === 'inline' && over?.ri === ri ? 'var(--color-brand)' : 'var(--color-border)',
                              background:  over?.type === 'inline' && over?.ri === ri ? 'var(--color-brand-50)' : 'transparent',
                              minHeight: 80, minWidth: 0,
                            }}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver({ type: 'inline', ri }) }}
                            onDragLeave={() => setOver(null)}
                            onDrop={e => {
                              e.preventDefault(); e.stopPropagation()
                              const src = dragRef.current
                              if (!src) return
                              setRows(prev => {
                                const next = cloneRows(prev)
                                let dragged, insertRi = ri
                                if (src.kind === 'slot') {
                                  dragged = next[src.ri][src.ci]
                                  next[src.ri].splice(src.ci, 1)
                                  if (next[src.ri].length === 0) { next.splice(src.ri, 1); if (src.ri < insertRi) insertRi-- }
                                } else {
                                  const grp = next[src.ri][src.ci]
                                  const [child] = grp.children.splice(src.idx, 1)
                                  dragged = { kind: 'field', ...child }
                                  if (grp.children.length === 0) {
                                    next[src.ri].splice(src.ci, 1)
                                    if (next[src.ri].length === 0) { next.splice(src.ri, 1); if (src.ri < insertRi) insertRi-- }
                                  } else if (grp.children.length === 1) {
                                    const { kind: _, ...f } = grp.children[0]
                                    next[src.ri][src.ci] = { kind: 'field', ...f }
                                  }
                                }
                                next[insertRi]?.push(dragged)
                                return next
                              })
                              resetDrag()
                            }}>
                            <Plus size={14} style={{ color: 'var(--color-brand)', opacity: 0.7 }} />
                            <span className="text-[9px] font-700 text-center leading-tight" style={{ color: 'var(--color-brand)', opacity: 0.8 }}>
                              Drop beside<br />
                              <span className="font-400">{row.length === 1 ? '½ each' : '⅓ each'}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <GapZone gapIdx={ri + 1} visible={isDragging} isOver={over?.gap === ri + 1} ctx={ctx} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
              <Button variant="secondary" type="button" onClick={cancelForm}>Cancel</Button>
              <Button type="submit" disabled={saving || !formName.trim() || rows.length === 0}>
                {saving ? 'Saving…' : editingId ? 'Update Module' : 'Save Module'}
              </Button>
            </div>
          </form>
        )}

        {/* ── Module list ─────────────────────────────────────── */}
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
                    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{m.page}</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {m.fields.length} field{m.fields.length !== 1 ? 's' : ''}
                      {m.layout && ` · ${m.layout.length} row${m.layout.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch size="sm" checked={m.active} onChange={() => handleToggle(m.id)} />
                    <span className="text-xs font-600" style={{ color: m.active ? '#16a34a' : 'var(--color-text-muted)' }}>
                      {m.active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      <Save size={13} />
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Layout preview: show rows with group containers */}
                <div className="px-4 py-3 space-y-1.5">
                  {m.layout?.length ? (
                    m.layout.map((rowDef, ri) => {
                      const fieldMap = Object.fromEntries(m.fields.map(f => [f.id, f]))
                      return (
                        <div key={ri} className="flex gap-1.5">
                          {rowDef.map((slotDef, ci) => {
                            if (!slotDef.kind || slotDef.kind === 'field') {
                              const f = fieldMap[slotDef.id || slotDef]
                              if (!f) return null
                              return (
                                <span key={ci} className="flex-1 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-(--color-border)"
                                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
                                  {f.label}
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-600" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                                    {FIELD_TYPES.find(t => t.value === f.type)?.label}
                                  </span>
                                  {f.required && <span className="text-red-400 text-[10px]">*</span>}
                                </span>
                              )
                            }
                            if (slotDef.kind === 'group') {
                              const kids = (slotDef.children || []).map(id => fieldMap[id]).filter(Boolean)
                              return (
                                <div key={ci} className="flex-1 rounded-lg border border-(--color-border) overflow-hidden"
                                  style={{ background: 'var(--color-surface)' }}>
                                  <div className="flex items-center gap-1 px-2 py-0.5 border-b border-(--color-border)"
                                    style={{ background: 'var(--color-brand-50)' }}>
                                    <Layers size={9} style={{ color: 'var(--color-brand)' }} />
                                    <span className="text-[9px] font-600" style={{ color: 'var(--color-brand)' }}>
                                      {kids.length} stacked
                                    </span>
                                  </div>
                                  <div className="px-2 py-1 space-y-0.5">
                                    {kids.map(f => (
                                      <div key={f.id} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                                        <span>{f.label}</span>
                                        <span className="text-[8px] px-1 py-0.5 rounded font-600" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                                          {FIELD_TYPES.find(t => t.value === f.type)?.label}
                                        </span>
                                        {f.required && <span className="text-red-400">*</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })}
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {m.fields.map(f => (
                        <span key={f.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-(--color-border)"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
                          {f.label}
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-600" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                            {FIELD_TYPES.find(t => t.value === f.type)?.label}
                          </span>
                          {f.required && <span className="text-red-400 text-[10px]">*</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
