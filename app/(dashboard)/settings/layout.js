'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, Users, Tags, LayoutGrid, UserRound, Plug, Workflow, ScrollText,
  ClipboardList, Stethoscope, Network, ShieldCheck, FileText, CreditCard, Code2, Hash,
  ChevronDown, Zap,
} from 'lucide-react'
import clsx from 'clsx'
import { useOrg } from '@/lib/context/OrgContext'

// Top-level items (personal) — always shown, no group. permission: null = always visible.
const TOP_ITEMS = [
  { href: '/settings/account',      label: 'Account',      icon: UserRound,  permission: null },
  { href: '/settings/subscription', label: 'Subscription', icon: CreditCard, permission: null },
]

// Grouped items — each parent holds related children.
const GROUPS = [
  {
    label: 'Organization', icon: Building2,
    children: [
      { href: '/settings/organization', label: 'Organization', icon: Building2,   permission: 'settings.organization' },
      { href: '/settings/departments',  label: 'Departments',  icon: Network,     permission: 'settings.departments' },
      { href: '/settings/doctors',      label: 'Doctors',      icon: Stethoscope, permission: 'settings.doctors' },
      { href: '/settings/id-formats',   label: 'ID Formats',   icon: Hash,        permission: 'settings.organization' },
    ],
  },
  {
    label: 'Users & Access', icon: ShieldCheck,
    children: [
      { href: '/settings/users', label: 'Users', icon: Users,       permission: 'settings.users' },
      { href: '/settings/roles', label: 'Roles', icon: ShieldCheck, permission: 'settings.roles' },
    ],
  },
  {
    label: 'Customization', icon: LayoutGrid,
    children: [
      { href: '/settings/tags',      label: 'Tags',      icon: Tags,          permission: 'settings.tags' },
      { href: '/settings/modules',   label: 'Modules',   icon: LayoutGrid,    permission: 'settings.modules' },
      { href: '/settings/templates', label: 'Templates', icon: FileText,      permission: 'settings.templates' },
      { href: '/settings/services',  label: 'Services',  icon: ClipboardList, permission: 'settings.services' },
    ],
  },
  {
    label: 'Automation', icon: Workflow,
    children: [
      { href: '/automation',             label: 'Automation',     icon: Zap,      permission: 'automation' },
      { href: '/settings/rules',         label: 'Workflow Rules', icon: Workflow, permission: 'settings.rules' },
      { href: '/settings/configuration', label: 'Integrations',   icon: Plug,     permission: 'settings.configuration' },
      { href: '/settings/developer',     label: 'Developer Hub',  icon: Code2,    permission: 'settings.configuration' },
    ],
  },
]

// Bottom-level items — standalone, no group.
const BOTTOM_ITEMS = [
  { href: '/settings/logs', label: 'Logs', icon: ScrollText, permission: 'settings.logs' },
]

export default function SettingsLayout({ children }) {
  const pathname = usePathname()
  const { hasPermission } = useOrg()

  const canSee = (item) => item.permission === null || hasPermission(item.permission)

  // Only groups with at least one visible child are shown.
  const visibleGroups = GROUPS
    .map(g => ({ ...g, children: g.children.filter(canSee) }))
    .filter(g => g.children.length > 0)

  // Expand every group by default; the one holding the active page stays open too.
  const [openGroups, setOpenGroups] = useState(() => new Set(visibleGroups.map(g => g.label)))
  const toggleGroup = (label) =>
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })

  const linkClass = (active) => clsx(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
    !active && 'hover:bg-(--color-brand-50)'
  )
  const linkStyle = (active) => active
    ? { background: 'var(--color-brand)', color: 'white' }
    : { color: 'var(--color-text-secondary)' }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <aside
        className="w-60 shrink-0 border-r border-(--color-border) h-screen flex flex-col p-4"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="mb-6">
          <h2 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage your workspace</p>
        </div>

        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          {/* Top-level personal items */}
          {TOP_ITEMS.filter(canSee).map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} className={linkClass(active)} style={linkStyle(active)}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}

          {/* Grouped items */}
          {visibleGroups.map(group => {
            const GroupIcon = group.icon
            const isOpen = openGroups.has(group.label)
            const hasActiveChild = group.children.some(c => c.href === pathname)
            return (
              <div key={group.label} className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all hover:bg-(--color-brand-50)"
                  style={{ color: hasActiveChild ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}
                >
                  <GroupIcon size={16} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    size={14}
                    style={{ transform: isOpen ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 space-y-0.5 pl-2 ml-2 border-l border-(--color-border)">
                    {group.children.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href
                      return (
                        <Link key={href} href={href} className={linkClass(active)} style={linkStyle(active)}>
                          <Icon size={16} />
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Bottom-level standalone items */}
          {BOTTOM_ITEMS.filter(canSee).length > 0 && (
            <div className="pt-2 mt-2 border-t border-(--color-border)">
              {BOTTOM_ITEMS.filter(canSee).map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link key={href} href={href} className={linkClass(active)} style={linkStyle(active)}>
                    <Icon size={16} />
                    {label}
                  </Link>
                )
              })}
            </div>
          )}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 h-screen overflow-y-auto p-6 pb-16">
        {children}
      </div>
    </div>
  )
}
