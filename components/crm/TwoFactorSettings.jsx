'use client'
import { useEffect, useState } from 'react'
import { ShieldCheck, Smartphone, Copy, Check, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

function SectionHead({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-4 pb-4 border-b border-(--color-border)">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
        <Icon size={16} style={{ color: 'var(--color-brand)' }} />
      </div>
      <div>
        <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {description && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      </div>
    </div>
  )
}

export default function TwoFactorSettings() {
  const supabase = createClient()
  const [factors, setFactors]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [enrolling, setEnrolling] = useState(null)  // { factorId, qr, secret }
  const [code, setCode]         = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      setFactors(data?.totp || [])
    } catch { setFactors([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const verified = factors.find(f => f.status === 'verified')

  const startEnroll = async () => {
    setError(''); setBusy(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator (${new Date().toLocaleDateString()})` })
      if (error) throw error
      setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const cancelEnroll = async () => {
    if (enrolling) { try { await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId }) } catch { /* ignore */ } }
    setEnrolling(null); setCode(''); setError('')
  }

  const verifyEnroll = async (e) => {
    e?.preventDefault?.()
    if (!enrolling || code.replace(/\s/g, '').length < 6) return
    setBusy(true); setError('')
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enrolling.factorId, challengeId: ch.id, code: code.replace(/\s/g, '') })
      if (vErr) throw vErr
      setEnrolling(null); setCode(''); await load()
    } catch (e) { setError('Invalid code. Try again.') }
    finally { setBusy(false) }
  }

  const remove = async (factorId) => {
    if (!confirm('Disable two-factor authentication? You will no longer be asked for a code at sign-in.')) return
    setBusy(true); setError('')
    try { await supabase.auth.mfa.unenroll({ factorId }); await load() }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const copySecret = async () => {
    try { await navigator.clipboard.writeText(enrolling.secret); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  return (
    <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-surface)' }}>
      <SectionHead icon={ShieldCheck} title="Two-Factor Authentication" description="Add a second step at sign-in using Google Authenticator or any TOTP app" />

      {error && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: '#fee2e2', color: '#b91c1c' }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : enrolling ? (
        /* ── Enrollment flow ── */
        <div className="space-y-4">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            1. Open <span className="font-600">Google Authenticator</span> (or Authy, 1Password…), tap <span className="font-600">+</span>, and scan this QR code.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="p-3 rounded-xl border border-(--color-border) bg-white shrink-0">
              {/* Supabase returns an SVG data-URI usable as img src */}
              <img src={enrolling.qr} alt="2FA QR code" className="w-40 h-40" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <p className="text-[10px] font-600 uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Can't scan? Enter this key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono break-all" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>{enrolling.secret}</code>
                  <button type="button" onClick={copySecret} className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors shrink-0" style={{ color: copied ? '#15803d' : 'var(--color-text-muted)' }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <form onSubmit={verifyEnroll}>
                <p className="text-[10px] font-600 uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>2. Enter the 6-digit code</p>
                <div className="flex items-center gap-2">
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    className="w-32 px-3 py-2 rounded-lg border text-sm font-mono tracking-widest outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                  />
                  <Button type="submit" size="sm" disabled={busy || code.length < 6}>{busy ? 'Verifying…' : 'Verify & Enable'}</Button>
                  <Button variant="secondary" size="sm" type="button" onClick={cancelEnroll}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : verified ? (
        /* ── Enabled state ── */
        <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#dcfce7' }}>
            <ShieldCheck size={18} style={{ color: '#15803d' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-600" style={{ color: '#15803d' }}>Two-factor authentication is on</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>You'll enter a code from your authenticator app at sign-in.</p>
          </div>
          <button type="button" onClick={() => remove(verified.id)} disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors hover:bg-red-50 shrink-0"
            style={{ borderColor: '#fecaca', color: '#b91c1c' }}>
            <Trash2 size={13} /> Disable
          </button>
        </div>
      ) : (
        /* ── Not enabled ── */
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <Smartphone size={16} style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Protect your account with a time-based one-time code from an authenticator app.</p>
          </div>
          <Button size="sm" onClick={startEnroll} disabled={busy}>{busy ? 'Starting…' : 'Enable 2FA'}</Button>
        </div>
      )}
    </div>
  )
}
