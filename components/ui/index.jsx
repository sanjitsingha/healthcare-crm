'use client'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect } from 'react'

// ── Badge ──────────────────────────────────────────────────────
const STAGE_COLORS = {
  New:         'bg-blue-50 text-blue-700 border-blue-200',
  Contacted:   'bg-purple-50 text-purple-700 border-purple-200',
  Qualified:   'bg-amber-50 text-amber-700 border-amber-200',
  Proposal:    'bg-orange-50 text-orange-700 border-orange-200',
  Negotiation: 'bg-pink-50 text-pink-700 border-pink-200',
  Won:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  Lost:        'bg-red-50 text-red-700 border-red-200',
}

const PRIORITY_COLORS = {
  Low:    'bg-gray-50 text-gray-600 border-gray-200',
  Medium: 'bg-blue-50 text-blue-600 border-blue-200',
  High:   'bg-orange-50 text-orange-600 border-orange-200',
  Urgent: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_COLORS = {
  Pending:     'bg-amber-50 text-amber-700 border-amber-200',
  'In Progress':'bg-blue-50 text-blue-700 border-blue-200',
  Completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled:   'bg-gray-50 text-gray-500 border-gray-200',
  Scheduled:   'bg-blue-50 text-blue-700 border-blue-200',
  Missed:      'bg-red-50 text-red-600 border-red-200',
  Rescheduled: 'bg-purple-50 text-purple-600 border-purple-200',
  Active:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  Inactive:    'bg-gray-50 text-gray-500 border-gray-200',
}

export function Badge({ children, className = '' }) {
  const color =
    STAGE_COLORS[children] ||
    PRIORITY_COLORS[children] ||
    STATUS_COLORS[children] ||
    'bg-gray-50 text-gray-600 border-gray-200'

  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-500 border', color, className)}>
      {children}
    </span>
  )
}

// ── Tag ───────────────────────────────────────────────────────
export function Tag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-500 border"
      style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)', borderColor: 'var(--color-brand-light)' }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70">
          <X size={10} />
        </button>
      )}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', className = '', onClick, type = 'button', disabled = false }) {
  const base = 'inline-flex items-center gap-2 font-500 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }
  const variants = {
    primary: 'text-white hover:opacity-90 active:scale-95',
    secondary: 'border border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-2)] active:scale-95',
    ghost: 'hover:bg-[var(--color-brand-50)] active:scale-95',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-95',
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(base, sizes[size], variants[variant], className)}
      style={variant === 'primary' ? { background: 'var(--color-brand)' } : {}}
    >
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={clsx('bg-white rounded-xl border border-[var(--color-border)] p-4', onClick && 'cursor-pointer hover:shadow-md transition-shadow', className)}
    >
      {children}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full bg-white rounded-2xl shadow-2xl border border-[var(--color-border)]', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={clsx('space-y-1', className)}>
      {label && <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>}
      <input
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2 transition-all"
        style={{ fontFamily: 'var(--font-sans)' }}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, options = [], className = '', error, ...props }) {
  return (
    <div className={clsx('space-y-1', className)}>
      {label && <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>}
      <select
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2 transition-all cursor-pointer"
        style={{ fontFamily: 'var(--font-sans)' }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────
export function Textarea({ label, className = '', error, ...props }) {
  return (
    <div className={clsx('space-y-1', className)}>
      {label && <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>}
      <textarea
        rows={3}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2 transition-all resize-none"
        style={{ fontFamily: 'var(--font-sans)' }}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ name = '', size = 'md' }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const colors = ['#0f6e56', '#1d4ed8', '#7c3aed', '#b45309', '#be185d', '#065f46', '#1e40af']
  const color = colors[name.charCodeAt(0) % colors.length] || '#0f6e56'
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  return (
    <div
      className={clsx('rounded-full flex items-center justify-center font-600 text-white flex-shrink-0', sizes[size])}
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-brand-50)' }}>
          <Icon size={22} style={{ color: 'var(--color-brand)' }} />
        </div>
      )}
      <h3 className="text-sm font-600 mb-1" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      {description && <p className="text-xs mb-4 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      {action}
    </div>
  )
}

// ── Loading Spinner ───────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand)]"
      style={{ width: size, height: size }}
    />
  )
}

// ── Switch (solid toggle) ─────────────────────────────────────
export function Switch({ checked = false, onChange, size = 'md', title, disabled = false }) {
  const dims = size === 'sm'
    ? { w: 30, h: 18, knob: 14 }
    : { w: 38, h: 22, knob: 18 }
  const pad = 2
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex items-center shrink-0 rounded-full transition-colors duration-200 outline-none disabled:opacity-50"
      style={{
        width: dims.w,
        height: dims.h,
        background: checked ? 'var(--color-brand)' : '#cbd2e0',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="absolute rounded-full bg-white transition-transform duration-200"
        style={{
          width: dims.knob,
          height: dims.knob,
          top: pad,
          left: pad,
          transform: checked ? `translateX(${dims.w - dims.knob - pad * 2}px)` : 'translateX(0)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'brand', trend }) {
  const colorMap = {
    brand: { bg: 'var(--color-brand-50)', icon: 'var(--color-brand)', text: 'var(--color-brand)' },
    blue:  { bg: '#eff6ff', icon: '#2563eb', text: '#2563eb' },
    amber: { bg: '#fffbeb', icon: '#d97706', text: '#d97706' },
    red:   { bg: '#fef2f2', icon: '#dc2626', text: '#dc2626' },
    purple:{ bg: '#faf5ff', icon: '#7c3aed', text: '#7c3aed' },
  }
  const c = colorMap[color] || colorMap.brand
  return (
    <Card className="flex items-start gap-4">
      <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: c.bg }}>
        <Icon size={20} style={{ color: c.icon }} />
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-2xl font-700" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
        {trend !== undefined && (
          <p className="text-xs mt-0.5" style={{ color: trend >= 0 ? '#059669' : '#dc2626' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% this month
          </p>
        )}
      </div>
    </Card>
  )
}

// ── Tags Input ────────────────────────────────────────────────
export function TagsInput({ value = [], onChange, placeholder = 'Add tag...' }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = e.target.value.trim().replace(',', '')
      if (tag && !value.includes(tag)) {
        onChange([...value, tag])
        e.target.value = ''
      }
    }
  }
  return (
    <div className="min-h-[40px] flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white cursor-text" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
      {value.map(tag => <Tag key={tag} label={tag} onRemove={() => onChange(value.filter(t => t !== tag))} />)}
      <input
        className="flex-1 min-w-24 text-sm outline-none bg-transparent"
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
