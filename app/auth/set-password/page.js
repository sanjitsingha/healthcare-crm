'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false); return }
    // Mark staff member as active in org settings (best-effort)
    await fetch('/api/member/activate', { method: 'POST' }).catch(() => {})
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#dcfce7' }}>
            <ShieldCheck size={32} style={{ color: '#15803d' }} />
          </div>
          <h1 className="text-xl font-700 mb-1" style={{ color: 'var(--color-text-primary)' }}>All set!</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Redirecting you to the dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--color-brand-50)' }}>
            <ShieldCheck size={24} style={{ color: 'var(--color-brand)' }} />
          </div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Set your password</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Choose a password to complete your account setup
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-6 rounded-2xl border border-(--color-border)"
          style={{ background: 'var(--color-surface)' }}
        >
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs font-500" style={{ background: '#fee2e2', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>New Password *</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Min 8 characters"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
                className="w-full pr-9 px-3 py-2.5 text-sm rounded-lg border border-(--color-border) outline-none"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError('') }}
                required
                className="w-full pr-9 px-3 py-2.5 text-sm rounded-lg border border-(--color-border) outline-none"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}>
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-600 text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--color-brand)' }}
          >
            {loading ? 'Setting password…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
