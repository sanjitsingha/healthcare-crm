'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Shared spreadsheet-style follow-up table (used on lead + patient pages).

const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const FU_SORTERS = {
  added:         (a, b) => new Date(a.created_at) - new Date(b.created_at),
  modified_desc: (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at),
  modified_asc:  (a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at),
}

// Google-Sheets-style chip dropdown; menu is fixed-positioned and flips up near
// the screen bottom so it never gets clipped.
export function ChipCell({ value, options, onChange, placeholder = '—', styleFor }) {
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 176, maxH: 224 })
  const s = value && styleFor ? styleFor(value) : null

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const estH = Math.min((options.length || 1) * 30 + 8, 224)
      const below = window.innerHeight - r.bottom
      const openUp = below < estH && r.top > below
      setPos({
        top: openUp ? Math.max(8, r.top - estH - 4) : r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 176),
        maxH: openUp ? Math.min(estH, r.top - 12) : Math.min(estH, below - 12),
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

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => open ? setOpen(false) : openMenu()}
        className="w-full h-full flex items-center justify-between gap-1 px-2 py-1.5 text-left hover:bg-(--color-surface-2) transition-colors">
        {value
          ? <span className="text-[11px] font-600 px-2 py-0.5 rounded-full truncate"
              style={s ? { background: s.bg, color: s.color } : { background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>{value}</span>
          : <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{placeholder}</span>}
        <ChevronDown size={12} className="shrink-0 opacity-40" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={menuRef} className="fixed z-50 overflow-y-auto rounded-lg border border-(--color-border) py-1"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            {options.length === 0 && <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No options</p>}
            {options.map(o => {
              const os = styleFor ? styleFor(o) : null
              return (
                <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }}
                  className="w-full flex items-center px-2.5 py-1.5 text-left hover:bg-(--color-surface-2) transition-colors">
                  <span className="text-[11px] font-600 px-2 py-0.5 rounded-full"
                    style={os ? { background: os.bg, color: os.color } : { color: 'var(--color-text-primary)' }}>{o}</span>
                </button>
              )
            })}
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
      className="w-full px-2 py-1.5 text-[11px] bg-transparent outline-none focus:bg-(--color-surface-2)"
      style={{ color: 'var(--color-text-primary)' }}
    />
  )
}

const FU_COLS = '120px 170px minmax(180px,1fr) 140px minmax(160px,1.2fr) 130px'

export default function FollowupTable({
  followups, staff, onField, onCreate, statusStyle, typeStyle, types, outcomeOptions, sort = 'added',
}) {
  const head = ['Type', 'Date & Time', 'Outcome', 'Called By', 'Response', 'Status']
  const [draft, setDraft] = useState({})

  const touchDraft = (patch) => {
    const next = { ...draft, ...patch }
    if (Object.values(next).some(v => v != null && v !== '')) { onCreate(next); setDraft({}) }
    else setDraft(next)
  }

  const sorted = [...followups].sort(FU_SORTERS[sort] || FU_SORTERS.added)

  return (
    <div className="overflow-x-auto rounded-lg border border-(--color-border)">
      <div style={{ minWidth: '900px' }}>
        <div className="grid" style={{ gridTemplateColumns: FU_COLS, background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
          {head.map(h => (
            <div key={h} className="px-2 py-1.5 text-[10px] font-700 uppercase tracking-wider border-r border-(--color-border) last:border-r-0" style={{ color: 'var(--color-text-muted)' }}>{h}</div>
          ))}
        </div>
        {sorted.map(f => (
          <div key={f.id} className="grid items-stretch border-b border-(--color-border)" style={{ gridTemplateColumns: FU_COLS }}>
            <div className="border-r border-(--color-border)">
              <ChipCell value={f.type} options={types} styleFor={(v) => typeStyle[v]} onChange={(v) => onField(f.id, { type: v })} />
            </div>
            <div className="border-r border-(--color-border) flex items-center">
              <TextCell value={toLocalInput(f.scheduled_at)} type="datetime-local"
                onCommit={(v) => onField(f.id, { scheduled_at: v ? new Date(v).toISOString() : null })} />
            </div>
            <div className="border-r border-(--color-border)">
              <ChipCell value={f.outcome} options={outcomeOptions(f.type)} placeholder="Set outcome" onChange={(v) => onField(f.id, { outcome: v })} />
            </div>
            <div className="border-r border-(--color-border)">
              <ChipCell value={f.caller_name} options={staff.map(m => m.name)} placeholder="—" onChange={(v) => onField(f.id, { caller_name: v })} />
            </div>
            <div className="border-r border-(--color-border) flex items-center">
              <TextCell value={f.notes} placeholder="Add response…" onCommit={(v) => onField(f.id, { notes: v || null })} />
            </div>
            <div>
              <ChipCell value={f.status} options={['Scheduled', 'Completed', 'Missed', 'Rescheduled']} styleFor={(v) => statusStyle[v]} onChange={(v) => onField(f.id, { status: v })} />
            </div>
          </div>
        ))}
        {/* Empty draft row */}
        <div className="grid items-stretch" style={{ gridTemplateColumns: FU_COLS, background: 'var(--color-surface-2)' }}>
          <div className="border-r border-(--color-border)">
            <ChipCell value={draft.type} options={types} placeholder="+ Type" styleFor={(v) => typeStyle[v]} onChange={(v) => touchDraft({ type: v })} />
          </div>
          <div className="border-r border-(--color-border) flex items-center">
            <TextCell value={draft.scheduled_at ? toLocalInput(draft.scheduled_at) : ''} type="datetime-local"
              onCommit={(v) => touchDraft({ scheduled_at: v ? new Date(v).toISOString() : null })} />
          </div>
          <div className="border-r border-(--color-border)">
            <ChipCell value={draft.outcome} options={outcomeOptions(draft.type || 'Call')} placeholder="Set outcome" onChange={(v) => touchDraft({ outcome: v })} />
          </div>
          <div className="border-r border-(--color-border)">
            <ChipCell value={draft.caller_name} options={staff.map(m => m.name)} placeholder="—" onChange={(v) => touchDraft({ caller_name: v })} />
          </div>
          <div className="border-r border-(--color-border) flex items-center">
            <TextCell value={draft.notes || ''} placeholder="Add response…" onCommit={(v) => touchDraft({ notes: v || null })} />
          </div>
          <div className="flex items-center px-2">
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>new row</span>
          </div>
        </div>
      </div>
    </div>
  )
}
