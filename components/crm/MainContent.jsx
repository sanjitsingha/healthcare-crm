'use client'
import { useSidebar } from '@/lib/context/SidebarContext'

// Static strings so Tailwind v4 scanner picks up both classes
const _expanded = 'md:ml-[220px]'
const _collapsed = 'md:ml-16'

export default function MainContent({ children }) {
  const { collapsed } = useSidebar()
  return (
    <main
      className={`flex-1 min-w-0 transition-all duration-300 ${collapsed ? _collapsed : _expanded}`}
    >
      {children}
    </main>
  )
}
