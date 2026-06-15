'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Boxes, ShoppingCart, Truck, Users, ArrowLeftRight, Pill,
} from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { href: '/pharmacy',              label: 'Overview',      icon: LayoutDashboard },
  { href: '/pharmacy/inventory',    label: 'Inventory',     icon: Boxes },
  { href: '/pharmacy/billing',      label: 'Billing',       icon: ShoppingCart },
  { href: '/pharmacy/purchases',    label: 'Purchases',     icon: Truck },
  { href: '/pharmacy/suppliers',    label: 'Suppliers',     icon: Users },
  { href: '/pharmacy/transactions', label: 'Transactions',  icon: ArrowLeftRight },
]

export default function PharmacyLayout({ children }) {
  const pathname = usePathname()

  const isActive = (href) =>
    href === '/pharmacy'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <aside
        className="w-52 shrink-0 border-r border-(--color-border) h-screen flex flex-col p-4"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="mb-6 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
            <Pill size={16} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <h2 className="text-base font-700 tracking-tight leading-none" style={{ color: 'var(--color-text-primary)' }}>Pharmacy</h2>
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Inventory & sales</p>
          </div>
        </div>

        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
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
