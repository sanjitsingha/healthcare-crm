'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, LayoutDashboard, TrendingUp, Users, UserRound, CalendarDays,
  Stethoscope, CheckSquare, CreditCard, Zap, Settings, Building2,
  BarChart3, BellRing, Plus, ArrowRight, Command,
} from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import clsx from 'clsx'

const NAV_ITEMS = [
  { group: 'Navigate', label: 'Dashboard',      href: '/dashboard',      icon: LayoutDashboard, permission: 'dashboard' },
  { group: 'Navigate', label: 'Notifications',  href: '/notifications',  icon: BellRing,        permission: 'notifications' },
  { group: 'Navigate', label: 'Reports',         href: '/reports',        icon: BarChart3,       permission: 'reports' },
  { group: 'Navigate', label: 'Leads',           href: '/leads',          icon: TrendingUp,      permission: 'leads' },
  { group: 'Navigate', label: 'Contacts',        href: '/contacts',       icon: Users,           permission: 'contacts' },
  { group: 'Navigate', label: 'Organizations',   href: '/organizations',  icon: Building2,       permission: 'organizations' },
  { group: 'Navigate', label: 'Patients',        href: '/patients',       icon: UserRound,       permission: 'patients' },
  { group: 'Navigate', label: 'Appointments',    href: '/appointments',   icon: CalendarDays,    permission: 'appointments' },
  { group: 'Navigate', label: 'Consultations',   href: '/consultation',   icon: Stethoscope,     permission: 'consultations' },
  { group: 'Navigate', label: 'Tasks',           href: '/tasks',          icon: CheckSquare,     permission: 'tasks' },
  { group: 'Navigate', label: 'Billing',         href: '/billing',        icon: CreditCard,      permission: 'billing' },
  { group: 'Navigate', label: 'Automation',      href: '/automation',     icon: Zap,             permission: 'automation' },
  { group: 'Navigate', label: 'Settings',        href: '/settings',       icon: Settings,        permission: 'settings' },
  { group: 'Create',   label: 'New Lead',        href: '/leads/new',      icon: Plus,            permission: 'leads.create' },
  { group: 'Create',   label: 'New Patient',     href: '/patients/new',   icon: Plus,            permission: 'patients.create' },
  { group: 'Create',   label: 'New Appointment', href: '/appointments/new', icon: Plus,          permission: 'appointments.create' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef()
  const listRef = useRef()
  const router = useRouter()
  const { hasPermission } = useOrg()

  const visibleItems = NAV_ITEMS.filter(item =>
    (!item.permission || hasPermission(item.permission)) &&
    (!query.trim() || item.label.toLowerCase().includes(query.toLowerCase()))
  )

  const groups = [...new Set(visibleItems.map(i => i.group))]

  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery('')
    setCursor(0)
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) setOpen(false)
        else openPalette()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, openPalette])

  useEffect(() => {
    setCursor(0)
  }, [query])

  const navigate = (href) => {
    setOpen(false)
    router.push(href)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, visibleItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && visibleItems[cursor]) {
      navigate(visibleItems[cursor].href)
    }
  }

  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-(--color-border)">
          <Search size={17} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages or actions..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          <kbd
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-600 border border-(--color-border)"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {visibleItems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
              No results for &quot;{query}&quot;
            </p>
          ) : (
            groups.map((group) => {
              const items = visibleItems.filter(i => i.group === group)
              return (
                <div key={group} className="mb-1">
                  <p className="px-4 py-1.5 text-[10px] font-700 uppercase tracking-widest"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {group}
                  </p>
                  {items.map((item) => {
                    const idx = visibleItems.indexOf(item)
                    const active = idx === cursor
                    return (
                      <button
                        key={item.href}
                        data-active={active}
                        onClick={() => navigate(item.href)}
                        onMouseEnter={() => setCursor(idx)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-500 transition-colors text-left'
                        )}
                        style={active
                          ? { background: 'var(--color-brand)', color: 'white' }
                          : { color: 'var(--color-text-primary)' }
                        }
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={active
                            ? { background: 'rgba(255,255,255,0.2)' }
                            : { background: 'var(--color-brand-50)' }
                          }
                        >
                          <item.icon size={14} style={{ color: active ? 'white' : 'var(--color-brand)' }} />
                        </div>
                        <span className="flex-1">{item.label}</span>
                        {active && <ArrowRight size={14} className="opacity-70" />}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-t border-(--color-border)"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            <span className="flex items-center gap-1"><kbd className="font-600">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="font-600">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="font-600">Esc</kbd> close</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            <Command size={10} />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  )
}
