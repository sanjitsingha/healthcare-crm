'use client'
import { useState } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'

// Date-range selector with presets + a custom from/to picker.
// Range shape: { key, label, from: Date|null, to: Date|null }  (null = unbounded)

export const RANGE_PRESETS = [
  { key: 'today',     label: 'Today' },
  { key: '7d',        label: 'Last 7 days' },
  { key: '30d',       label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'all',       label: 'All time' },
]

export function rangeFromPreset(key) {
  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const label = RANGE_PRESETS.find(p => p.key === key)?.label || 'Custom'
  switch (key) {
    case 'today':     return { key, label, from: startToday, to: now }
    case '7d':        { const f = new Date(now); f.setDate(f.getDate() - 7);  return { key, label, from: f, to: now } }
    case '30d':       { const f = new Date(now); f.setDate(f.getDate() - 30); return { key, label, from: f, to: now } }
    case 'thisMonth': { const f = new Date(now.getFullYear(), now.getMonth(), 1); return { key, label, from: f, to: now } }
    case 'lastMonth': {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const t = new Date(now.getFullYear(), now.getMonth(), 1)
      return { key, label, from: f, to: t }
    }
    case 'all':
    default:          return { key: 'all', label: 'All time', from: null, to: null }
  }
}

const toInput = d => d ? new Date(d).toISOString().slice(0, 10) : ''

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [cFrom, setCFrom] = useState(() => toInput(value?.from))
  const [cTo, setCTo] = useState(() => toInput(value?.to))

  const pick = (key) => { onChange?.(rangeFromPreset(key)); setOpen(false) }

  const applyCustom = () => {
    if (!cFrom || !cTo) return
    const from = new Date(cFrom); from.setHours(0, 0, 0, 0)
    const to = new Date(cTo); to.setHours(0, 0, 0, 0); to.setDate(to.getDate() + 1) // inclusive end day
    if (to <= from) return
    const label = `${new Date(cFrom).toLocaleDateString()} – ${new Date(cTo).toLocaleDateString()}`
    onChange?.({ key: 'custom', label, from, to })
    setOpen(false)
  }

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="relative z-20 inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-600 transition-colors hover:bg-(--color-surface-2)"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
        <Calendar size={14} style={{ color: 'var(--color-brand)' }} />
        {value?.label || 'Last 30 days'}
        <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl overflow-hidden z-20"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }}>
          <div className="py-1.5">
            {RANGE_PRESETS.map(p => (
              <button key={p.key} type="button" onClick={() => pick(p.key)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-left hover:bg-(--color-surface-2) transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}>
                {p.label}
                {value?.key === p.key && <Check size={14} style={{ color: 'var(--color-brand)' }} />}
              </button>
            ))}
          </div>
          <div className="px-3.5 py-3 border-t border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-[10px] font-700 uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Custom range</p>
            <div className="flex items-center gap-2">
              <input type="date" value={cFrom} max={cTo || undefined} onChange={e => setCFrom(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border text-xs outline-none focus:border-(--color-brand)"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>–</span>
              <input type="date" value={cTo} min={cFrom || undefined} onChange={e => setCTo(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border text-xs outline-none focus:border-(--color-brand)"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
            </div>
            <button type="button" onClick={applyCustom} disabled={!cFrom || !cTo}
              className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-700 text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--color-brand)' }}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
