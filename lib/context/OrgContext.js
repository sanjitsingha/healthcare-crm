'use client'
import { createContext, useContext } from 'react'

const OrgContext = createContext(null)

export function OrgProvider({ org, user, children }) {
  return (
    <OrgContext.Provider value={{ org, user, orgId: org?.id ?? null }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  return ctx ?? { org: null, user: null, orgId: null }
}
