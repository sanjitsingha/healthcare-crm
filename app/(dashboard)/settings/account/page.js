'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserRound, LogOut, Shield, Clock, Monitor,
  Mail, CheckCircle, XCircle, Key, Activity,
  MapPin, Wifi, Crosshair, Timer, CreditCard,
} from 'lucide-react'
import { Card, Avatar } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { createClient } from '@/lib/supabase/client'
import { logAudit, AUDIT } from '@/lib/audit'
import { getPref, setPref } from '@/lib/prefs'
import TwoFactorSettings from '@/components/crm/TwoFactorSettings'
import SubscriptionPanel from '@/components/crm/SubscriptionPanel'
import { format, formatDistanceToNow, subDays, isToday, isYesterday } from 'date-fns'

const TABS = [
  { key: 'profile',      label: 'Profile',            icon: UserRound },
  { key: 'privacy',      label: 'Privacy & Security', icon: Shield },
  { key: 'subscription', label: 'Subscription',       icon: CreditCard },
]

const TIMEOUT_OPTIONS = [
  { label: '5 min',  value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hr',   value: 60 },
  { label: '2 hr',   value: 120 },
  { label: '4 hr',   value: 240 },
  { label: '8 hr',   value: 480 },
]

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative flex-shrink-0 rounded-full transition-colors duration-200"
      style={{
        width: 40, height: 22,
        background: on ? 'var(--color-brand)' : 'var(--color-border)',
      }}
    >
      <span
        className="absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: on ? 20 : 3 }}
      />
    </button>
  )
}

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
  const { user, org, orgId } = useOrg()
  const router    = useRouter()
  const [tab,             setTab]             = useState('profile')
  const [deviceInfo,      setDeviceInfo]      = useState('')
  const [sessionLog,      setSessionLog]      = useState([])
  const [signingOut,      setSigningOut]      = useState(false)
  const [net,             setNet]             = useState(null)
  const [geoStatus,       setGeoStatus]       = useState('idle')
  const [inactivityOn,    setInactivityOn]    = useState(false)
  const [inactivityMins,  setInactivityMins]  = useState(30)

  // Load inactivity prefs on mount
  useEffect(() => {
    const enabled = getPref('pref_inactivity_enabled', false)
    const mins    = getPref('pref_inactivity_duration', 30)
    if (enabled !== null) setInactivityOn(!!enabled)
    if (mins    !== null) setInactivityMins(Number(mins) || 30)
  }, [])

  const setInactivity = (enabled, mins) => {
    setInactivityOn(enabled)
    setInactivityMins(mins)
    setPref('pref_inactivity_enabled', enabled)
    setPref('pref_inactivity_duration', mins)
    const desc = enabled
      ? `Session timeout enabled — auto-logout after ${TIMEOUT_OPTIONS.find(o => o.value === mins)?.label || `${mins} min`}`
      : 'Session timeout disabled'
    logAudit({ action: AUDIT.SETTINGS_CHANGE, description: desc, metadata: { setting: 'session_timeout', enabled, duration_mins: mins } })
  }

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

  // ── Resolve IP + approximate location (no permission needed) ──
  useEffect(() => {
    let active = true
    fetch('https://ipwho.is/')
      .then(r => r.json())
      .then(d => {
        if (!active) return
        if (d && d.success !== false) {
          setNet({ ip: d.ip || null, location: [d.city, d.region, d.country].filter(Boolean).join(', ') || null })
        } else setNet({})
      })
      .catch(() => active && setNet({}))
    return () => { active = false }
  }, [])

  // ── Build session log in localStorage (records IP + location) ──
  useEffect(() => {
    if (!user || !deviceInfo || net === null) return // wait until IP lookup resolves

    const key      = `session_log_${user.id}`
    const stored   = JSON.parse(localStorage.getItem(key) || '[]')
    const now      = new Date()
    const last     = stored[0]
    // Record a new entry if nothing yet, or last entry was > 1 hr ago
    const shouldRecord = !last || (now - new Date(last.at)) > 60 * 60 * 1000

    const provider = user?.app_metadata?.provider === 'google' ? 'Google' : 'Email & Password'

    let log = stored
    if (shouldRecord) {
      const entry = { at: now.toISOString(), device: deviceInfo, provider, ip: net.ip || null, location: net.location || null, precise: null }
      log = [entry, ...stored].slice(0, 60) // keep max 60 entries
      localStorage.setItem(key, JSON.stringify(log))
    }

    // Only show last 30 days
    const cutoff = subDays(now, 30)
    setSessionLog(log.filter(e => new Date(e.at) >= cutoff))
  }, [user, deviceInfo, net])

  // Patch the most-recent (current) login entry — used for precise location.
  const patchLatestEntry = (patch) => {
    if (!user) return
    const key = `session_log_${user.id}`
    const stored = JSON.parse(localStorage.getItem(key) || '[]')
    if (!stored.length) return
    stored[0] = { ...stored[0], ...patch }
    localStorage.setItem(key, JSON.stringify(stored))
    setSessionLog(prev => prev.map((e, i) => (i === 0 ? { ...e, ...patch } : e)))
  }

  // Ask the browser for precise location (permission prompt), then reverse-geocode.
  const requestPreciseLocation = () => {
    if (!navigator.geolocation) { setGeoStatus('denied'); return }
    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        let place = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        try {
          const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
          const d = await r.json()
          const p = [d.city || d.locality, d.principalSubdivision, d.countryName].filter(Boolean).join(', ')
          if (p) place = p
        } catch { /* keep coords */ }
        patchLatestEntry({ precise: place, lat: latitude, lon: longitude })
        setGeoStatus('granted')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    // Log before signing out — the session is still valid here.
    await logAudit({ action: AUDIT.LOGOUT, description: 'Signed out' })
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
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-(--color-border) overflow-x-auto">
        {TABS.map(t => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-600 border-b-2 -mb-px whitespace-nowrap transition-colors"
              style={active
                ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }
                : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ══ PROFILE TAB ══ */}
      {tab === 'profile' && (
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
            className="btn btn-danger btn-sm shrink-0 disabled:opacity-50"
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

      </div>
      )}

      {/* ══ PRIVACY & SECURITY TAB ══ */}
      {tab === 'privacy' && (
      <div className="space-y-4">

      {/* ── Session Timeout ── */}
      <Card className="p-5">
        <SectionHead
          icon={Timer}
          title="Session Timeout"
          description="Automatically sign out after a period of inactivity on this device"
        />

        {/* Toggle row */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: inactivityOn ? 'var(--color-brand-50)' : 'var(--color-surface)' }}>
              <Clock size={15} style={{ color: inactivityOn ? 'var(--color-brand)' : 'var(--color-text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>
                Auto-logout on inactivity
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {inactivityOn
                  ? `This device will sign out after ${TIMEOUT_OPTIONS.find(o => o.value === inactivityMins)?.label ?? `${inactivityMins} min`} of no activity`
                  : 'Your session will stay open until you manually sign out'}
              </p>
            </div>
          </div>
          <Toggle on={inactivityOn} onChange={v => setInactivity(v, inactivityMins)} />
        </div>

        {/* Duration picker — only shown when enabled */}
        {inactivityOn && (
          <div className="mt-4">
            <p className="text-xs font-600 mb-2.5" style={{ color: 'var(--color-text-secondary)' }}>
              Sign out after
            </p>
            <div className="flex flex-wrap gap-2">
              {TIMEOUT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setInactivity(true, opt.value)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-600 border transition-all"
                  style={inactivityMins === opt.value
                    ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                    : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'transparent' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
              <Monitor size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                This setting is stored on <strong>this device only</strong>. Each device or browser manages its own session timeout independently — enabling it here won't affect colleagues or other logged-in devices.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Two-Factor Authentication ── */}
      <TwoFactorSettings />

      {/* ── 30-Day Session Timeline ── */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-(--color-border)">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Activity size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Login History</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sign-in events with IP &amp; location — last 30 days</p>
            </div>
          </div>
          {geoStatus !== 'granted' && (
            <button type="button" onClick={requestPreciseLocation} disabled={geoStatus === 'requesting'}
              className="btn btn-secondary btn-sm shrink-0 disabled:opacity-50">
              <Crosshair size={13} /> {geoStatus === 'requesting' ? 'Locating…' : geoStatus === 'denied' ? 'Location blocked' : 'Use precise location'}
            </button>
          )}
        </div>

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
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {entry.ip && (
                          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            <Wifi size={10} /> {entry.ip}
                          </span>
                        )}
                        {(entry.precise || entry.location) && (
                          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            <MapPin size={10} /> {entry.precise || entry.location}
                            {entry.precise && <span className="text-[9px] font-700 px-1 rounded" style={{ background: '#dcfce7', color: '#15803d' }}>precise</span>}
                          </span>
                        )}
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
      )}

      {/* ══ SUBSCRIPTION TAB ══ */}
      {tab === 'subscription' && (
      <div className="space-y-4">
        <SubscriptionPanel />
      </div>
      )}

    </div>
  )
}
