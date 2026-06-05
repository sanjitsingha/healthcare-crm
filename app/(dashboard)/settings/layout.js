'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Tags, LayoutGrid, UserRound, Plug, Workflow, LayoutTemplate } from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { href: '/settings/account',       label: 'Account',       icon: UserRound },
  { href: '/settings/organization',  label: 'Organization',  icon: Building2 },
  { href: '/settings/people',        label: 'People',        icon: Users },
  { href: '/settings/tags',          label: 'Tags',          icon: Tags },
  { href: '/settings/modules',       label: 'Modules',       icon: LayoutGrid },
  { href: '/settings/layout-builder', label: 'Layout Builder', icon: LayoutTemplate },
  { href: '/settings/rules',         label: 'Rules',         icon: Workflow },
  { href: '/settings/configuration', label: 'Configuration', icon: Plug },
]

export default function SettingsLayout({ children }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <aside
        className="w-52 shrink-0 border-r border-(--color-border) sticky top-0 h-screen flex flex-col p-4"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="mb-6">
          <h2 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage your workspace</p>
        </div>

        <nav className="space-y-0.5 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  !active && 'hover:bg-(--color-brand-50)'
                )}
                style={active
                  ? { background: 'var(--color-brand)', color: 'white' }
                  : { color: 'var(--color-text-secondary)' }}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
