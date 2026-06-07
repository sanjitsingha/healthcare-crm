'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, TrendingUp, Users, Calendar, IndianRupee, PhoneCall,
  Target, RefreshCw, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Card, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import {
  getLeads, getPatients, getAppointments, getFollowups, getPayments,
} from '@/lib/supabase/queries'
import {
  format, subDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  startOfDay, startOfWeek, startOfMonth, isSameDay, isSameWeek, isSameMonth,
} from 'date-fns'

const STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']
const STAGE_COLOR = {
  New: '#3b82f6', Contacted: '#8b5cf6', Interested: '#f59e0b',
  'Follow-up': '#ec4899', Converted: '#10b981', Lost: '#ef4444',
}
const APPT_COLOR = { booked: '#3b82f6', confirmed: '#10b981', completed: '#6b7280', cancelled: '#ef4444' }
const PALETTE = ['#21297E', '#3a43b5', '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#64748b']

const RANGES = [
  { key: '7',   label: 'Last 7 days',  days: 7 },
  { key: '30',  label: 'Last 30 days', days: 30 },
  { key: '90',  label: 'Last 90 days', days: 90 },
  { key: '365', label: 'Last year',    days: 365 },
  { key: 'all', label: 'All time',     days: null },
]

const inr = (n) => {
  n = Number(n) || 0
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

// ── Chart primitives ─────────────────────────────────────────
function StatTile({ icon: Icon, label, value, sub, delta }) {
  const up = typeof delta === 'number' && delta >= 0
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
          <Icon size={17} style={{ color: 'var(--color-brand)' }} />
        </div>
        {typeof delta === 'number' && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-700 px-1.5 py-0.5 rounded-full"
            style={up ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#b91c1c' }}>
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-xs font-600 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </Card>
  )
}

function BarList({ rows }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  if (!rows.some(r => r.value)) return <Empty />
  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{r.label}</span>
            <span className="text-xs font-700" style={{ color: 'var(--color-text-primary)' }}>{r.value}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color || 'var(--color-brand)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Donut({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (!total) return <Empty />
  const R = 52, C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg width="130" height="130" viewBox="0 0 130 130" className="shrink-0">
        <g transform="rotate(-90 65 65)">
          {segments.filter(s => s.value).map((s, i) => {
            const frac = s.value / total
            const dash = frac * C
            const el = (
              <circle key={i} cx="65" cy="65" r={R} fill="none" stroke={s.color} strokeWidth="16"
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} />
            )
            offset += dash
            return el
          })}
        </g>
        <text x="65" y="61" textAnchor="middle" className="font-800" style={{ fontSize: 20, fill: 'var(--color-text-primary)' }}>{total}</text>
        <text x="65" y="78" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--color-text-muted)' }}>total</text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {segments.filter(s => s.value).map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</span>
            <span className="text-xs font-700" style={{ color: 'var(--color-text-primary)' }}>{s.value}</span>
            <span className="text-[10px] w-9 text-right" style={{ color: 'var(--color-text-muted)' }}>{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AreaChart({ data, color = 'var(--color-brand)', valuePrefix = '' }) {
  if (!data.length || !data.some(d => d.value)) return <Empty />
  const W = 600, H = 160, P = 6
  const max = Math.max(1, ...data.map(d => d.value))
  const stepX = data.length > 1 ? (W - P * 2) / (data.length - 1) : 0
  const x = i => P + i * stepX
  const y = v => H - P - (v / max) * (H - P * 2)
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${H - P} L ${x(0).toFixed(1)} ${H - P} Z`
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0])
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-2xl font-800" style={{ color: 'var(--color-text-primary)' }}>{valuePrefix}{data.reduce((s, d) => s + d.value, 0)}</p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>peak {valuePrefix}{peak.value} · {peak.label}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between mt-1.5">
        {data.filter((_, i) => i % Math.ceil(data.length / 6 || 1) === 0).map((d, i) => (
          <span key={i} className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

function Empty() {
  return <div className="py-10 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No data for this period.</div>
}

function Panel({ title, subtitle, children, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="mb-4">
        <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function ReportsPage() {
  const { orgId, org } = useOrg()
  const [rangeKey, setRangeKey] = useState('30')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ leads: [], patients: [], appts: [], followups: [], payments: [] })

  const range = RANGES.find(r => r.key === rangeKey) || RANGES[1]

  const load = () => {
    if (!orgId) return
    setLoading(true)
    Promise.all([
      getLeads({ orgId }),
      getPatients({ orgId }),
      getAppointments({ orgId }),
      getFollowups({ orgId }),
      getPayments({ orgId }),
    ]).then(([leads, patients, appts, followups, payments]) => {
      setData({ leads: leads || [], patients: patients || [], appts: appts || [], followups: followups || [], payments: payments || [] })
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [orgId])

  const since = range.days ? startOfDay(subDays(new Date(), range.days - 1)) : null
  const within = (d) => { if (!d) return false; if (!since) return true; return new Date(d) >= since }

  const m = useMemo(() => {
    const leads = data.leads.filter(l => within(l.created_at))
    const patients = data.patients.filter(p => within(p.created_at))
    const appts = data.appts.filter(a => within(a.scheduled_at))
    const followups = data.followups.filter(f => within(f.created_at))
    const payments = data.payments.filter(p => within(p.payment_date || p.created_at))

    const converted = leads.filter(l => l.stage === 'Converted').length
    const lost = leads.filter(l => l.stage === 'Lost').length
    const revenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const convRate = leads.length ? Math.round((converted / leads.length) * 100) : 0

    // by stage
    const byStage = STAGES.map(s => ({ label: s, value: leads.filter(l => l.stage === s).length, color: STAGE_COLOR[s] }))

    // by source
    const srcMap = {}
    leads.forEach(l => { const s = l.source || 'Other'; srcMap[s] = (srcMap[s] || 0) + 1 })
    const bySource = Object.entries(srcMap).sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))

    // appts by status
    const apptStatus = ['booked', 'confirmed', 'completed', 'cancelled']
      .map(s => ({ label: s[0].toUpperCase() + s.slice(1), value: appts.filter(a => a.status === s).length, color: APPT_COLOR[s] }))

    // follow-up outcomes (top)
    const outMap = {}
    followups.forEach(f => { if (f.outcome) outMap[f.outcome] = (outMap[f.outcome] || 0) + 1 })
    const outcomes = Object.entries(outMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))

    // team performance — leads per assigned staff
    const staff = org?.settings?.staff_members || []
    const nameOf = (id) => staff.find(s => s.id === id)?.name || (id ? 'Other' : 'Unassigned')
    const teamMap = {}
    leads.forEach(l => { const n = nameOf(l.assigned_to); teamMap[n] = (teamMap[n] || 0) + 1 })
    const team = Object.entries(teamMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))

    // time series buckets
    const end = new Date()
    const start = since || new Date(Math.min(...(data.leads.length ? data.leads.map(l => +new Date(l.created_at)) : [+end])))
    const spanDays = Math.max(1, Math.round((end - start) / 86400000))
    let buckets, fmt, sameBucket
    if (spanDays <= 31) {
      buckets = eachDayOfInterval({ start, end }); fmt = 'd MMM'; sameBucket = isSameDay
    } else if (spanDays <= 182) {
      buckets = eachWeekOfInterval({ start, end }); fmt = 'd MMM'; sameBucket = (a, b) => isSameWeek(a, b)
    } else {
      buckets = eachMonthOfInterval({ start, end }); fmt = 'MMM yy'; sameBucket = isSameMonth
    }
    const leadsSeries = buckets.map(b => ({ label: format(b, fmt), value: leads.filter(l => sameBucket(new Date(l.created_at), b)).length }))
    const revenueSeries = buckets.map(b => ({ label: format(b, fmt), value: Math.round(payments.filter(p => sameBucket(new Date(p.payment_date || p.created_at), b)).reduce((s, p) => s + (Number(p.amount) || 0), 0)) }))

    return { leads, patients, appts, followups, payments, converted, lost, revenue, convRate, byStage, bySource, apptStatus, outcomes, team, leadsSeries, revenueSeries }
  }, [data, rangeKey, org])

  if (loading) {
    return <div className="p-6 flex items-center justify-center h-[60vh]"><Spinner /></div>
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-50)' }}>
            <BarChart3 size={18} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Reports</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{range.label} · performance overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-(--color-border)">
            {RANGES.map(r => (
              <button key={r.key} type="button" onClick={() => setRangeKey(r.key)}
                className="px-2.5 py-1.5 text-[11px] font-600 transition-all"
                style={rangeKey === r.key
                  ? { background: 'var(--color-brand)', color: 'white' }
                  : { color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}>
                {r.label.replace('Last ', '')}
              </button>
            ))}
          </div>
          <button type="button" onClick={load} title="Refresh"
            className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2)" style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile icon={TrendingUp} label="New Leads" value={m.leads.length} />
        <StatTile icon={Target} label="Conversion Rate" value={`${m.convRate}%`} sub={`${m.converted} converted`} />
        <StatTile icon={Users} label="New Patients" value={m.patients.length} />
        <StatTile icon={Calendar} label="Appointments" value={m.appts.length} />
        <StatTile icon={PhoneCall} label="Follow-ups" value={m.followups.length} />
        <StatTile icon={IndianRupee} label="Revenue" value={inr(m.revenue)} sub={`${m.payments.length} payments`} />
      </div>

      {/* Leads over time (full width) */}
      <Panel title="Leads over time" subtitle="New leads created per period">
        <AreaChart data={m.leadsSeries} />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Pipeline by stage" subtitle="Where your leads currently sit">
          <BarList rows={m.byStage} />
        </Panel>
        <Panel title="Lead sources" subtitle="Where leads are coming from">
          <BarList rows={m.bySource} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Appointments by status">
          <Donut segments={m.apptStatus} />
        </Panel>
        <Panel title="Follow-up outcomes" subtitle="Top recorded outcomes">
          <BarList rows={m.outcomes} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Revenue over time" subtitle="Payments collected per period">
          <AreaChart data={m.revenueSeries} color="#10b981" valuePrefix="₹" />
        </Panel>
        <Panel title="Team performance" subtitle="Leads by assigned member">
          <BarList rows={m.team} />
        </Panel>
      </div>
    </div>
  )
}
