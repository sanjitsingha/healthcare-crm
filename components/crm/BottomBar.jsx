'use client'
import Link from 'next/link'
import { LifeBuoy, Sparkles } from 'lucide-react'
import { useSidebar } from '@/lib/context/SidebarContext'
import { useAIPanel } from '@/lib/context/AIPanelContext'
import NotificationBell from '@/components/crm/NotificationBell'
import ZeoPanel from '@/components/crm/ZeoPanel'

// Static strings so Tailwind v4 scanner picks up all classes
const _expanded  = 'md:left-[220px]'
const _collapsed = 'md:left-16'
const _panelOpen = 'md:right-[420px]'

export default function BottomBar() {
  const { collapsed } = useSidebar()
  const { open, setOpen } = useAIPanel()

  return (
    <>
      <div
        className={`fixed bottom-0 right-0 left-0 z-30 h-11 border-t border-(--color-border) flex items-center justify-between px-4 ${collapsed ? _collapsed : _expanded} ${open ? _panelOpen : ''}`}
        style={{
          background: 'var(--color-surface)',
          transition: 'left 300ms ease-in-out, right 300ms ease-in-out',
        }}
      >
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} HealthCRM
        </span>

        <div className="flex items-center gap-2.5">
          {/* Ask Zeo — animated outline button */}
          <span
            className="relative rounded-full p-[1.5px]"
            style={{
              background: 'linear-gradient(90deg, var(--color-brand), #a78bfa, #38bdf8, #a78bfa, var(--color-brand))',
              backgroundSize: '300% 100%',
              animation: 'ai-border 3s linear infinite',
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-700 text-white transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: 'var(--color-brand)' }}
            >
              <Sparkles size={13} style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.9))' }} />
              <span style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.7))' }}>Ask Zeo</span>
            </button>
          </span>

          <Link
            href="/tickets/new"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <LifeBuoy size={13} /> Raise a Complaint
          </Link>

          <NotificationBell />
        </div>
      </div>

      <style>{`@keyframes ai-border{0%{background-position:0% 0%}100%{background-position:300% 0%}}`}</style>

      <ZeoPanel />
    </>
  )
}
