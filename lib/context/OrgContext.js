'use client'
import { createContext, useContext, useMemo } from 'react'

const OrgContext = createContext(null)

// userPermissions: string[] | null  (null = owner/full access, array = restricted)
export function OrgProvider({ org, user, userPermissions = null, userRoleName = null, subscription = null, subscriptionAccess = null, children }) {
  const permSet = useMemo(
    () => (userPermissions ? new Set(userPermissions) : null),
    [userPermissions]
  )

  const hasPermission = (key) => {
    if (!permSet) return true // no role record = full access (owner)
    return permSet.has(key)
  }

  return (
    <OrgContext.Provider value={{ org, user, orgId: org?.id ?? null, userPermissions: permSet, userRoleName, subscription, subscriptionAccess, isReadOnly: subscriptionAccess ? !subscriptionAccess.writable : false, hasPermission }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  return ctx ?? { org: null, user: null, orgId: null, userPermissions: null, subscription: null, subscriptionAccess: null, isReadOnly: false, hasPermission: () => true }
}
