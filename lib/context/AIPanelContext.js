'use client'
import { createContext, useContext, useState } from 'react'

const AIPanelContext = createContext({ open: false, setOpen: () => {} })

export function AIPanelProvider({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <AIPanelContext.Provider value={{ open, setOpen }}>
      {children}
    </AIPanelContext.Provider>
  )
}

export const useAIPanel = () => useContext(AIPanelContext)
