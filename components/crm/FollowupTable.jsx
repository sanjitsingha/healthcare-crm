'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Search, Trash2, ArrowUpDown, X } from 'lucide-react'

// Shared spreadsheet-style follow-up table (used on lead + patient pages).

// ── Date helpers ─────────────────────────────────────────────────────────────
const toDisplayDate = (raw) => {
  if (!raw) return ''
  const d = new Date(String(raw).includes('T') ? raw : raw + 'T12:00:00')
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

// ── Outcome color coding ──────────────────────────────────────────────────────
const OUT_GREEN = { bg: '#dcfce7', color: '#15803d' }
const OUT_RED   = { bg: '#fee2e2', color: '#b91c1c' }
const OUT_BLUE  = { bg: '#dbeafe', color: '#1d4ed8' }
const OUT_AMBER = { bg: '#fef3c7', color: '#b45309' }
function outcomeStyle(o) {
  if (!o) return null
  const s = String(o).toLowerCase()
  if (s.includes('callback')) return OUT_BLUE
  if (s.includes('not interested') || s.includes('wrong number') || s.includes('bounced') || s.includes('not on whatsapp')) return OUT_RED
  if (s.includes('interested')) return OUT_GREEN
  return OUT_AMBER
}

const FU_SORTERS = {
  added:          (a, b) => new Date(a.created_at) - new Date(b.created_at),
  modified_desc:  (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at),
  modified_asc:   (a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at),
  scheduled_desc: (a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at),
  scheduled_asc:  (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at),
}

// ── ChipCell ─────────────────────────────────────────────────────────────────
// Google-Sheets-style chip dropdown; menu is fixed-positioned and flips up near screen bottom.
export function ChipCell({ value, options, onChange, placeholder = '—', styleFor }) {
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220, maxH: 260 })
  const s = value && styleFor ? styleFor(value) : null
  const filtered = options.filter(o => String(o).toLowerCase().includes(query.toLowerCase()))

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const estH = Math.min((options.length || 1) * 32 + 52, 300)
      const below = window.innerHeight - r.bottom
      const openUp = below < estH && r.top > below
      const width = Math.min(Math.max(r.width, 280), window.innerWidth - 16)
      const left = Math.min(r.left, Math.max(8, window.innerWidth - width - 8))
      setPos({
        top: openUp ? Math.max(8, r.top - estH - 4) : r.bottom + 4,
        left,
        width,
        maxH: openUp ? Math.min(estH, r.top - 12) : Math.min(estH, below - 12),
      })
    }
    setQuery('')
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onScroll = (e) => { if (menuRef.current && menuRef.current.contains(e.target)) return; setOpen(false) }
    const onResize = () => setOpen(false)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onResize) }
  }, [open])

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => open ? setOpen(false) : openMenu()}
        className="w-full h-full min-h-11 flex items-center justify-between gap-1 px-2.5 py-1.5 text-left hover:bg-(--color-surface-2) transition-colors outline-none"
        style={{ boxShadow: open ? 'inset 0 0 0 2px var(--color-brand)' : 'none' }}>
        {value
          ? <span className="text-[13px] font-600 px-2 py-0.5 rounded-md whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ lineHeight: '22px', ...(s ? { background: s.bg, color: s.color } : { background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }) }}>{value}</span>
          : <span className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>{placeholder}</span>}
        <ChevronDown size={13} className="shrink-0 opacity-40" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={menuRef} className="fixed z-50 flex flex-col rounded-lg border border-(--color-border) overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div className="p-1.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-(--color-border) outline-none"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
              </div>
            </div>
            <div className="overflow-y-auto py-1 flex-1 min-h-0">
              {filtered.length === 0 && <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No matches</p>}
              {filtered.map(o => {
                const os = styleFor ? styleFor(o) : null
                return (
                  <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }}
                    className="w-full flex items-center px-2.5 py-2 text-left hover:bg-(--color-surface-2) transition-colors">
                    <span className="text-[13px] font-600 px-2 py-0.5 rounded-md"
                      style={os ? { background: os.bg, color: os.color } : { color: 'var(--color-text-primary)' }}>{o}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── TextCell ─────────────────────────────────────────────────────────────────
export function TextCell({ value, onCommit, placeholder = '—', type = 'text' }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => { setV(value ?? '') }, [value])
  const commit = () => { if ((v || '') !== (value || '')) onCommit(v) }
  return (
    <input value={v} type={type} placeholder={placeholder}
      onChange={e => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="w-full h-full min-h-11 px-2.5 py-2 text-[13px] bg-transparent outline-none focus:shadow-[inset_0_0_0_2px_var(--color-brand)]"
      style={{ color: 'var(--color-text-primary)' }}
    />
  )
}

// ── DateCell — shows dd/mm/yyyy, opens a custom calendar popover on click ──────
const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CAL_DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const toLocalDate = (raw) => {
  if (!raw) return null
  const d = new Date(String(raw).includes('T') ? raw : raw + 'T12:00:00')
  return isNaN(d.getTime()) ? null : d
}
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function DateCell({ value, onCommit, isIso = true }) {
  const btnRef = useRef(null)
  const popRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const selected = toLocalDate(value)
  const display = toDisplayDate(value)
  const [view, setView] = useState(() => {
    const base = selected || new Date()
    return { y: base.getFullYear(), m: base.getMonth() }
  })

  const CAL_W = 248, CAL_H = 312

  const openCal = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const below = window.innerHeight - r.bottom
      const openUp = below < CAL_H && r.top > below
      const left = Math.min(r.left, Math.max(8, window.innerWidth - CAL_W - 8))
      setPos({ top: openUp ? Math.max(8, r.top - CAL_H - 4) : r.bottom + 4, left })
    }
    const base = selected || new Date()
    setView({ y: base.getFullYear(), m: base.getMonth() })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onScroll = (e) => { if (popRef.current && popRef.current.contains(e.target)) return; setOpen(false) }
    const onResize = () => setOpen(false)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onResize) }
  }, [open])

  const emit = (d) => {
    if (!d) { onCommit(null); return }
    const pad = n => String(n).padStart(2, '0')
    const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    onCommit(isIso ? new Date(`${ymd}T12:00:00`).toISOString() : ymd)
  }
  const pick = (day) => { emit(new Date(view.y, view.m, day, 12, 0, 0)); setOpen(false) }
  const shiftMonth = (delta) => setView(({ y, m }) => {
    const nm = m + delta
    return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }
  })

  const today = new Date()
  const firstDow = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => open ? setOpen(false) : openCal()}
        className="w-full h-full min-h-11 flex items-center px-2.5 py-2 text-[13px] text-left hover:bg-(--color-surface-2) transition-colors outline-none"
        style={{ color: display ? 'var(--color-text-primary)' : 'var(--color-text-muted)', boxShadow: open ? 'inset 0 0 0 2px var(--color-brand)' : 'none' }}>
        {display || 'dd/mm/yyyy'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={popRef} className="fixed z-50 rounded-xl border border-(--color-border) p-2.5"
            style={{ top: pos.top, left: pos.left, width: CAL_W, background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <button type="button" onClick={() => shiftMonth(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-(--color-surface-2) transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}><ChevronLeft size={16} /></button>
              <span className="text-[13px] font-700" style={{ color: 'var(--color-text-primary)' }}>{CAL_MONTHS[view.m]} {view.y}</span>
              <button type="button" onClick={() => shiftMonth(1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-(--color-surface-2) transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {CAL_DOW.map(d => (
                <div key={d} className="h-6 flex items-center justify-center text-[10px] font-700 uppercase" style={{ color: 'var(--color-text-muted)' }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} className="h-8" />
                const d = new Date(view.y, view.m, day)
                const isSel = sameDay(d, selected)
                const isToday = sameDay(d, today)
                return (
                  <button key={i} type="button" onClick={() => pick(day)}
                    className="h-8 flex items-center justify-center text-[12px] rounded-lg transition-colors"
                    style={isSel
                      ? { background: 'var(--color-brand)', color: '#fff', fontWeight: 700 }
                      : { color: 'var(--color-text-primary)', fontWeight: isToday ? 700 : 400, boxShadow: isToday ? 'inset 0 0 0 1px var(--color-brand)' : 'none' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--color-surface-2)' }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                    {day}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-(--color-border)">
              <button type="button" onClick={() => { emit(null); setOpen(false) }}
                className="text-[12px] font-600 px-2 py-1 rounded-md hover:bg-(--color-surface-2) transition-colors"
                style={{ color: 'var(--color-text-muted)' }}>Clear</button>
              <button type="button" onClick={() => { emit(new Date()); setOpen(false) }}
                className="text-[12px] font-600 px-2 py-1 rounded-md hover:bg-(--color-surface-2) transition-colors"
                style={{ color: 'var(--color-brand)' }}>Today</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Layout constants ──────────────────────────────────────────────────────────
const FU_COLS = '140px 150px minmax(230px,1fr) 170px minmax(200px,1.2fr) 150px 140px'
const ACT_COL = '64px'
const GRID = 'var(--color-border)'
const cellBase = 'min-h-11 flex items-stretch'
const DEFAULT_STATUS_OPTS = ['Scheduled', 'Completed', 'Missed', 'Rescheduled']

// ── FollowupTable ─────────────────────────────────────────────────────────────
export default function FollowupTable({
  followups, staff, onField, onCreate, onDelete, onSortToggle,
  statusStyle, typeStyle, types, outcomeOptions, statusOptions,
  sort = 'added', addingRow = false, onAddingRowDone,
  // kept for backwards compat (no-op)
  showDraftRow: _unused,
}) {
  const showDelete = typeof onDelete === 'function'
  // Action column shows for both cases: delete icon on data rows, save/cancel on top row
  const cols = FU_COLS + ' ' + ACT_COL
  const minWidth = '1234px'
  const head = ['Date', 'Type', 'Outcome', 'Called By', 'Response', 'Status', 'Next Follow Up', '']

  const [topDraft, setTopDraft] = useState({})
  const [active, setActive] = useState(null)
  const wrapRef = useRef(null)
  const topRowRef = useRef(null)

  // Reset draft when the adding-row is toggled on
  useEffect(() => { if (addingRow) setTopDraft({}) }, [addingRow])

  // Clear active cell on outside click
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setActive(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Accumulate draft values — NO auto-create until the user clicks away
  const updateTopDraft = (patch) => setTopDraft(prev => ({ ...prev, ...patch }))

  const saveTopDraft = () => {
    if (Object.values(topDraft).some(v => v != null && v !== '')) {
      onCreate(topDraft)
    }
    setTopDraft({})
    onAddingRowDone?.()
  }

  const cancelTopDraft = () => {
    setTopDraft({})
    onAddingRowDone?.()
  }

  // Auto-save the new row when the user clicks outside it (no explicit ✓ needed)
  const saveRef = useRef(saveTopDraft)
  useEffect(() => { saveRef.current = saveTopDraft })
  useEffect(() => {
    if (!addingRow) return
    const h = (e) => { if (topRowRef.current && !topRowRef.current.contains(e.target)) saveRef.current() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [addingRow])

  const sorted = [...followups].sort(FU_SORTERS[sort] || FU_SORTERS.added)
  const resolvedStatusOpts = statusOptions?.length ? statusOptions : DEFAULT_STATUS_OPTS

  const cell = (key, children, extra = '') => {
    const isA = active === key
    return (
      <div onMouseDown={() => setActive(key)} className={`${cellBase} ${extra}`}
        style={{ borderRight: `1px solid ${GRID}`, borderBottom: `1px solid ${GRID}`, boxShadow: isA ? 'inset 0 0 0 2px var(--color-brand)' : 'none', position: 'relative', zIndex: isA ? 1 : 0 }}>
        {children}
      </div>
    )
  }

  // The action cell differs per row type:
  //   top-draft row  → ✕ Discard (row auto-saves on click-away)
  //   data row       → 🗑 Delete (only if showDelete) else empty
  const actionCellTop = () => (
    <div className={`${cellBase}`}
      style={{ borderRight: `1px solid ${GRID}`, borderBottom: `1px solid ${GRID}` }}>
      <button type="button" onClick={cancelTopDraft} title="Discard row"
        className="w-full h-full min-h-11 flex items-center justify-center hover:bg-red-50 transition-colors"
        style={{ color: '#b91c1c' }}>
        <X size={13} />
      </button>
    </div>
  )

  const actionCellData = (f) => (
    <div className={`${cellBase}`}
      style={{ borderRight: `1px solid ${GRID}`, borderBottom: `1px solid ${GRID}` }}>
      {showDelete
        ? <button type="button" onClick={() => onDelete(f.id)} title="Delete row"
            className="w-full h-full min-h-11 flex items-center justify-center hover:bg-red-50 transition-colors"
            style={{ color: '#b91c1c' }}>
            <Trash2 size={13} />
          </button>
        : null}
    </div>
  )

  return (
    <div ref={wrapRef} className="overflow-x-auto" style={{ borderTop: `1px solid ${GRID}` }}>
      <div style={{ minWidth }}>

        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: cols, background: 'var(--color-surface-2)' }}>
          {head.map((h, i) => (
            <div key={i} className="px-2.5 py-2.5 text-[11px] font-800 uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: 'var(--color-text-secondary)', borderRight: `1px solid ${GRID}`, borderBottom: `2px solid ${GRID}` }}>
              <span>{h}</span>
              {i === 0 && onSortToggle && (
                <button type="button" onClick={onSortToggle}
                  title={sort.endsWith('asc') ? 'Date: oldest first' : 'Date: newest first'}
                  className="p-0.5 rounded transition-colors hover:bg-(--color-surface)"
                  style={{ color: 'var(--color-brand)' }}>
                  <ArrowUpDown size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* New top row (blue highlight, save/cancel actions) */}
        {addingRow && (
          <div ref={topRowRef} className="grid items-stretch"
            style={{ gridTemplateColumns: cols, background: 'var(--color-brand-50,#eef2ff)', borderBottom: `2px solid var(--color-brand)` }}>
            {cell('top:date',      <DateCell value={topDraft.scheduled_at} isIso onCommit={(v) => updateTopDraft({ scheduled_at: v })} />)}
            {cell('top:type',      <ChipCell value={topDraft.type} options={types} placeholder="+ Type" styleFor={(v) => typeStyle[v]} onChange={(v) => updateTopDraft({ type: v })} />)}
            {cell('top:outcome',   <ChipCell value={topDraft.outcome} options={outcomeOptions(topDraft.type || 'Call')} placeholder="Set outcome" styleFor={outcomeStyle} onChange={(v) => updateTopDraft({ outcome: v })} />)}
            {cell('top:caller',    <ChipCell value={topDraft.caller_name} options={staff.map(m => m.name)} placeholder="—" onChange={(v) => updateTopDraft({ caller_name: v })} />)}
            {cell('top:notes',     <TextCell value={topDraft.notes || ''} placeholder="Add response…" onCommit={(v) => updateTopDraft({ notes: v || null })} />)}
            {cell('top:status',    <ChipCell value={topDraft.status} options={resolvedStatusOpts} styleFor={(v) => statusStyle?.[v]} onChange={(v) => updateTopDraft({ status: v })} />)}
            {cell('top:nextvisit', <DateCell value={topDraft.next_followup_date} onCommit={(v) => updateTopDraft({ next_followup_date: v ? v.slice(0, 10) : null })} />)}
            {actionCellTop()}
          </div>
        )}

        {/* Data rows */}
        {sorted.map(f => (
          <div key={f.id} className="grid items-stretch" style={{ gridTemplateColumns: cols }}>
            {cell(`${f.id}:date`,      <DateCell value={f.scheduled_at} isIso onCommit={(v) => onField(f.id, { scheduled_at: v })} />)}
            {cell(`${f.id}:type`,      <ChipCell value={f.type} options={types} styleFor={(v) => typeStyle[v]} onChange={(v) => onField(f.id, { type: v })} />)}
            {cell(`${f.id}:outcome`,   <ChipCell value={f.outcome} options={outcomeOptions(f.type)} placeholder="Set outcome" styleFor={outcomeStyle} onChange={(v) => onField(f.id, { outcome: v })} />)}
            {cell(`${f.id}:caller`,    <ChipCell value={f.caller_name} options={staff.map(m => m.name)} placeholder="—" onChange={(v) => onField(f.id, { caller_name: v })} />)}
            {cell(`${f.id}:notes`,     <TextCell value={f.notes} placeholder="Add response…" onCommit={(v) => onField(f.id, { notes: v || null })} />)}
            {cell(`${f.id}:status`,    <ChipCell value={f.status} options={resolvedStatusOpts} styleFor={(v) => statusStyle?.[v]} onChange={(v) => onField(f.id, { status: v })} />)}
            {cell(`${f.id}:nextvisit`, <DateCell value={f.next_followup_date} onCommit={(v) => onField(f.id, { next_followup_date: v ? v.slice(0, 10) : null })} />)}
            {actionCellData(f)}
          </div>
        ))}

      </div>
    </div>
  )
}
