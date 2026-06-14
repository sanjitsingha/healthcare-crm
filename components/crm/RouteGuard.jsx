'use client'
import { usePathname, useRouter } from 'next/navigation'
import { ShieldOff, ArrowLeft, Home } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'

// Maps route prefixes → permission key required to visit them.
// Order matters: more specific patterns first.
const ROUTE_PERMISSIONS = [
  { pattern: '/settings',       permission: 'settings' },
  { pattern: '/leads',          permission: 'leads' },
  { pattern: '/contacts',       permission: 'contacts' },
  { pattern: '/organizations',  permission: 'organizations' },
  { pattern: '/patients',       permission: 'patients' },
  { pattern: '/appointments',   permission: 'appointments' },
  { pattern: '/consultation',   permission: 'consultations' },
  { pattern: '/tasks',          permission: 'tasks' },
  { pattern: '/billing',        permission: 'billing' },
  { pattern: '/automation',     permission: 'automation' },
  { pattern: '/reports',        permission: 'reports' },
  { pattern: '/notifications',  permission: 'notifications' },
]

function AccessDenied({ pathname }) {
  const router = useRouter()
  const { userRoleName } = useOrg()

  // Extract a readable page name from the path
  const segment = pathname.split('/').filter(Boolean)[0] || 'this page'
  const pageName = segment.charAt(0).toUpperCase() + segment.slice(1)

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <ShieldOff size={28} style={{ color: 'var(--color-text-muted)' }} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-700 mb-4"
          style={{ background: '#fef2f2', color: '#dc2626' }}>
          403 · Access Restricted
        </div>

        <h1 className="text-xl font-800 tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
          You can&apos;t access {pageName}
        </h1>
        <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {userRoleName
            ? <>Your role (<strong style={{ color: 'var(--color-brand)' }}>{userRoleName}</strong>) doesn&apos;t have permission to view this page.</>
            : "Your role doesn't have permission to view this page."}
        </p>
        <p className="text-sm mb-7" style={{ color: 'var(--color-text-muted)' }}>
          Contact your administrator to request access.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 border border-(--color-border) hover:bg-(--color-surface-2) transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft size={15} /> Go back
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 text-white transition-colors"
            style={{ background: 'var(--color-brand)' }}
          >
            <Home size={15} /> Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RouteGuard({ children }) {
  const pathname = usePathname()
  const { hasPermission, userPermissions } = useOrg()

  // Owners (userPermissions === null) always have full access
  if (userPermissions === null) return children

  const matched = ROUTE_PERMISSIONS.find(r => pathname === r.pattern || pathname.startsWith(r.pattern + '/'))
  if (matched && !hasPermission(matched.permission)) {
    return <AccessDenied pathname={pathname} />
  }

  return children
}
