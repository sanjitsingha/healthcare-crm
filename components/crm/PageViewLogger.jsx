'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { logAudit, AUDIT } from '@/lib/audit'

// Maps exact paths to human-readable page names.
const EXACT = {
  '/':                    'Dashboard',
  '/dashboard':           'Dashboard',
  '/leads':               'Leads List',
  '/leads/new':           'New Lead Form',
  '/patients':            'Patients List',
  '/appointments':        'Appointments',
  '/appointments/new':    'New Appointment Form',
  '/contacts':            'Contacts',
  '/settings':            'Settings',
  '/settings/account':    'Account Settings',
  '/settings/modules':    'Module Settings',
  '/settings/users':      'Users & Team Members',
  '/settings/doctors':    'Doctors',
  '/settings/departments': 'Departments',
  '/settings/logs':       'Audit Logs',
  '/settings/branding':   'Branding Settings',
  '/settings/billing':    'Billing',
}

// Matches dynamic segments and returns a label.
function resolveLabel(path) {
  if (EXACT[path]) return EXACT[path]
  if (/^\/leads\/[^/]+$/.test(path))        return 'Lead Record'
  if (/^\/patients\/[^/]+$/.test(path))     return 'Patient Record'
  if (/^\/appointments\/[^/]+$/.test(path)) return 'Appointment Record'
  // Fallback: capitalise the last segment
  const seg = path.split('/').filter(Boolean).pop() || ''
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
}

export default function PageViewLogger() {
  const pathname = usePathname()
  const lastLogged = useRef(null)

  useEffect(() => {
    if (!pathname || pathname === lastLogged.current) return
    lastLogged.current = pathname

    const label = resolveLabel(pathname)
    logAudit({
      action:      AUDIT.PAGE_VIEW,
      description: `Viewed ${label}`,
      metadata:    { path: pathname, page: label },
    })
  }, [pathname])

  return null
}
