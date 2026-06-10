'use client'

import { useEffect, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { getGeoPermissionState, getPreciseLocation, clearGeoCache } from '@/lib/location'

const DISMISSED_KEY = 'geo_banner_dismissed'

export default function GeoPermissionBanner() {
  const [visible, setVisible] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (typeof window === 'undefined') return
      // Don't show if user dismissed before
      try { if (sessionStorage.getItem(DISMISSED_KEY)) return } catch {}
      const state = await getGeoPermissionState()
      if (!cancelled && state === 'prompt') setVisible(true)
      // If already granted, silently prefetch and cache
      if (!cancelled && state === 'granted') getPreciseLocation()
    }
    check()
    return () => { cancelled = true }
  }, [])

  const allow = async () => {
    setRequesting(true)
    clearGeoCache()
    await getPreciseLocation()   // triggers the browser permission dialog if needed
    setRequesting(false)
    setVisible(false)
  }

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISSED_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-(--color-border) max-w-sm w-full"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-brand-50)' }}>
        <MapPin size={15} style={{ color: 'var(--color-brand)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>
          Enable precise location
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Used only for audit logs and activity records.
        </p>
      </div>

      <button
        type="button"
        onClick={allow}
        disabled={requesting}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-600 text-white transition-opacity disabled:opacity-60"
        style={{ background: 'var(--color-brand)' }}
      >
        {requesting ? 'Requesting…' : 'Allow'}
      </button>

      <button type="button" onClick={dismiss}
        className="shrink-0 p-1 rounded-lg hover:bg-(--color-surface-2) transition-colors"
        style={{ color: 'var(--color-text-muted)' }}>
        <X size={14} />
      </button>
    </div>
  )
}
