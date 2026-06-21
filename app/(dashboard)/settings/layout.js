'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, Users, Tags, LayoutGrid, UserRound, Plug, Workflow, ScrollText,
  ClipboardList, Stethoscope, Network, ShieldCheck, FileText, CreditCard,
} from 'lucide-react'
import clsx from 'clsx'
import { useOrg } from '@/lib/context/OrgContext'

// permission: null = always visible (own account page)
const NAV_ITEMS = [
  { href: '/settings/account',       label: 'Account',       icon: UserRound,    permission: null },
  { href: '/settings/subscription',  label: 'Subscription',  icon: CreditCard,   permission: null },
  { href: '/settings/organization',  label: 'Organization',  icon: Building2,    permission: 'settings.organization' },
  { href: '/settings/users',         label: 'Users',         icon: Users,        permission: 'settings.users' },
  { href: '/settings/roles',         label: 'Roles',         icon: ShieldCheck,  permission: 'settings.roles' },
  { href: '/settings/doctors',       label: 'Doctors',       icon: Stethoscope,  permission: 'settings.doctors' },
  { href: '/settings/departments',   label: 'Departments',   icon: Network,      permission: 'settings.departments' },
  { href: '/settings/tags',          label: 'Tags',          icon: Tags,         permission: 'settings.tags' },
  { href: '/settings/modules',       label: 'Modules',       icon: LayoutGrid,   permission: 'settings.modules' },
  { href: '/settings/templates',     label: 'Templates',     icon: FileText,     permission: 'settings.templates' },
  { href: '/settings/services',      label: 'Services',      icon: ClipboardList,permission: 'settings.services' },
  { href: '/settings/rules',         label: 'Workflow Rules',icon: Workflow,     permission: 'settings.rules' },
  { href: '/settings/configuration', label: 'Integrations',  icon: Plug,         permission: 'settings.configuration' },
  { href: '/settings/logs',          label: 'Logs',          icon: ScrollText,   permission: 'settings.logs' },
]

export default function SettingsLayout({ children }) {
  const pathname = usePathname()
  const { hasPermission } = useOrg()

  const visibleItems = NAV_ITEMS.filter(item =>
    item.permission === null || hasPermission(item.permission)
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <aside
        className="w-52 shrink-0 border-r border-(--color-border) h-screen flex flex-col p-4"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="mb-6">
          <h2 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage your workspace</p>
        </div>

        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          {visibleItems.map(({ href, label, icon: Icon }) => {
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

      <div className="flex-1 min-w-0 h-screen overflow-y-auto p-6 pb-16">
        {children}
      </div>
    </div>
  )
}
