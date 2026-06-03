'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserRound, LogOut, Shield, Clock, Monitor,
  Mail, CheckCircle, XCircle, Key, Activity,
} from 'lucide-react'
import { Card, Avatar } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow, subDays, isToday, isYesterday } from 'date-fns'

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

function InfoRow({ icon: Icon, label, value, badge }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border) last:border-b-0">
      <div className="flex items-center gap-2.5">
        <Icon size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge}
        {value && <span className="text-xs font-500 text-right" style={{ color: 'var(--color-text-primary)' }}>{value}</span>}
      </div>
    </div>
  )
}

function getDayLabel(date) {
  if (isToday(date))     return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d, yyyy')
}

export default function AccountPage() {
  const { user }  = useOrg()
  const router    = useRouter()
  const [deviceInfo,  setDeviceInfo]  = useState('')
  const [sessionLog,  setSessionLog]  = useState([])
  const [signingOut,  setSigningOut]  = useState(false)

  const displayName  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || 'Not available'

  // ── Detect browser + OS ──────────────────────────────────────
  useEffect(() => {
    const ua = navigator.userAgent
    let browser = 'Unknown Browser'
    let os      = 'Unknown OS'

    if      (ua.includes('Edg'))                              browser = 'Microsoft Edge'
    else if (ua.includes('Chrome') && !ua.includes('Edg'))   browser = 'Google Chrome'
    else if (ua.includes('Firefox'))                          browser = 'Firefox'
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
    else if (ua.includes('OPR') || ua.includes('Opera'))      browser = 'Opera'

    if      (ua.includes('Windows'))                          os = 'Windows'
    else if (ua.includes('Mac') && !ua.includes('iPhone') && !ua.includes('iPad')) os = 'macOS'
    else if (ua.includes('iPhone'))                           os = 'iPhone'
    else if (ua.includes('iPad'))                             os = 'iPad'
    else if (ua.includes('Android'))                          os = 'Android'
    else if (ua.includes('Linux'))                            os = 'Linux'

    setDeviceInfo(`${browser} on ${os}`)
  }, [])

  // ── Build session log in localStorage ───────────────────────
  useEffect(() => {
    if (!user || !deviceInfo) return

    const key      = `session_log_${user.id}`
    const stored   = JSON.parse(localStorage.getItem(key) || '[]')
    const now      = new Date()
    const last     = stored[0]
    // Record a new entry if nothing yet, or last entry was > 1 hr ago
    const shouldRecord = !last || (now - new Date(last.at)) > 60 * 60 * 1000

    const provider = user?.app_metadata?.provider === 'google' ? 'Google' : 'Email & Password'

    let log = stored
    if (shouldRecord) {
      const entry = { at: now.toISOString(), device: deviceInfo, provider }
      log = [entry, ...stored].slice(0, 60) // keep max 60 entries
      localStorage.setItem(key, JSON.stringify(log))
    }

    // Only show last 30 days
    const cutoff = subDays(now, 30)
    setSessionLog(log.filter(e => new Date(e.at) >= cutoff))
  }, [user, deviceInfo])

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const provider      = user?.app_metadata?.provider || 'email'
  const providerLabel = provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : 'Email & Password'
  const emailVerified = !!user?.email_confirmed_at

  const lastSignIn = user?.last_sign_in_at
    ? `${formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })} · ${format(new Date(user.last_sign_in_at), 'MMM d, yyyy · h:mm a')}`
    : 'Unknown'

  const accountCreated = user?.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'Unknown'

  return (
    <div className="space-y-4">

      {/* ── Profile + Sign Out ── */}
      <Card className="p-5">
        <SectionHead icon={UserRound} title="Account" description="Your signed-in account details" />
        <div className="flex items-center gap-3 p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
          <Avatar name={displayName} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{displayEmail}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors hover:bg-red-50 shrink-0 disabled:opacity-50"
            style={{ borderColor: '#fecaca', color: '#b91c1c' }}
          >
            <LogOut size={13} />
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </Card>

      {/* ── Activity & Security ── */}
      <Card className="p-5">
        <SectionHead
          icon={Shield}
          title="Activity & Security"
          description="Your current session and account security details"
        />
        <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
          <InfoRow icon={Clock}   label="Last signed in"   value={lastSignIn} />
          <InfoRow icon={UserRound} label="Account created" value={accountCreated} />
          <InfoRow
            icon={Key}
            label="Sign-in method"
            badge={
              <span
                className="text-[10px] font-700 px-2 py-0.5 rounded-full"
                style={provider === 'google'
                  ? { background: '#fce7f3', color: '#be185d' }
                  : { background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
              >
                {providerLabel}
              </span>
            }
          />
          <InfoRow icon={Mail} label="Email address" value={displayEmail} />
          <InfoRow
            icon={emailVerified ? CheckCircle : XCircle}
            label="Email verified"
            badge={
              <span
                className="text-[10px] font-700 px-2 py-0.5 rounded-full"
                style={emailVerified
                  ? { background: '#dcfce7', color: '#15803d' }
                  : { background: '#fee2e2', color: '#b91c1c' }}
              >
                {emailVerified ? 'Verified' : 'Not verified'}
              </span>
            }
          />
          <InfoRow icon={Monitor} label="Current session" value={deviceInfo || 'Detecting…'} />
        </div>
      </Card>

      {/* ── 30-Day Session Timeline ── */}
      <Card className="p-5">
        <SectionHead
          icon={Activity}
          title="Login History"
          description="Sign-in events recorded on this device — last 30 days"
        />

        {sessionLog.length === 0 ? (
          <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
            <Activity size={24} className="mx-auto mb-2 opacity-20" />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No activity recorded yet.</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>History builds up as you sign in.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div
              className="absolute left-3.75 top-4 bottom-4 w-px"
              style={{ background: 'var(--color-border)' }}
            />

            <div className="space-y-0">
              {sessionLog.map((entry, i) => {
                const date       = new Date(entry.at)
                const isFirst    = i === 0
                const dayLabel   = getDayLabel(date)
                const timeLabel  = format(date, 'h:mm a')

                return (
                  <div key={i} className="flex gap-4 relative pl-1">
                    {/* Dot */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 mt-3 border-2"
                      style={{
                        background: isFirst ? 'var(--color-brand)' : 'var(--color-surface)',
                        borderColor: isFirst ? 'var(--color-brand)' : 'var(--color-border)',
                      }}
                    >
                      <Monitor size={11} style={{ color: isFirst ? 'white' : 'var(--color-text-muted)' }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 py-3 border-b border-(--color-border) last:border-b-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>
                          Signed in
                        </span>
                        {isFirst && (
                          <span
                            className="text-[9px] font-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                            style={{ background: 'var(--color-brand)', color: 'white' }}
                          >
                            Current
                          </span>
                        )}
                        <span
                          className="text-[10px] font-600 px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                        >
                          {entry.provider}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          {dayLabel} · {timeLabel}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          <Monitor size={10} />
                          {entry.device}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-[10px] mt-4 pt-3 border-t border-(--color-border)" style={{ color: 'var(--color-text-muted)' }}>
          History is stored locally on this device. Entries older than 30 days are automatically removed.
        </p>
      </Card>

    </div>
  )
}
