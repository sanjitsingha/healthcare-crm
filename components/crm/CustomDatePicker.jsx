'use client'
import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, isSameDay,
} from 'date-fns'

// Shared custom calendar.
//   value: 'yyyy-MM-dd' (or ISO) | empty.  onChange receives a 'yyyy-MM-dd' string.
//   popover=false → always-visible inline calendar.
//   popover=true  → input-like button that opens the calendar as a fixed dropdown.
// Header is clickable: days → months → years (decade), for fast navigation (e.g. DOB).
const CAL_W = 256
const CAL_H = 330
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function CustomDatePicker({ value, onChange, popover = false, placeholder = 'Select date', monthOnly = false, compact = false, typeable = false }) {
  const selected = value
    ? new Date(String(value).length === 10 ? value + 'T12:00:00' : value)
    : null
  const [month, setMonth] = useState(startOfMonth(selected || new Date()))
  const [mode, setMode]   = useState(monthOnly ? 'months' : 'days') // 'days' | 'months' | 'years'
  const [open, setOpen]   = useState(false)
  const [pos, setPos]     = useState({ top: 0, left: 0 })
  const [text, setText]   = useState(selected ? format(selected, 'dd/MM/yyyy') : '')
  const btnRef = useRef(null)
  const popRef = useRef(null)

  // Keep the typed text in sync when the value changes from outside (e.g. calendar pick)
  useEffect(() => {
    setText(value ? format(new Date(String(value).length === 10 ? value + 'T12:00:00' : value), 'dd/MM/yyyy') : '')
  }, [value])

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const gridEnd   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = []
  let p = gridStart
  while (p <= gridEnd) {
    days.push(p)
    p = new Date(p.getFullYear(), p.getMonth(), p.getDate() + 1)
  }
  const today = new Date()
  const decadeStart = month.getFullYear() - (month.getFullYear() % 12)

  const pad = n => String(n).padStart(2, '0')
  const pick = (day) => {
    onChange(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`)
    setMode('days')
    setOpen(false)
  }
  // month-only: pick a month → commit as the 1st of that month
  const commitMonth = (mi) => {
    onChange(`${month.getFullYear()}-${pad(mi + 1)}-01`)
    setOpen(false)
  }

  // Typing: mask to dd/MM/yyyy and commit + move calendar once a full valid date is entered
  const handleType = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8)   // ddmmyyyy
    let out = raw
    if (raw.length > 4)      out = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`
    else if (raw.length > 2) out = `${raw.slice(0, 2)}/${raw.slice(2)}`
    setText(out)
    if (raw.length === 0) { onChange(''); return }
    if (raw.length === 8) {
      const dd = +raw.slice(0, 2), mm = +raw.slice(2, 4), yyyy = +raw.slice(4)
      const d = new Date(yyyy, mm - 1, dd)
      const valid = mm >= 1 && mm <= 12 && dd >= 1 && d.getDate() === dd && d.getMonth() === mm - 1 && d.getFullYear() === yyyy
      if (valid) { onChange(`${yyyy}-${pad(mm)}-${pad(dd)}`); setMonth(startOfMonth(d)) }
    }
  }

  const openCal = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const below = window.innerHeight - r.bottom
      const openUp = below < CAL_H && r.top > below
      const left = Math.min(r.left, Math.max(8, window.innerWidth - CAL_W - 8))
      setPos({ top: openUp ? Math.max(8, r.top - CAL_H - 4) : r.bottom + 4, left })
    }
    setMonth(startOfMonth(selected || new Date()))
    setMode(monthOnly ? 'months' : 'days')
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

  const goPrev = () => setMonth(m =>
    mode === 'days'   ? subMonths(m, 1)
    : mode === 'months' ? new Date(m.getFullYear() - 1, m.getMonth(), 1)
    : new Date(m.getFullYear() - 12, m.getMonth(), 1))
  const goNext = () => setMonth(m =>
    mode === 'days'   ? addMonths(m, 1)
    : mode === 'months' ? new Date(m.getFullYear() + 1, m.getMonth(), 1)
    : new Date(m.getFullYear() + 12, m.getMonth(), 1))

  const navBtn = 'w-7 h-7 flex items-center justify-center rounded-lg hover:bg-(--color-surface-2) transition-colors'
  const cellHover = (e, active) => { if (!active) e.currentTarget.style.background = 'var(--color-surface-2)' }
  const cellOut   = (e, active) => { if (!active) e.currentTarget.style.background = 'transparent' }

  const headerLabel =
    mode === 'days'   ? format(month, 'MMMM yyyy')
    : mode === 'months' ? format(month, 'yyyy')
    : `${decadeStart} – ${decadeStart + 11}`

  const calendar = (
    <div className="rounded-xl border p-2.5"
      style={{ width: CAL_W, borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: popover ? '0 8px 24px rgba(0,0,0,0.15)' : 'none' }}>
      <div className="flex items-center justify-between mb-2 px-0.5">
        <button type="button" onClick={goPrev} className={navBtn} style={{ color: 'var(--color-text-secondary)' }}><ChevronLeft size={16} /></button>
        <button type="button" onClick={() => setMode(mode === 'days' ? 'months' : mode === 'months' ? 'years' : 'days')}
          className="text-[13px] font-700 px-2 py-1 rounded-lg hover:bg-(--color-surface-2) transition-colors"
          style={{ color: 'var(--color-text-primary)' }}>{headerLabel}</button>
        <button type="button" onClick={goNext} className={navBtn} style={{ color: 'var(--color-text-secondary)' }}><ChevronRight size={16} /></button>
      </div>

      {mode === 'days' && (
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
            <span key={d} className="h-6 flex items-center justify-center text-[10px] font-700 uppercase" style={{ color: 'var(--color-text-muted)' }}>{d}</span>
          ))}
          {days.map((day, i) => {
            const active  = selected && isSameDay(day, selected)
            const inMonth = day.getMonth() === month.getMonth()
            const isToday = isSameDay(day, today)
            return (
              <button key={i} type="button" onClick={() => pick(day)}
                className="h-8 flex items-center justify-center text-[12px] rounded-lg transition-colors"
                style={active
                  ? { background: 'var(--color-brand)', color: '#fff', fontWeight: 700 }
                  : { color: inMonth ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: isToday ? 700 : 400, boxShadow: isToday ? 'inset 0 0 0 1px var(--color-brand)' : 'none' }}
                onMouseEnter={e => cellHover(e, active)} onMouseLeave={e => cellOut(e, active)}>
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      )}

      {mode === 'months' && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {MONTHS_SHORT.map((mn, i) => {
            const active = selected && selected.getFullYear() === month.getFullYear() && selected.getMonth() === i
            return (
              <button key={mn} type="button" onClick={() => monthOnly ? commitMonth(i) : (setMonth(m => new Date(m.getFullYear(), i, 1)), setMode('days'))}
                className="py-2.5 rounded-lg text-[12px] font-600 transition-colors"
                style={active ? { background: 'var(--color-brand)', color: '#fff' } : { color: 'var(--color-text-primary)' }}
                onMouseEnter={e => cellHover(e, active)} onMouseLeave={e => cellOut(e, active)}>
                {mn}
              </button>
            )
          })}
        </div>
      )}

      {mode === 'years' && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, k) => decadeStart + k).map(y => {
            const active = selected && selected.getFullYear() === y
            return (
              <button key={y} type="button" onClick={() => { setMonth(m => new Date(y, m.getMonth(), 1)); setMode('months') }}
                className="py-2.5 rounded-lg text-[12px] font-600 transition-colors"
                style={active ? { background: 'var(--color-brand)', color: '#fff' } : { color: 'var(--color-text-primary)' }}
                onMouseEnter={e => cellHover(e, active)} onMouseLeave={e => cellOut(e, active)}>
                {y}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  // Inline mode — always-visible calendar.
  if (!popover) return <div className="shrink-0">{calendar}</div>

  // Typeable popover — editable dd/MM/yyyy input with a calendar toggle.
  if (typeable && !monthOnly) return (
    <>
      <div ref={btnRef}
        className={`w-full rounded-lg border flex items-center gap-2 ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
        style={{ borderColor: open ? 'var(--color-brand)' : 'var(--color-border)', background: 'var(--color-surface)', position: 'relative', zIndex: open ? 50 : 'auto' }}>
        <input
          value={text}
          onChange={handleType}
          onFocus={() => !open && openCal()}
          onMouseDown={() => !open && openCal()}
          placeholder={placeholder}
          inputMode="numeric"
          className="flex-1 min-w-0 bg-transparent outline-none"
          style={{ color: 'var(--color-text-primary)' }}
        />
        <button type="button" onMouseDown={e => { e.preventDefault(); open ? setOpen(false) : openCal() }} className="shrink-0 flex items-center" title="Open calendar">
          <Calendar size={compact ? 12 : 14} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={popRef} className="fixed z-50" style={{ top: pos.top, left: pos.left }}>{calendar}</div>
        </>
      )}
    </>
  )

  // Popover mode — input-like button that opens the calendar as a fixed dropdown.
  return (
    <>
      <button ref={btnRef} type="button" onClick={() => open ? setOpen(false) : openCal()}
        className={`w-full rounded-lg border outline-none flex items-center justify-between gap-2 text-left ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
        style={{ borderColor: open ? 'var(--color-brand)' : 'var(--color-border)', background: 'var(--color-surface)', color: selected ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
        <span className="truncate">{selected ? format(selected, monthOnly ? 'MMMM yyyy' : 'dd/MM/yyyy') : placeholder}</span>
        <Calendar size={compact ? 12 : 14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={popRef} className="fixed z-50" style={{ top: pos.top, left: pos.left }}>{calendar}</div>
        </>
      )}
    </>
  )
}
