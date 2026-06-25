'use client'
import { useState } from 'react'
import { Users, ChevronDown, Check } from 'lucide-react'

// User/owner selector. `value` = user id or 'all'. `users` = [{ id, name, role }].
const initials = name => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

export default function UserSelector({ value = 'all', onChange, users = [] }) {
  const [open, setOpen] = useState(false)
  const selected = value === 'all' ? null : users.find(u => u.id === value)

  const pick = (id) => { onChange?.(id); setOpen(false) }

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="relative z-20 inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-600 transition-colors hover:bg-(--color-surface-2)"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
        <Users size={14} style={{ color: 'var(--color-brand)' }} />
        {selected ? selected.name : 'All users'}
        <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl overflow-hidden z-20 max-h-80 overflow-y-auto"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }}>
          <button type="button" onClick={() => pick('all')}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left hover:bg-(--color-surface-2) transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}>
            <span className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-700" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                <Users size={12} />
              </span>
              All users
            </span>
            {value === 'all' && <Check size={14} style={{ color: 'var(--color-brand)' }} />}
          </button>
          {users.length === 0 && (
            <p className="px-3.5 py-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No team members yet.</p>
          )}
          {users.map(u => (
            <button key={u.id} type="button" onClick={() => pick(u.id)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left hover:bg-(--color-surface-2) transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}>
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-700 shrink-0" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                  {initials(u.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate" style={{ color: 'var(--color-text-primary)' }}>{u.name}</span>
                  {u.role && <span className="block text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{u.role}</span>}
                </span>
              </span>
              {value === u.id && <Check size={14} className="shrink-0" style={{ color: 'var(--color-brand)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
