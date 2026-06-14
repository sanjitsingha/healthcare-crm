'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Activity, Database, Globe, Server, Heart, ArrowLeft,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

const B = {
  brand:   '#21297E',
  bg50:    '#eceef8',
  surface: '#ffffff',
  surf2:   '#f5f7fc',
  border:  '#e2e4ef',
  text:    '#0d0f1c',
  muted:   '#56608a',
  faint:   '#9499bb',
  dark:    '#08091a',
}

const SERVICES_META = [
  { key: 'database',    label: 'Database',    icon: Database, desc: 'PostgreSQL · Supabase' },
  { key: 'api',         label: 'API',         icon: Globe,    desc: 'REST & Realtime API' },
  { key: 'application', label: 'Application', icon: Server,   desc: 'Application Server' },
]

const ST = {
  operational: { label: 'Operational', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle2 },
  degraded:    { label: 'Degraded',    color: '#d97706', bg: '#fffbeb', border: '#fde68a', Icon: AlertTriangle },
  outage:      { label: 'Outage',      color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: XCircle },
  unknown:     { label: 'Checking…',   color: B.faint,   bg: B.surf2,   border: B.border,  Icon: Activity },
}

const DAY_COLORS = { operational: '#16a34a', degraded: '#f59e0b', outage: '#ef4444' }

const BANNER = {
  operational: { text: 'All Systems Operational',    sub: 'Everything is running smoothly.' },
  degraded:    { text: 'Partial System Degradation', sub: 'Some services are experiencing elevated response times.' },
  outage:      { text: 'System Disruption',          sub: 'We are actively investigating and working on a fix.' },
  unknown:     { text: 'Checking systems…',           sub: 'Running health checks, please wait.' },
}

const RANGES = [
  { key: '12h', label: '12 hr' },
  { key: '24h', label: '24 hr' },
  { key: '7d',  label: '7 days' },
  { key: '30d', label: '30 days' },
]

// Derive uptime blocks for a given range from API data
function getBlocks(historyData, svc, range) {
  if (range === '12h') return (historyData?.history_hourly?.[svc] || []).slice(-12)
  if (range === '24h') return (historyData?.history_hourly?.[svc] || []).slice(-24)
  if (range === '7d')  return (historyData?.history_daily?.[svc]  || []).slice(-7)
  return (historyData?.history_daily?.[svc] || []).slice(-30)
}

function calcUptime(blocks) {
  const withData = blocks.filter(b => b.status)
  if (!withData.length) return null
  const op = withData.filter(b => b.status === 'operational').length
  return ((op / withData.length) * 100).toFixed(2)
}

function RangeSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: B.surf2, borderRadius: 8, padding: 3, border: `1px solid ${B.border}` }}>
      {RANGES.map(r => (
        <button key={r.key} type="button" onClick={() => onChange(r.key)}
          style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.13s',
            background: value === r.key ? B.brand : 'transparent',
            color: value === r.key ? '#fff' : B.muted }}>
          {r.label}
        </button>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = ST[status] || ST.unknown
  const Icon = cfg.Icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 100, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <Icon size={12} strokeWidth={2.5} />
      {cfg.label}
    </span>
  )
}

function UptimeBar({ blocks, rangeKey }) {
  if (!blocks.length) return null
  const is24OrLess = rangeKey === '12h' || rangeKey === '24h'
  return (
    <div style={{ display: 'flex', gap: is24OrLess ? 3 : 2 }}>
      {blocks.map((b, i) => {
        const title = b.date
          ? `${b.label || b.date}: ${b.status ? ST[b.status]?.label : 'No data'}`
          : undefined
        return (
          <div key={i} title={title}
            style={{ flex: 1, height: 26, borderRadius: 3, background: b.status ? DAY_COLORS[b.status] : B.border, cursor: 'default', transition: 'opacity 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.6' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          />
        )
      })}
    </div>
  )
}

export default function StatusPage() {
  const [health,      setHealth]      = useState(null)
  const [historyData, setHistoryData] = useState(null)
  const [lastChecked, setLastChecked] = useState(null)
  const [spinning,    setSpinning]    = useState(false)

  // Per-service uptime range
  const [svcRanges, setSvcRanges] = useState({ database: '30d', api: '30d', application: '30d' })
  // Response time chart range
  const [trendRange, setTrendRange] = useState('24h')

  const load = useCallback(async (range) => {
    const r = range || trendRange
    setSpinning(true)
    try {
      const [h, s] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }).then(x => x.json()),
        fetch(`/api/status?range=${r}`, { cache: 'no-store' }).then(x => x.json()),
      ])
      setHealth(h)
      setHistoryData(s)
      setLastChecked(new Date())
    } catch {}
    setSpinning(false)
  }, [trendRange])

  const switchTrend = (r) => { setTrendRange(r); load(r) }

  useEffect(() => {
    load()
    const t = setInterval(() => load(), 60_000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line

  const overall    = health?.overall || 'unknown'
  const bannerCfg  = ST[overall] || ST.unknown
  const BannerIcon = bannerCfg.Icon
  const banner     = BANNER[overall]
  const trendData  = historyData?.trend?.database || []

  return (
    <div style={{ fontFamily: "'DM Sans','Inter',system-ui,sans-serif", background: B.surf2, minHeight: '100vh', color: B.text }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: `1px solid ${B.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={15} color="#fff" />
              </div>
              <span style={{ fontWeight: 900, fontSize: 16, color: B.text, letterSpacing: '-0.4px' }}>HealthCRM</span>
            </Link>
            <span style={{ color: B.border, fontSize: 18, lineHeight: 1 }}>|</span>
            <span style={{ fontSize: 13, color: B.faint, fontWeight: 500 }}>System Status</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastChecked && <span style={{ fontSize: 12, color: B.faint }}>{format(lastChecked, 'h:mm:ss a')}</span>}
            <button onClick={() => load()} disabled={spinning}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: `1px solid ${B.border}`, background: B.surface, fontSize: 13, fontWeight: 600, color: B.muted, cursor: spinning ? 'default' : 'pointer', opacity: spinning ? 0.55 : 1, transition: 'opacity 0.2s' }}>
              <RefreshCw size={13} style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: B.muted, textDecoration: 'none', padding: '6px 14px', borderRadius: 8, border: `1px solid ${B.border}`, fontWeight: 500 }}>
              <ArrowLeft size={13} /> Back to app
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: B.surf2, borderBottom: `1px solid ${B.border}`, padding: '36px 24px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: B.faint, marginBottom: 10 }}>
            <Link href="/" style={{ color: B.faint, textDecoration: 'none' }}>Home</Link>
            <span>›</span>
            <span style={{ color: B.brand, fontWeight: 600 }}>System Status</span>
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-1px', color: B.text, marginBottom: 6 }}>System Status</h1>
          <p style={{ fontSize: 13, color: B.muted }}>
            Live health of all HealthCRM services · Auto-refreshes every 60 s
            {lastChecked && <> · Last checked <strong style={{ color: B.text }}>{format(lastChecked, 'h:mm a')}</strong></>}
          </p>
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* Overall banner */}
        <div style={{ background: bannerCfg.bg, border: `1px solid ${bannerCfg.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: bannerCfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BannerIcon size={22} color={bannerCfg.color} strokeWidth={2} />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: B.text, letterSpacing: '-0.3px' }}>{banner.text}</p>
            <p style={{ fontSize: 13, color: B.muted, marginTop: 2 }}>{banner.sub}</p>
          </div>
        </div>

        {/* Services */}
        <div style={{ background: B.surface, borderRadius: 10, border: `1px solid ${B.border}`, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: B.text, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Services</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {[['#16a34a', 'Operational'], ['#f59e0b', 'Degraded'], ['#ef4444', 'Outage'], [B.border, 'No data']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: B.muted, fontWeight: 500 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: c, flexShrink: 0, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>

          {SERVICES_META.map((svc, i) => {
            const current = health?.services?.[svc.key]
            const status  = current?.status || 'unknown'
            const latency = current?.latency_ms
            const range   = svcRanges[svc.key]
            const blocks  = getBlocks(historyData, svc.key, range)
            const uptime  = calcUptime(blocks)
            const Icon    = svc.icon

            return (
              <div key={svc.key} style={{ padding: '20px', borderBottom: i < SERVICES_META.length - 1 ? `1px solid ${B.border}` : 'none' }}>
                {/* Row header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: B.surf2, border: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color={B.muted} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: B.text }}>{svc.label}</p>
                      <p style={{ fontSize: 11, color: B.faint, marginTop: 1 }}>{svc.desc}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {latency != null && latency > 0 && (
                      <span style={{ fontSize: 11, color: B.faint, fontVariantNumeric: 'tabular-nums' }}>{latency} ms</span>
                    )}
                    <StatusBadge status={status} />
                  </div>
                </div>

                {/* Range selector + uptime bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <RangeSelector value={range} onChange={v => setSvcRanges(p => ({ ...p, [svc.key]: v }))} />
                  {uptime != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: B.text, marginLeft: 'auto' }}>{uptime}% uptime</span>
                  )}
                </div>

                {blocks.length > 0 ? (
                  <>
                    <UptimeBar blocks={blocks} rangeKey={range} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 10, color: B.faint }}>{range === '12h' ? '12 hrs ago' : range === '24h' ? '24 hrs ago' : range === '7d' ? '7 days ago' : '30 days ago'}</span>
                      <span style={{ fontSize: 10, color: B.faint }}>Now</span>
                    </div>
                  </>
                ) : (
                  <div style={{ background: B.surf2, border: `1px solid ${B.border}`, borderRadius: 7, padding: '10px 14px', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: B.faint }}>No data yet for this range.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Response time chart */}
        <div style={{ background: B.surface, borderRadius: 10, border: `1px solid ${B.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: B.text, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Response Time</p>
              <p style={{ fontSize: 11, color: B.faint, marginTop: 2 }}>Database latency · avg per bucket</p>
            </div>
            <RangeSelector value={trendRange} onChange={switchTrend} />
          </div>

          <div style={{ padding: '18px 20px 14px' }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={B.brand} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={B.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: B.faint }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: B.faint }} axisLine={false} tickLine={false} unit="ms" />
                  <RechartsTip
                    contentStyle={{ border: `1px solid ${B.border}`, borderRadius: 8, fontSize: 12, background: B.surface, boxShadow: '0 4px 16px rgba(0,0,0,.07)' }}
                    labelStyle={{ color: B.muted, fontWeight: 600 }}
                    formatter={(v) => [`${v} ms`, 'Avg latency']}
                  />
                  <Area type="monotone" dataKey="avg_ms" stroke={B.brand} strokeWidth={2} fill="url(#latGrad)" dot={false} activeDot={{ r: 4, fill: B.brand }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: B.faint }}>No latency data for this range yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: B.dark, borderTop: '1px solid rgba(255,255,255,.05)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={12} color="#fff" />
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>© {new Date().getFullYear()} HealthCRM Technologies Pvt. Ltd.</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[['/', 'Home'], ['/privacy', 'Privacy'], ['/security', 'Security'], ['/terms', 'Terms']].map(([href, label]) => (
              <Link key={href} href={href} style={{ fontSize: 12, color: 'rgba(255,255,255,.28)', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.65)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.28)' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
