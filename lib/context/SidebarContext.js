'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { getPref, setPref } from '@/lib/prefs'

const SidebarContext = createContext({ collapsed: false, toggle: () => {} })

export function SidebarStateProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = getPref('pref_sidebar_collapsed')
    if (saved === true) setCollapsed(true)
  }, [])

  const toggle = () => setCollapsed(c => {
    const next = !c
    setPref('pref_sidebar_collapsed', next)
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
