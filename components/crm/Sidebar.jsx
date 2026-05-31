'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, TrendingUp,
  CheckSquare, Heart, Menu, X, ChevronRight,
  UserRound, CalendarDays, CreditCard, Zap,
  Settings, ChevronsLeft, ChevronsRight, Bell,
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { useOrg } from '@/lib/context/OrgContext'
import { useSidebar } from '@/lib/context/SidebarContext'

const navItems = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads',         icon: TrendingUp,      label: 'Leads' },
  { href: '/patients',      icon: UserRound,       label: 'Patients' },
  { href: '/appointments',  icon: CalendarDays,    label: 'Appointments' },
  { href: '/billing',       icon: CreditCard,      label: 'Billing & Finance' },
  { href: '/contacts',      icon: Users,           label: 'Contacts' },
  { href: '/organizations', icon: Building2,       label: 'Organizations' },
  { href: '/tasks',         icon: CheckSquare,     label: 'Tasks' },
  { href: '/followups',     icon: Bell,            label: 'Follow-ups' },
  { href: '/automation',    icon: Zap,             label: 'Automation' },
]

function UserAvatar({ name }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-600 text-white shrink-0"
      style={{ background: 'var(--color-brand)' }}
    >
      {initials}
    </div>
  )
}

function OrgLogo({ logoUrl, orgName }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={orgName}
        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-(--color-border)"
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling?.style.removeProperty('display') }}
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand)' }}>
      <Heart size={16} className="text-white" />
    </div>
  )
}

function SidebarContent({ pathname, setMobileOpen, forceExpanded = false }) {
  const { org, user } = useOrg()
  const { collapsed: _collapsed, toggle } = useSidebar()
  const collapsed = forceExpanded ? false : _collapsed

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''
  const orgName = org?.name || 'Your Clinic'

  const isActive = (href) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  const navLinkClass = (active) =>
    clsx(
      'flex items-center rounded-lg text-sm font-medium transition-all',
      collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
      active ? 'text-white' : 'hover:bg-(--color-brand-50)'
    )

  const navLinkStyle = (active) =>
    active
      ? { background: 'var(--color-brand)', color: 'white' }
      : { color: 'var(--color-text-secondary)' }

  return (
    <div className="flex flex-col h-full">
      {/* Logo + collapse toggle */}
      <div
        className={clsx(
          'flex items-center border-b border-(--color-border)',
          collapsed ? 'flex-col gap-2 px-3 py-4' : 'gap-2.5 px-4 py-4'
        )}
      >
        {!collapsed ? (
          <>
            <OrgLogo logoUrl={org?.settings?.logo_url} orgName={orgName} />
            <div className="flex-1 min-w-0">
              <span className="font-700 text-sm tracking-tight block truncate" style={{ color: 'var(--color-text-primary)' }}>
                {orgName}
              </span>
              <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>Healthcare CRM</p>
            </div>
            <button
              onClick={toggle}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
              title="Collapse sidebar"
            >
              <ChevronsLeft size={16} />
            </button>
          </>
        ) : (
          <>
            <OrgLogo logoUrl={org?.settings?.logo_url} orgName={orgName} />
            <button
              onClick={toggle}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Expand sidebar"
            >
              <ChevronsRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={navLinkClass(active)}
              style={navLinkStyle(active)}
            >
              <Icon size={17} />
              {!collapsed && label}
              {!collapsed && active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: user info + settings */}
      <div className="px-2 pb-4 border-t border-(--color-border) pt-3 space-y-1">
        {!collapsed ? (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
            style={{ background: 'var(--color-brand-50)' }}
          >
            <UserAvatar name={displayName} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{displayEmail}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1 mb-1">
            <UserAvatar name={displayName} />
          </div>
        )}

        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? 'Settings' : undefined}
          className={navLinkClass(isActive('/settings'))}
          style={navLinkStyle(isActive('/settings'))}
        >
          <Settings size={16} />
          {!collapsed && 'Settings'}
        </Link>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { collapsed } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-full z-20 border-r border-(--color-border) transition-all duration-300"
        style={{ width: collapsed ? '64px' : '220px', background: 'var(--color-surface)' }}
      >
        <SidebarContent pathname={pathname} setMobileOpen={setMobileOpen} />
      </aside>

      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg border border-(--color-border) bg-white"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute left-0 top-0 h-full w-64 border-r border-(--color-border)"
            style={{ background: 'var(--color-surface)' }}
          >
            <SidebarContent pathname={pathname} setMobileOpen={setMobileOpen} forceExpanded />
          </aside>
        </div>
      )}
    </>
  )
}
