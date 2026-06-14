'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, Trash2, ArrowUpDown } from 'lucide-react'

// Shared spreadsheet-style follow-up table (used on lead + patient pages).

const toDateInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Semantic color coding for follow-up outcomes
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

// Google-Sheets-style chip dropdown with a search box; menu is fixed-positioned
// and flips up near the screen bottom so it never gets clipped.
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

export function TextCell({ value, onCommit, placeholder = '—', type = 'text' }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => { setV(value ?? '') }, [value])
  const commit = () => { if ((v || '') !== (value || '')) onCommit(v) }
  return (
    <input
      value={v}
      type={type}
      placeholder={placeholder}
      onChange={e => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="w-full h-full min-h-11 px-2.5 py-2 text-[13px] bg-transparent outline-none focus:shadow-[inset_0_0_0_2px_var(--color-brand)]"
      style={{ color: 'var(--color-text-primary)' }}
    />
  )
}

const FU_COLS = '140px 150px minmax(230px,1fr) 170px minmax(200px,1.2fr) 150px'
const GRID = 'var(--color-border)'
const cellBase = 'min-h-11 flex items-stretch'

export default function FollowupTable({
  followups, staff, onField, onCreate, onDelete, onSortToggle, statusStyle, typeStyle, types, outcomeOptions, sort = 'added', showDraftRow = true,
}) {
  const showDelete = typeof onDelete === 'function'
  const cols = FU_COLS + (showDelete ? ' 44px' : '')
  const minWidth = showDelete ? '1074px' : '1030px'
  const head = ['Date', 'Type', 'Outcome', 'Called By', 'Response', 'Status', ...(showDelete ? [''] : [])]
  const [draft, setDraft] = useState({})
  const [active, setActive] = useState(null)
  const wrapRef = useRef(null)

  // Clear the active cell when clicking outside the table
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setActive(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const touchDraft = (patch) => {
    const next = { ...draft, ...patch }
    if (Object.values(next).some(v => v != null && v !== '')) { onCreate(next); setDraft({}) }
    else setDraft(next)
  }

  const sorted = [...followups].sort(FU_SORTERS[sort] || FU_SORTERS.added)

  // Excel-like cell: gridlines + an active-cell border on click.
  const cell = (key, children, extra = '') => {
    const isA = active === key
    return (
      <div onMouseDown={() => setActive(key)} className={`${cellBase} ${extra}`}
        style={{ borderRight: `1px solid ${GRID}`, borderBottom: `1px solid ${GRID}`, boxShadow: isA ? 'inset 0 0 0 2px var(--color-brand)' : 'none', position: 'relative', zIndex: isA ? 1 : 0 }}>
        {children}
      </div>
    )
  }

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
                  className="p-0.5 rounded transition-colors hover:bg-(--color-surface)" style={{ color: 'var(--color-brand)' }}>
                  <ArrowUpDown size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Data rows */}
        {sorted.map(f => (
          <div key={f.id} className="grid items-stretch" style={{ gridTemplateColumns: cols }}>
            {cell(`${f.id}:date`,    <TextCell value={toDateInput(f.scheduled_at)} type="date" onCommit={(v) => onField(f.id, { scheduled_at: v ? new Date(v + 'T12:00:00').toISOString() : null })} />)}
            {cell(`${f.id}:type`,    <ChipCell value={f.type} options={types} styleFor={(v) => typeStyle[v]} onChange={(v) => onField(f.id, { type: v })} />)}
            {cell(`${f.id}:outcome`, <ChipCell value={f.outcome} options={outcomeOptions(f.type)} placeholder="Set outcome" styleFor={outcomeStyle} onChange={(v) => onField(f.id, { outcome: v })} />)}
            {cell(`${f.id}:caller`,  <ChipCell value={f.caller_name} options={staff.map(m => m.name)} placeholder="—" onChange={(v) => onField(f.id, { caller_name: v })} />)}
            {cell(`${f.id}:notes`,   <TextCell value={f.notes} placeholder="Add response…" onCommit={(v) => onField(f.id, { notes: v || null })} />)}
            {cell(`${f.id}:status`,  <ChipCell value={f.status} options={['Scheduled', 'Completed', 'Missed', 'Rescheduled']} styleFor={(v) => statusStyle[v]} onChange={(v) => onField(f.id, { status: v })} />)}
            {showDelete && cell(`${f.id}:del`, <button type="button" onClick={() => onDelete(f.id)} title="Delete" className="w-full h-full min-h-11 flex items-center justify-center hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}><Trash2 size={13} /></button>)}
          </div>
        ))}
        {/* Empty draft row */}
        {showDraftRow && (
          <div className="grid items-stretch" style={{ gridTemplateColumns: cols, background: 'var(--color-surface-2)' }}>
            {cell('draft:date',    <TextCell value={draft.scheduled_at ? toDateInput(draft.scheduled_at) : ''} type="date" onCommit={(v) => touchDraft({ scheduled_at: v ? new Date(v + 'T12:00:00').toISOString() : null })} />)}
            {cell('draft:type',    <ChipCell value={draft.type} options={types} placeholder="+ Type" styleFor={(v) => typeStyle[v]} onChange={(v) => touchDraft({ type: v })} />)}
            {cell('draft:outcome', <ChipCell value={draft.outcome} options={outcomeOptions(draft.type || 'Call')} placeholder="Set outcome" styleFor={outcomeStyle} onChange={(v) => touchDraft({ outcome: v })} />)}
            {cell('draft:caller',  <ChipCell value={draft.caller_name} options={staff.map(m => m.name)} placeholder="—" onChange={(v) => touchDraft({ caller_name: v })} />)}
            {cell('draft:notes',   <TextCell value={draft.notes || ''} placeholder="Add response…" onCommit={(v) => touchDraft({ notes: v || null })} />)}
            {cell('draft:status',  <span className="px-2.5 py-2 text-[12px] self-center" style={{ color: 'var(--color-text-muted)' }}>new row</span>)}
            {showDelete && cell('draft:del', <span className="w-full" />)}
          </div>
        )}
      </div>
    </div>
  )
}
