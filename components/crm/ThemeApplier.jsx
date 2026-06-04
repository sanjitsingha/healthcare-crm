'use client'
import { useEffect } from 'react'
import { useOrg } from '@/lib/context/OrgContext'
import { applyTheme, DEFAULT_THEME } from '@/lib/theme'

// Applies the saved color theme app-wide on load.
export default function ThemeApplier() {
  const { org } = useOrg()
  useEffect(() => {
    let stored = null
    try { stored = localStorage.getItem('app_theme') } catch { /* ignore */ }
    applyTheme(stored || org?.settings?.theme || DEFAULT_THEME)
  }, [org])
  return null
}
