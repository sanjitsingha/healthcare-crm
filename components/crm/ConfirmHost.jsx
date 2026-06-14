'use client'
import { useEffect, useState, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { subscribeConfirm } from '@/lib/confirm'

export default function ConfirmHost() {
  const [state, setState] = useState(null)
  const cancelRef = useRef()

  useEffect(() => {
    return subscribeConfirm((opts) => {
      setState(opts)
      // Focus cancel button on open (safer default)
      setTimeout(() => cancelRef.current?.focus(), 50)
    })
  }, [])

  useEffect(() => {
    if (!state) return
    const onKey = (e) => {
      if (e.key === 'Escape') { state.resolve(false); setState(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])

  if (!state) return null

  const { title, message, confirmLabel = 'Delete', variant = 'danger', resolve } = state

  const confirm = () => { resolve(true); setState(null) }
  const cancel  = () => { resolve(false); setState(null) }

  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) cancel() }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)' }}
      >
        <button
          onClick={cancel}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-(--color-surface-2) transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: isDanger ? '#fee2e2' : 'var(--color-brand-50)' }}
          >
            <AlertTriangle size={18} style={{ color: isDanger ? '#dc2626' : 'var(--color-brand)' }} />
          </div>
          <div>
            <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>
              {title || 'Are you sure?'}
            </p>
            {message && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={cancel}
            className="px-4 py-2 rounded-lg text-sm font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            className="px-4 py-2 rounded-lg text-sm font-600 text-white transition-opacity hover:opacity-90"
            style={{ background: isDanger ? '#dc2626' : 'var(--color-brand)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
