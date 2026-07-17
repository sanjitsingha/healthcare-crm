'use client'
import { useEffect } from 'react'
import { applyTheme } from '@/lib/theme'

// Applies the single app primary color (#393E9A) app-wide on load.
export default function ThemeApplier() {
  useEffect(() => {
    applyTheme()
  }, [])
  return null
}
