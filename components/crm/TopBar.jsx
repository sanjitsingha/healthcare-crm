'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback, useMemo, Fragment } from 'react'
import { ChevronRight, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useSidebar } from '@/lib/context/SidebarContext'
import { useAIPanel } from '@/lib/context/AIPanelContext'
import { useOrg } from '@/lib/context/OrgContext'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/crm/NotificationBell'

// Static strings so the Tailwind v4 scanner picks up all classes
const _expanded  = 'md:left-[220px]'
const _collapsed = 'md:left-16'
const _panelOpen = 'md:right-[420px]'

// Pretty labels for known route segments. Anything not listed is title-cased.
const LABELS = {
  dashboard: 'Dashboard',
  notifications: 'Notifications',
  reports: 'Reports',
  leads: 'Leads',
  pipeline: 'Pipeline',
  contacts: 'Contacts',
  organizations: 'Organizations',
  patients: 'Patients',
  appointments: 'Appointments',
  consultation: 'Consultations',
  tasks: 'Tasks',
  billing: 'Billing & Finance',
  transactions: 'Transactions',
  setup: 'Setup',
  pharmacy: 'Pharmacy',
  automation: 'Automation',
  settings: 'Settings',
  tickets: 'Support Tickets',
  tags: 'Tags',
  status: 'System Status',
  feedback: 'Feedback',
  new: 'New',
}

// A segment is treated as a record id (→ "Details") when it is a number or a
// uuid-like token rather than a readable slug.
const isIdSegment = (s) =>
  /^\d+$/.test(s) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)

function toLabel(seg) {
  if (LABELS[seg]) return LABELS[seg]
  if (isIdSegment(seg)) return 'Details'
  return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function useBreadcrumb() {
  const pathname = usePathname()
  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    return segments.map((seg, i) => ({
      label: toLabel(seg),
      href: '/' + segments.slice(0, i + 1).join('/'),
    }))
  }, [pathname])
}

function UserMenu() {
  const { user, userRoleName } = useOrg()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const initial = (user?.user_metadata?.name || user?.email || '?')[0].toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition-colors hover:bg-(--color-brand-50)"
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-700 text-white"
          style={{ background: 'var(--color-brand)' }}
        >
          {initial}
        </span>
        <span className="hidden sm:block text-xs font-600 max-w-30 truncate" style={{ color: 'var(--color-text-primary)' }}>
          {name}
        </span>
        <ChevronDown size={13} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl border overflow-hidden z-50 shadow-lg"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="px-3.5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
            <p className="text-[11px] truncate font-500" style={{ color: userRoleName ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>
              {userRoleName || 'Owner · Full access'}
            </p>
          </div>
          <div className="p-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-500 transition-colors hover:bg-(--color-brand-50)"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Settings size={14} /> Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-500 transition-colors hover:bg-red-50"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TopBar() {
  const { collapsed } = useSidebar()
  const { open } = useAIPanel()
  const { hasPermission } = useOrg()
  const pathname = usePathname()
  const crumbs = useBreadcrumb()
  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/')

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-30 h-13 border-b border-(--color-border) flex items-center justify-between pr-3 ${collapsed ? _collapsed : _expanded} ${open ? _panelOpen : ''}`}
      style={{
        background: 'var(--color-surface)',
        transition: 'left 300ms ease-in-out, right 300ms ease-in-out',
      }}
    >
      {/* Breadcrumb — padded left on mobile to clear the sidebar hamburger */}
      <nav className="flex items-center gap-1.5 min-w-0 pl-16 md:pl-5 overflow-hidden" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <Fragment key={c.href}>
              {i > 0 && <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />}
              {last ? (
                <span className="text-sm font-700 truncate tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="hidden sm:block text-sm font-500 truncate transition-colors hover:underline"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {c.label}
                </Link>
              )}
            </Fragment>
          )
        })}
      </nav>

      {/* Right cluster */}
      <div className="flex items-center gap-1.5 shrink-0">
        <NotificationBell />
        {hasPermission('settings') && (
          <Link
            href="/settings"
            aria-label="Settings"
            title="Settings"
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-(--color-surface-2)"
            style={{ color: settingsActive ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}
          >
            <Settings size={15} />
          </Link>
        )}
        <div className="w-px h-5 mx-1" style={{ background: 'var(--color-border)' }} />
        <UserMenu />
      </div>
    </header>
  )
}
