'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3, TrendingUp, Users, Calendar, IndianRupee, PhoneCall,
  Target, RefreshCw, ChevronDown, CalendarDays, Check, UserRound, Building2,
  Activity, PieChart as PieIcon,
} from 'lucide-react'
import { Card, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import {
  getLeads, getPatients, getAppointments, getFollowups, getPayments,
} from '@/lib/supabase/queries'
import {
  format, subDays, startOfDay, endOfDay,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  isSameDay, isSameWeek, isSameMonth,
} from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']
const STAGE_COLOR = {
  New: '#3b82f6', Contacted: '#8b5cf6', Interested: '#f59e0b',
  'Follow-up': '#ec4899', Converted: '#10b981', Lost: '#ef4444',
}
const APPT_COLOR = { booked: '#3b82f6', confirmed: '#10b981', completed: '#6b7280', cancelled: '#ef4444' }
const PALETTE = ['#393E9A', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b']

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

const TOOLTIP = {
  contentStyle: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' },
  labelStyle: { color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: 'var(--color-text-primary)' },
}
const AXIS_TICK = { fontSize: 11, fill: 'var(--color-text-muted)' }

// ── UI primitives ────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: 'var(--color-brand-50)' }}>
        <Icon size={17} style={{ color: 'var(--color-brand)' }} />
      </div>
      <p className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-xs font-600 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </Card>
  )
}

function Panel({ title, subtitle, children, right, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
          {subtitle && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </Card>
  )
}

const TYPE_ICON = { area: TrendingUp, line: Activity, bar: BarChart3, pie: PieIcon }
function ChartToggle({ types, value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-(--color-border) p-0.5 shrink-0">
      {types.map(t => {
        const Icon = TYPE_ICON[t]
        const active = value === t
        return (
          <button key={t} type="button" onClick={() => onChange(t)} title={`${t[0].toUpperCase() + t.slice(1)} view`}
            className="p-1.5 rounded-md transition-all"
            style={active ? { background: 'var(--color-brand)', color: 'white' } : { color: 'var(--color-text-muted)' }}>
            <Icon size={13} />
          </button>
        )
      })}
    </div>
  )
}

function Empty() {
  return <div className="py-12 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No data for this selection.</div>
}

const hasData = (rows) => rows.some(r => r.value)

// Recharts wrappers
function BarRows({ rows }) {
  if (!hasData(rows)) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 42)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={120} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP} cursor={{ fill: 'var(--color-surface-2)' }} />
        <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]} barSize={18}>
          {rows.map((r, i) => <Cell key={i} fill={r.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DonutChart({ segments }) {
  const segs = segments.filter(s => s.value)
  if (!segs.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={segs} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
          {segs.map((s, i) => <Cell key={i} fill={s.color} />)}
        </Pie>
        <Tooltip {...TOOLTIP} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Time-series chart: area / line / bar(column).
function TimeChart({ type, data, color, valueName, prefix = '' }) {
  if (!hasData(data)) return <Empty />
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
  const xa = <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={20} />
  const ya = <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44}
    tickFormatter={prefix === '₹' ? (v) => inr(v) : undefined} />
  const tip = <Tooltip {...TOOLTIP} formatter={(v) => [prefix === '₹' ? inr(v) : v, valueName]} />
  const margin = { top: 5, right: 10, left: -8, bottom: 0 }
  return (
    <ResponsiveContainer width="100%" height={230}>
      {type === 'bar' ? (
        <BarChart data={data} margin={margin}>{grid}{xa}{ya}{tip}
          <Bar dataKey="value" name={valueName} fill={color} radius={[6, 6, 0, 0]} maxBarSize={46} />
        </BarChart>
      ) : type === 'line' ? (
        <LineChart data={data} margin={margin}>{grid}{xa}{ya}{tip}
          <Line type="monotone" dataKey="value" name={valueName} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      ) : (
        <AreaChart data={data} margin={margin}>
          <defs>
            <linearGradient id={`grad-${valueName}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}{xa}{ya}{tip}
          <Area type="monotone" dataKey="value" name={valueName} stroke={color} strokeWidth={2.5} fill={`url(#grad-${valueName})`} activeDot={{ r: 4 }} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  )
}

// Categorical chart: bar(horizontal) / pie / line.
function CategoryChart({ type, rows }) {
  if (!hasData(rows)) return <Empty />
  if (type === 'pie') return <DonutChart segments={rows} />
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 36)}>
        <LineChart data={rows} margin={{ top: 5, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
          <Tooltip {...TOOLTIP} />
          <Line type="monotone" dataKey="value" name="Count" stroke="var(--color-brand)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  return <BarRows rows={rows} />
}

// ── Dropdowns ────────────────────────────────────────────────
function useOutside(ref, onClose) {
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [ref, onClose])
}

function RangeDropdown({ rangeKey, setRangeKey, custom, setCustom, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutside(ref, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-(--color-border) text-xs font-600 hover:bg-(--color-surface-2)"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
        <CalendarDays size={14} style={{ color: 'var(--color-text-muted)' }} />
        {label}
        <ChevronDown size={13} style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 z-30 w-64 rounded-xl border border-(--color-border) p-1.5"
          style={{ background: 'var(--color-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
          {RANGES.map(r => (
            <button key={r.key} type="button" onClick={() => { setRangeKey(r.key); setOpen(false) }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-500 text-left hover:bg-(--color-surface-2)"
              style={{ color: 'var(--color-text-primary)' }}>
              {r.label}
              {rangeKey === r.key && <Check size={13} style={{ color: 'var(--color-brand)' }} />}
            </button>
          ))}
          <div className="border-t border-(--color-border) mt-1.5 pt-2 px-1.5 pb-1">
            <p className="text-[10px] font-700 uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Custom range</p>
            <div className="space-y-1.5">
              <input type="date" value={custom.start} max={custom.end || undefined}
                onChange={e => setCustom(c => ({ ...c, start: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
              <input type="date" value={custom.end} min={custom.start || undefined}
                onChange={e => setCustom(c => ({ ...c, end: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
              <button type="button" disabled={!custom.start || !custom.end}
                onClick={() => { setRangeKey('custom'); setOpen(false) }}
                className="btn btn-primary btn-md w-full disabled:opacity-40">Apply custom range</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonDropdown({ people, value, setValue }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutside(ref, () => setOpen(false))
  const current = people.find(p => p.id === value) || people[0]
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-(--color-border) text-xs font-600 hover:bg-(--color-surface-2)"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
        {current.id === 'org' ? <Building2 size={14} style={{ color: 'var(--color-text-muted)' }} /> : <UserRound size={14} style={{ color: 'var(--color-text-muted)' }} />}
        <span className="max-w-32 truncate">{current.name}</span>
        <ChevronDown size={13} style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 z-30 w-56 max-h-72 overflow-y-auto rounded-xl border border-(--color-border) p-1.5"
          style={{ background: 'var(--color-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
          {people.map(p => (
            <button key={p.id} type="button" onClick={() => { setValue(p.id); setOpen(false) }}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-500 text-left hover:bg-(--color-surface-2)"
              style={{ color: 'var(--color-text-primary)' }}>
              <span className="flex items-center gap-2 min-w-0">
                {p.id === 'org' ? <Building2 size={13} style={{ color: 'var(--color-text-muted)' }} /> : <UserRound size={13} style={{ color: 'var(--color-text-muted)' }} />}
                <span className="truncate">{p.name}</span>
                {p.role && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>· {p.role}</span>}
              </span>
              {value === p.id && <Check size={13} style={{ color: 'var(--color-brand)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Resolve a { since, until, label } window from a range key + custom dates.
function resolveWindow(rangeKey, custom) {
  if (rangeKey === 'custom' && custom.start && custom.end) {
    return {
      since: startOfDay(new Date(custom.start)), until: endOfDay(new Date(custom.end)),
      label: `${format(new Date(custom.start), 'd MMM')} – ${format(new Date(custom.end), 'd MMM')}`,
    }
  }
  const r = RANGES.find(x => x.key === rangeKey) || RANGES[1]
  return { since: r.days ? startOfDay(subDays(new Date(), r.days - 1)) : null, until: endOfDay(new Date()), label: r.label }
}

// ── Metrics (pure) — computed for a given window + person ─────
function computeMetrics(data, since, until, person, people, org) {
  const isOrg = person === 'org'
  const personObj = people.find(p => p.id === person) || people[0] || { id: 'org', name: 'Organization' }
  const within = (d) => { if (!d) return false; const t = new Date(d); if (since && t < since) return false; if (until && t > until) return false; return true }
  const owns = (assignedId) => isOrg || assignedId === person

  const leads = data.leads.filter(l => within(l.created_at) && owns(l.assigned_to))
  const patients = data.patients.filter(p => within(p.created_at) && owns(p.assigned_to))
  const appts = data.appts.filter(a => within(a.scheduled_at) && (isOrg || a.doctor_id === person))
  const followups = data.followups.filter(f => within(f.created_at) && (isOrg || f.caller_name === personObj.name))
  const payments = data.payments.filter(p => within(p.payment_date || p.created_at))

  const converted = leads.filter(l => l.stage === 'Converted').length
  const revenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const convRate = leads.length ? Math.round((converted / leads.length) * 100) : 0

  const byStage = STAGES.map(s => ({ label: s, value: leads.filter(l => l.stage === s).length, color: STAGE_COLOR[s] }))

  const srcMap = {}
  leads.forEach(l => { const s = l.source || 'Other'; srcMap[s] = (srcMap[s] || 0) + 1 })
  const bySource = Object.entries(srcMap).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))

  const apptStatus = ['booked', 'confirmed', 'completed', 'cancelled']
    .map(s => ({ label: s[0].toUpperCase() + s.slice(1), value: appts.filter(a => a.status === s).length, color: APPT_COLOR[s] }))

  const outMap = {}
  followups.forEach(f => { if (f.outcome) outMap[f.outcome] = (outMap[f.outcome] || 0) + 1 })
  const outcomes = Object.entries(outMap).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))

  const staff = org?.settings?.staff_members || []
  const nameOf = (id) => staff.find(s => s.id === id)?.name || (id ? 'Other' : 'Unassigned')
  const teamMap = {}
  leads.forEach(l => { const n = nameOf(l.assigned_to); teamMap[n] = (teamMap[n] || 0) + 1 })
  const team = Object.entries(teamMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))

  const end = until || new Date()
  const start = since || new Date(Math.min(...(data.leads.length ? data.leads.map(l => +new Date(l.created_at)) : [+end])))
  const spanDays = Math.max(1, Math.round((end - start) / 86400000))
  let buckets, fmt, same
  if (spanDays <= 31) { buckets = eachDayOfInterval({ start, end }); fmt = 'd MMM'; same = isSameDay }
  else if (spanDays <= 182) { buckets = eachWeekOfInterval({ start, end }); fmt = 'd MMM'; same = (a, b) => isSameWeek(a, b) }
  else { buckets = eachMonthOfInterval({ start, end }); fmt = 'MMM yy'; same = isSameMonth }
  const leadsSeries = buckets.map(b => ({ label: format(b, fmt), value: leads.filter(l => same(new Date(l.created_at), b)).length }))
  const revenueSeries = buckets.map(b => ({ label: format(b, fmt), value: Math.round(payments.filter(p => same(new Date(p.payment_date || p.created_at), b)).reduce((s, p) => s + (Number(p.amount) || 0), 0)) }))

  return { leads, patients, appts, followups, payments, converted, revenue, convRate, byStage, bySource, apptStatus, outcomes, team, leadsSeries, revenueSeries }
}

// ── Page ─────────────────────────────────────────────────────
export default function ReportsPage() {
  const { orgId, org } = useOrg()
  const [rangeKey, setRangeKey] = useState('30')
  const [custom, setCustom] = useState({ start: '', end: '' })
  const [person, setPerson] = useState('org')
  const [chartType, setChartType] = useState({
    leads: 'area', stage: 'bar', source: 'bar', appts: 'pie', outcomes: 'bar', revenue: 'area', team: 'bar',
  })
  const setType = (k, v) => setChartType(c => ({ ...c, [k]: v }))
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ leads: [], patients: [], appts: [], followups: [], payments: [] })

  // People for the filter: Organization + staff + doctors.
  const people = useMemo(() => {
    const staff = (org?.settings?.staff_members || []).map(s => ({ id: s.id, name: s.name, role: s.designation || 'Staff' }))
    const docs = (org?.settings?.doctors || []).map(d => ({ id: d.id, name: d.name, role: d.department || 'Doctor' }))
    const seen = new Set()
    const merged = [...staff, ...docs].filter(p => p.id && p.name && !seen.has(p.id) && seen.add(p.id))
    return [{ id: 'org', name: 'Organization', role: '' }, ...merged]
  }, [org])

  const load = () => {
    if (!orgId) return
    setLoading(true)
    Promise.all([
      getLeads({ orgId }), getPatients({ orgId }), getAppointments({ orgId }),
      getFollowups({ orgId }), getPayments({ orgId }),
    ]).then(([leads, patients, appts, followups, payments]) => {
      setData({ leads: leads || [], patients: patients || [], appts: appts || [], followups: followups || [], payments: payments || [] })
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [orgId])

  // Resolve the active window (A).
  const { since, until, rangeLabel } = useMemo(() => {
    const w = resolveWindow(rangeKey, custom)
    return { since: w.since, until: w.until, rangeLabel: w.label }
  }, [rangeKey, custom])

  const within = (d) => { if (!d) return false; const t = new Date(d); if (since && t < since) return false; if (until && t > until) return false; return true }

  const personObj = people.find(p => p.id === person) || people[0]
  const isOrg = person === 'org'

  const m = useMemo(() => computeMetrics(data, since, until, person, people, org), [data, since, until, person, people, org])

  if (loading) return <div className="p-6 flex items-center justify-center h-[60vh]"><Spinner /></div>

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
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{personObj.name} · {rangeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button type="button" onClick={load} title="Refresh"
            className="btn btn-secondary btn-icon">
            <RefreshCw size={15} />
          </button>
          <PersonDropdown people={people} value={person} setValue={setPerson} />
          <RangeDropdown rangeKey={rangeKey} setRangeKey={setRangeKey} custom={custom} setCustom={setCustom} label={rangeLabel} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile icon={TrendingUp} label="New Leads" value={m.leads.length} />
        <StatTile icon={Target} label="Conversion Rate" value={`${m.convRate}%`} sub={`${m.converted} converted`} />
        <StatTile icon={Users} label="New Patients" value={m.patients.length} />
        <StatTile icon={Calendar} label="Appointments" value={m.appts.length} />
        <StatTile icon={PhoneCall} label="Follow-ups" value={m.followups.length} />
        <StatTile icon={IndianRupee} label="Revenue" value={inr(m.revenue)} sub={isOrg ? `${m.payments.length} payments` : 'org-wide'} />
      </div>

      <Panel title="Leads over time" subtitle="New leads created per period"
        right={<ChartToggle types={['area', 'line', 'bar']} value={chartType.leads} onChange={v => setType('leads', v)} />}>
        <TimeChart type={chartType.leads} data={m.leadsSeries} color="var(--color-brand)" valueName="Leads" />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Pipeline by stage" subtitle="Where your leads currently sit"
          right={<ChartToggle types={['bar', 'pie', 'line']} value={chartType.stage} onChange={v => setType('stage', v)} />}>
          <CategoryChart type={chartType.stage} rows={m.byStage} />
        </Panel>
        <Panel title="Lead sources" subtitle="Where leads are coming from"
          right={<ChartToggle types={['bar', 'pie', 'line']} value={chartType.source} onChange={v => setType('source', v)} />}>
          <CategoryChart type={chartType.source} rows={m.bySource} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Appointments by status"
          right={<ChartToggle types={['pie', 'bar', 'line']} value={chartType.appts} onChange={v => setType('appts', v)} />}>
          <CategoryChart type={chartType.appts} rows={m.apptStatus} />
        </Panel>
        <Panel title="Follow-up outcomes" subtitle="Top recorded outcomes"
          right={<ChartToggle types={['bar', 'pie', 'line']} value={chartType.outcomes} onChange={v => setType('outcomes', v)} />}>
          <CategoryChart type={chartType.outcomes} rows={m.outcomes} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Revenue over time" subtitle="Payments collected per period"
          right={<ChartToggle types={['area', 'line', 'bar']} value={chartType.revenue} onChange={v => setType('revenue', v)} />}>
          <TimeChart type={chartType.revenue} data={m.revenueSeries} color="#10b981" valueName="Revenue" prefix="₹" />
        </Panel>
        <Panel title="Team performance" subtitle="Leads by assigned member"
          right={<ChartToggle types={['bar', 'pie', 'line']} value={chartType.team} onChange={v => setType('team', v)} />}>
          <CategoryChart type={chartType.team} rows={m.team} />
        </Panel>
      </div>
    </div>
  )
}
