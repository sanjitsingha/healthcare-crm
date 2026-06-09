'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LifeBuoy, Sparkles } from 'lucide-react'
import { useSidebar } from '@/lib/context/SidebarContext'
import NotificationBell from '@/components/crm/NotificationBell'
import ZeoPanel from '@/components/crm/ZeoPanel'

// Static strings so Tailwind v4 scanner picks up both classes
const _expanded = 'md:left-[220px]'
const _collapsed = 'md:left-16'

export default function BottomBar() {
  const { collapsed } = useSidebar()
  const [zeoOpen, setZeoOpen] = useState(false)
  return (
    <>
      <div
        className={`fixed bottom-0 right-0 left-0 z-30 h-10 border-t border-(--color-border) flex items-center justify-between px-4 transition-all duration-300 ${collapsed ? _collapsed : _expanded}`}
        style={{ background: 'var(--color-surface)' }}
      >
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} HealthCRM
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZeoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-700 text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, var(--color-brand), var(--color-brand-light, #3a43b5))' }}
          >
            <Sparkles size={13} /> Ask Zeo
          </button>
          <Link
            href="/tickets/new"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-600 transition-opacity hover:opacity-85"
            style={{ background: 'var(--color-brand)', color: 'white' }}
          >
            <LifeBuoy size={13} /> Raise a Complaint
          </Link>
          <NotificationBell />
        </div>
      </div>

      <ZeoPanel open={zeoOpen} onClose={() => setZeoOpen(false)} />
    </>
  )
}
