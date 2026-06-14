'use client'
import { useSidebar } from '@/lib/context/SidebarContext'
import { useAIPanel } from '@/lib/context/AIPanelContext'
import BottomBar from './BottomBar'

// Static strings so Tailwind v4 scanner picks up all classes
const _expanded  = 'md:ml-[220px]'
const _collapsed = 'md:ml-16'
const _panelOpen = 'md:mr-[420px]'

export default function MainContent({ children }) {
  const { collapsed } = useSidebar()
  const { open } = useAIPanel()
  return (
    <main
      className={`flex-1 min-w-0 ${collapsed ? _collapsed : _expanded} ${open ? _panelOpen : ''}`}
      style={{ transition: 'margin-left 300ms ease-in-out, margin-right 300ms ease-in-out' }}
    >
      <div className="pb-10">{children}</div>
      <BottomBar />
    </main>
  )
}
