'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail } from 'lucide-react'

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [tokenData, setTokenData] = useState(null)

  useEffect(() => {
    // PKCE flow: ?code=XXX
    const code = searchParams.get('code')
    if (code) { setTokenData({ kind: 'code', code }); return }

    // Direct OTP: ?token_hash=XXX&type=invite
    const tokenHash = searchParams.get('token_hash')
    if (tokenHash) { setTokenData({ kind: 'otp', tokenHash, type: searchParams.get('type') || 'invite' }); return }

    // Implicit flow: #access_token=XXX&refresh_token=XXX&type=invite
    const hash = window.location.hash.slice(1)
    if (hash) {
      const p = new URLSearchParams(hash)
      const accessToken = p.get('access_token')
      const refreshToken = p.get('refresh_token')
      if (accessToken) {
        setTokenData({ kind: 'session', accessToken, refreshToken })
        return
      }
    }

    setTokenData(null) // nothing found
  }, [searchParams])

  const handleAccept = async () => {
    if (!tokenData) return
    setProcessing(true); setError('')
    const supabase = createClient()
    let user = null

    try {
      if (tokenData.kind === 'code') {
        const { data, error: err } = await supabase.auth.exchangeCodeForSession(tokenData.code)
        if (err) throw err
        user = data?.user
      } else if (tokenData.kind === 'otp') {
        const { data, error: err } = await supabase.auth.verifyOtp({
          token_hash: tokenData.tokenHash,
          type: tokenData.type,
        })
        if (err) throw err
        user = data?.user
      } else if (tokenData.kind === 'session') {
        const { data, error: err } = await supabase.auth.setSession({
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken,
        })
        if (err) throw err
        user = data?.user
      }

      if (user) {
        const orgId = user.user_metadata?.org_id
        if (orgId) {
          await supabase.from('profiles').upsert({
            id: user.id,
            organization_id: orgId,
            full_name: user.user_metadata?.name || user.email,
          })
        }
      }

      router.push('/auth/set-password')
    } catch (err) {
      setError(err.message)
      setProcessing(false)
    }
  }

  const hasToken = tokenData !== null

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--color-brand-50)' }}>
          <Mail size={28} style={{ color: 'var(--color-brand)' }} />
        </div>
        <h1 className="text-xl font-700 mb-2" style={{ color: 'var(--color-text-primary)' }}>
          You've been invited
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Click below to accept your invitation and set up your account.
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs font-500"
            style={{ background: '#fee2e2', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        {hasToken ? (
          <button
            onClick={handleAccept}
            disabled={processing}
            className="w-full py-3 px-4 rounded-xl text-sm font-600 text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--color-brand)' }}
          >
            {processing ? 'Accepting…' : 'Accept Invitation'}
          </button>
        ) : (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            No invitation token found. This link may be expired or already used.
          </div>
        )}
      </div>
    </div>
  )
}
