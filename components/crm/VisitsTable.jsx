'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check, Trash2, Search } from 'lucide-react'

// Spreadsheet-style visit table — excel cells with gridlines, an active-cell
// border on click, and chip-style dropdowns. Used on the patient page.

const GRID = 'var(--color-border)'
const COLS = '130px 180px minmax(240px,1.4fr) 180px 110px 120px 150px 44px'
const MINW = '1090px'

// Stable per-service chip colors (so a given service always gets the same color)
const CHIP_COLORS = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef3c7', color: '#b45309' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#f3e8ff', color: '#7c3aed' },
  { bg: '#ffedd5', color: '#c2410c' },
  { bg: '#cffafe', color: '#0e7490' },
  { bg: '#e0e7ff', color: '#4338ca' },
  { bg: '#fee2e2', color: '#b91c1c' },
  { bg: '#ecfccb', color: '#4d7c0f' },
]
function chipColor(key = '') {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return CHIP_COLORS[h % CHIP_COLORS.length]
}

// ── Fixed-positioned menu helper (flips up near the screen bottom) ──
function useFixedMenu(open, setOpen, rows) {
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200, maxH: 260 })
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const estH = Math.min((rows + 1) * 34 + 52, 320)
      const below = window.innerHeight - r.bottom
      const up = below < estH && r.top > below
      // Wider than the cell so labels (e.g. "Dr. Priya · Cardiology") don't crop,
      // and clamped so the menu never spills off the right edge.
      const width = Math.min(Math.max(r.width, 280), window.innerWidth - 16)
      const left = Math.min(r.left, Math.max(8, window.innerWidth - width - 8))
      setPos({
        top: up ? Math.max(8, r.top - estH - 4) : r.bottom + 4,
        left,
        width,
        maxH: up ? Math.min(estH, r.top - 12) : Math.min(estH, below - 12),
      })
    }
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
  return { btnRef, menuRef, pos, openMenu }
}

// ── Single-select chip cell (doctor, package) ──
function SingleChipCell({ value, options, onChange, placeholder, onActivate }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { btnRef, menuRef, pos, openMenu } = useFixedMenu(open, setOpen, options.length)
  const current = options.find(o => o.id === value)
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
  const open2 = () => { setQuery(''); openMenu() }
  return (
    <>
      <button ref={btnRef} type="button" onMouseDown={onActivate} onClick={() => open ? setOpen(false) : open2()}
        className="w-full h-full min-h-11 flex items-center justify-between gap-1 px-2 text-left hover:bg-(--color-surface-2) transition-colors outline-none">
        {current
          ? <span className="text-[12px] font-600 px-2 py-0.5 rounded-md truncate" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)', lineHeight: '20px' }}>{current.label}</span>
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
              <button type="button" onClick={() => { onChange(null); setOpen(false) }} className="w-full flex items-center px-2.5 py-1.5 text-left hover:bg-(--color-surface-2)">
                <span className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>— None —</span>
              </button>
              {filtered.length === 0 && <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No matches</p>}
              {filtered.map(o => (
                <button key={o.id} type="button" onClick={() => { onChange(o.id); setOpen(false) }}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-(--color-surface-2)">
                  <span className="text-[13px] truncate" style={{ color: 'var(--color-text-primary)' }}>{o.label}{o.sub ? <span style={{ color: 'var(--color-text-muted)' }}> · {o.sub}</span> : null}</span>
                  {o.id === value && <Check size={13} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Multi-select chip cell (services) ──
function MultiChipCell({ value = [], options, onChange, onActivate }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { btnRef, menuRef, pos, openMenu } = useFixedMenu(open, setOpen, options.length)
  const chosen = value.map(id => options.find(o => o.id === id)).filter(Boolean)
  const toggle = (id) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
  const open2 = () => { setQuery(''); openMenu() }
  return (
    <>
      <button ref={btnRef} type="button" onMouseDown={onActivate} onClick={() => open ? setOpen(false) : open2()}
        className="w-full h-full min-h-11 flex items-center gap-1 px-2 py-1.5 text-left flex-wrap hover:bg-(--color-surface-2) transition-colors outline-none">
        {chosen.length === 0
          ? <span className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>— Services —</span>
          : chosen.map(o => {
            const c = chipColor(o.id)
            return <span key={o.id} className="text-[11px] font-600 px-2 py-0.5 rounded-md" style={{ background: c.bg, color: c.color }}>{o.label}</span>
          })}
        <ChevronDown size={13} className="shrink-0 opacity-40 ml-auto" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={menuRef} className="fixed z-50 flex flex-col rounded-lg border border-(--color-border) overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div className="p-1.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search services…"
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-(--color-border) outline-none"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
              </div>
            </div>
            <div className="overflow-y-auto py-1 flex-1 min-h-0">
              {options.length === 0 && <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No services</p>}
              {options.length > 0 && filtered.length === 0 && <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No matches</p>}
              {filtered.map(o => {
                const on = value.includes(o.id)
                return (
                  <button key={o.id} type="button" onClick={() => toggle(o.id)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-(--color-surface-2)">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0" style={on ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)' }}>
                        {on && <Check size={10} className="text-white" />}
                      </span>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: chipColor(o.id).color }} />
                      <span className="text-[13px] truncate" style={{ color: 'var(--color-text-primary)' }}>{o.label}</span>
                    </span>
                    {o.sub != null && <span className="text-[12px] font-600 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{o.sub}</span>}
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

// ── Inline text / date / number cell ──
function InlineCell({ value, onCommit, type = 'text', placeholder = '—', align = 'left' }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => { setV(value ?? '') }, [value])
  return (
    <input
      type={type}
      value={v}
      placeholder={placeholder}
      onChange={e => setV(e.target.value)}
      onBlur={() => { if (String(v ?? '') !== String(value ?? '')) onCommit(v) }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="w-full h-full min-h-11 px-2.5 text-[13px] bg-transparent outline-none"
      style={{ color: 'var(--color-text-primary)', textAlign: align }}
    />
  )
}

export default function VisitsTable({ visits, services, packages, doctors, sort = 'desc', onField, onDelete }) {
  const wrapRef = useRef(null)
  const [active, setActive] = useState(null)

  // Clear the active cell when clicking outside the table
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setActive(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const doctorOpts = doctors.map(d => ({ id: d.id, label: d.name, sub: d.department || null }))
  const pkgOpts    = packages.map(p => ({ id: p.id, label: p.name }))
  const svcOpts    = services.map(s => ({ id: s.id, label: s.name, sub: s.price != null ? `₹${Number(s.price).toLocaleString()}` : null }))

  const head = ['Date', 'Doctor', 'Services', 'Package', 'Misc', 'Total', 'Next Visit', '']
  const sorted = [...visits].sort((a, b) =>
    sort === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
  )

  const cell = (rowId, col, node) => {
    const key = `${rowId}:${col}`
    const isA = active === key
    return (
      <div onMouseDown={() => setActive(key)} className="min-h-11 flex items-stretch"
        style={{ borderRight: `1px solid ${GRID}`, borderBottom: `1px solid ${GRID}`, boxShadow: isA ? 'inset 0 0 0 2px var(--color-brand)' : 'none', position: 'relative', zIndex: isA ? 1 : 0 }}>
        {node}
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="overflow-x-auto" style={{ borderTop: `1px solid ${GRID}` }}>
      <div style={{ minWidth: MINW }}>
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: COLS, background: 'var(--color-surface-2)' }}>
          {head.map((h, i) => (
            <div key={i} className="px-2.5 py-2.5 text-[11px] font-800 uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)', borderRight: `1px solid ${GRID}`, borderBottom: `2px solid ${GRID}` }}>{h}</div>
          ))}
        </div>
        {/* Rows */}
        {sorted.map(v => (
          <div key={v.id} className="grid items-stretch" style={{ gridTemplateColumns: COLS }}>
            {cell(v.id, 'date', <InlineCell value={v.date} type="date" onCommit={(val) => onField(v.id, { date: val })} />)}
            {cell(v.id, 'doctor', <SingleChipCell value={v.doctor_id} options={doctorOpts} placeholder="— Doctor —" onChange={(id) => onField(v.id, { doctor_id: id })} onActivate={() => setActive(`${v.id}:doctor`)} />)}
            {cell(v.id, 'services', <MultiChipCell value={v.service_ids || []} options={svcOpts} onChange={(ids) => onField(v.id, { service_ids: ids })} onActivate={() => setActive(`${v.id}:services`)} />)}
            {cell(v.id, 'package', <SingleChipCell value={v.package_id} options={pkgOpts} placeholder="— Package —" onChange={(id) => onField(v.id, { package_id: id })} onActivate={() => setActive(`${v.id}:package`)} />)}
            {cell(v.id, 'misc', <InlineCell value={v.misc_cost ? String(v.misc_cost) : ''} type="number" placeholder="0" onCommit={(val) => onField(v.id, { misc_cost: val === '' ? 0 : Number(val) })} />)}
            {cell(v.id, 'total', <span className="w-full h-full min-h-11 flex items-center px-2.5 text-[13px] font-700" style={{ color: 'var(--color-brand)' }}>₹{Number(v.total || 0).toLocaleString()}</span>)}
            {cell(v.id, 'next', <InlineCell value={v.next_visit_date || ''} type="date" onCommit={(val) => onField(v.id, { next_visit_date: val || null })} />)}
            {cell(v.id, 'del', <button type="button" onClick={() => onDelete(v.id)} title="Delete" className="w-full h-full min-h-11 flex items-center justify-center hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}><Trash2 size={13} /></button>)}
          </div>
        ))}
      </div>
    </div>
  )
}
