'use client'
import { useEffect } from 'react'
import { useOrg } from '@/lib/context/OrgContext'
import { applyTheme, DEFAULT_THEME } from '@/lib/theme'
import { getPref } from '@/lib/prefs'

// Applies the saved color theme app-wide on load.
export default function ThemeApplier() {
  const { org } = useOrg()
  useEffect(() => {
    const stored = getPref('app_theme')
    applyTheme(stored || org?.settings?.theme || DEFAULT_THEME)
  }, [org])
  return null
}
