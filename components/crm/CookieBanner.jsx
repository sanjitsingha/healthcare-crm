'use client'
import { useEffect, useState } from 'react'
import { Cookie } from 'lucide-react'
import { getConsent, setConsent } from '@/lib/prefs'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!getConsent()) setVisible(true)
  }, [])

  const accept = () => {
    setConsent()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-5 py-3.5 flex-wrap"
      style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: '0 -2px 12px rgba(0,0,0,.07)',
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Cookie size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
        <div>
          <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>
            We use local storage to save your preferences
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            This includes your column layout, theme, and sidebar state — nothing is sent to any third party.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs px-3 py-1.5 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-brand-50)"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={accept}
          className="text-xs font-600 px-4 py-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--color-brand)', color: '#fff' }}
        >
          Accept All
        </button>
      </div>
    </div>
  )
}
