'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Activity, Database, Globe, Server, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

const SERVICES_META = [
  { key: 'database',    label: 'Database',    icon: Database, desc: 'PostgreSQL · Supabase' },
  { key: 'api',         label: 'API',         icon: Globe,    desc: 'REST & Realtime API' },
  { key: 'application', label: 'Application', icon: Server,   desc: 'Application Server' },
]

const ST = {
  operational: { label: 'Operational', color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle2 },
  degraded:    { label: 'Degraded',    color: '#d97706', bg: '#fffbeb', Icon: AlertTriangle },
  outage:      { label: 'Outage',      color: '#dc2626', bg: '#fef2f2', Icon: XCircle },
  unknown:     { label: 'Checking…',   color: '#6b7280', bg: '#f9fafb', Icon: Activity },
}

const DAY_COLORS = {
  operational: '#22c55e',
  degraded:    '#f59e0b',
  outage:      '#ef4444',
}

const BANNER = {
  operational: { text: 'All Systems Operational', sub: 'Everything is running smoothly.' },
  degraded:    { text: 'Partial System Degradation', sub: 'Some services are experiencing issues.' },
  outage:      { text: 'System Disruption',          sub: 'We are actively investigating and working on a fix.' },
  unknown:     { text: 'Checking systems…',           sub: 'Please wait while we run health checks.' },
}

function StatusBadge({ status }) {
  const cfg = ST[status] || ST.unknown
  const Icon = cfg.Icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

function UptimeBar({ days }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {days.map((d) => (
        <div
          key={d.date}
          title={`${format(new Date(d.date + 'T00:00:00'), 'MMM d, yyyy')}: ${d.status ? ST[d.status]?.label : 'No data'}`}
          style={{
            flex: 1,
            height: 32,
            borderRadius: 3,
            background: d.status ? DAY_COLORS[d.status] : '#e5e7eb',
            cursor: 'default',
            transition: 'filter 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.85)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
        />
      ))}
    </div>
  )
}

function ServiceRow({ svc, health, history, uptime, isLast }) {
  const current = health?.services?.[svc.key]
  const status = current?.status || 'unknown'
  const days = history || []
  const latency = current?.latency_ms
  const Icon = svc.icon

  return (
    <div style={{ padding: '22px 28px', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={15} color="#6b7280" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{svc.label}</p>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>{svc.desc}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {latency != null && latency > 0 && (
            <span style={{ fontSize: 11, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{latency} ms</span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {days.length > 0 ? (
        <>
          <UptimeBar days={days} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>90 days ago</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
              {uptime != null ? `${uptime}% uptime` : ''}
            </span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Today</span>
          </div>
        </>
      ) : (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>Historical data will appear here after the first health checks are recorded.</p>
        </div>
      )}
    </div>
  )
}

function LatencyChart({ data }) {
  if (!data?.length) return null
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: '22px 28px', marginTop: 20 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Response Time</p>
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 18 }}>Database latency · last 24 hours</p>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => v.split(' ')[1]} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="ms" />
          <RechartsTip
            contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}
            formatter={(v) => [`${v} ms`, 'Avg latency']}
            labelFormatter={(l) => l}
          />
          <Area type="monotone" dataKey="avg_ms" stroke="#4f46e5" strokeWidth={2} fill="url(#grad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function StatusPage() {
  const [health, setHealth]     = useState(null)
  const [history, setHistory]   = useState(null)
  const [lastChecked, setLastChecked] = useState(null)
  const [spinning, setSpinning] = useState(false)

  const load = useCallback(async () => {
    setSpinning(true)
    try {
      const [h, s] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/status',  { cache: 'no-store' }).then(r => r.json()),
      ])
      setHealth(h)
      setHistory(s)
      setLastChecked(new Date())
    } catch {}
    setSpinning(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  const overall = health?.overall || 'unknown'
  const banner  = BANNER[overall]
  const BannerIcon = ST[overall]?.Icon || Activity
  const bannerColor = ST[overall]?.color || '#6b7280'
  const bannerBg    = ST[overall]?.bg    || '#f9fafb'

  return (
    <div style={{ fontFamily: 'DM Sans, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={17} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>System Status</p>
              <p style={{ fontSize: 11, color: '#9ca3af' }}>HealthCRM · Real-time</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastChecked && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                Updated {format(lastChecked, 'h:mm:ss a')}
              </span>
            )}
            <button
              onClick={load}
              disabled={spinning}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid #e5e7eb', background: 'white',
                fontSize: 12, fontWeight: 600, color: '#374151',
                cursor: spinning ? 'default' : 'pointer',
                opacity: spinning ? 0.6 : 1, transition: 'opacity 0.2s',
              }}
            >
              <RefreshCw size={12} style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Banner */}
        <div style={{
          background: bannerBg, border: `1px solid ${bannerColor}25`,
          borderRadius: 16, padding: '24px 28px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: bannerColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BannerIcon size={26} color={bannerColor} />
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>{banner.text}</p>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{banner.sub}</p>
            {lastChecked && (
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Last checked {format(lastChecked, "MMMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>
        </div>

        {/* Services card */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 28px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Services</p>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['#22c55e', 'Operational'], ['#f59e0b', 'Degraded'], ['#ef4444', 'Outage'], ['#e5e7eb', 'No data']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          {SERVICES_META.map((svc, i) => (
            <ServiceRow
              key={svc.key}
              svc={svc}
              health={health}
              history={history?.history?.[svc.key]}
              uptime={history?.uptimePct?.[svc.key]}
              isLast={i === SERVICES_META.length - 1}
            />
          ))}
        </div>

        {/* Latency chart */}
        <LatencyChart data={history?.trend?.database} />

        {/* Footer */}
        <div style={{ marginTop: 36, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#d1d5db' }}>
            Auto-refreshes every 60 seconds · Powered by HealthCRM
          </p>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: '#9ca3af', textDecoration: 'none' }}>
            <ExternalLink size={11} /> Go to app
          </a>
        </div>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
