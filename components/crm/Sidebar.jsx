'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, TrendingUp,
  CheckSquare, Bell, Settings, Heart, Menu, X, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads', icon: TrendingUp, label: 'Leads' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
  { href: '/organizations', icon: Building2, label: 'Organizations' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/followups', icon: Bell, label: 'Follow-ups' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--color-border)]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
          <Heart size={16} className="text-white" />
        </div>
        <div>
          <span className="font-700 text-sm tracking-tight" style={{ color: 'var(--color-text-primary)' }}>HealthCRM</span>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Healthcare CRM</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                active
                  ? 'text-white'
                  : 'hover:bg-[var(--color-brand-50)]'
              )}
              style={active ? { background: 'var(--color-brand)', color: 'white' } : { color: 'var(--color-text-secondary)' }}
            >
              <Icon size={17} className={active ? 'text-white' : ''} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-[var(--color-border)] pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--color-brand-50)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-600 text-white" style={{ background: 'var(--color-brand)' }}>
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>Admin User</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>admin@healthcrm.in</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-full z-20 border-r border-[var(--color-border)]"
        style={{ width: '220px', background: 'var(--color-surface)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg border border-[var(--color-border)] bg-white"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute left-0 top-0 h-full w-64 border-r border-[var(--color-border)]"
            style={{ background: 'var(--color-surface)' }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
