'use client'
import { useEffect, useState } from 'react'
import { Cookie } from 'lucide-react'
import { hasConsentChoice, setConsent } from '@/lib/prefs'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasConsentChoice()) setVisible(true)
  }, [])

  const accept = () => {
    setConsent(true)
    setVisible(false)
  }

  const reject = () => {
    setConsent(false)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes cookie-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-6 px-6 py-9 flex-wrap"
        style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          boxShadow: '0 -4px 24px rgba(0,0,0,.09)',
          animation: 'cookie-slide-up 420ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex items-start gap-3.5 flex-1 min-w-72">
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-brand-50)' }}
          >
            <Cookie size={20} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div className="max-w-2xl">
            <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>
              We value your privacy
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              We use cookies to keep you signed in, secure your account, remember your preferences,
              and analyze platform usage. You can accept all cookies or manage your preferences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={reject}
            className="text-xs font-600 px-4 py-2 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={accept}
            className="text-xs font-600 px-5 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-brand)', color: '#fff' }}
          >
            Accept All
          </button>
        </div>
      </div>
    </>
  )
}
