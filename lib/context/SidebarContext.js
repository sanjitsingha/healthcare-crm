'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const SidebarContext = createContext({ collapsed: false, toggle: () => {} })

export function SidebarStateProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed')
      if (stored === 'true') setCollapsed(true)
    } catch {}
  }, [])

  const toggle = () => setCollapsed(c => {
    const next = !c
    try { localStorage.setItem('sidebar-collapsed', next) } catch {}
    return next
  })

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
