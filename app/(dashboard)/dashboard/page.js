'use client'
import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Users, Calendar, CheckSquare, Bell, DollarSign, Clock, Target, Zap, Sparkles, RefreshCw, PhoneCall } from 'lucide-react'
import { useAIPanel } from '@/lib/context/AIPanelContext'
import { StatCard, Card, Badge, Spinner } from '@/components/ui'
import { getDashboardStats, getLeads, getTasks, getFollowups, getAppointments, getPayments } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import DateRangePicker, { rangeFromPreset } from '@/components/crm/DateRangePicker'
import UserSelector from '@/components/crm/UserSelector'
import Link from 'next/link'
import { format, isToday, isTomorrow, isPast } from 'date-fns'

// Stages match the DB schema
const STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']
const STAGE_BAR_COLOR = {
  New: '#3b82f6', Contacted: '#8b5cf6', Interested: '#f59e0b',
  'Follow-up': '#f97316', Converted: '#10b981', Lost: '#ef4444',
}

const SRC_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

function formatCurrency(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export default function DashboardPage() {
  const { orgId, org } = useOrg()
  const { setOpen: openAI } = useAIPanel()
  const [stats, setStats] = useState(null)
  const [recentLeads, setRecentLeads] = useState([])
  const [tasks, setTasks] = useState([])
  const [followups, setFollowups] = useState([])
  const [appointments, setAppointments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(() => rangeFromPreset('30d'))
  const [user, setUser] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => { setRefreshing(true); setRefreshKey(k => k + 1) }

  // Team members to filter by (leads/patients/tasks are owned via assigned_to).
  const people = useMemo(() => {
    const staff = (org?.settings?.staff_members || []).map(s => ({ id: s.id, name: s.name, role: s.designation || 'Staff' }))
    const docs  = (org?.settings?.doctors || []).map(d => ({ id: d.id, name: d.name, role: d.department || 'Doctor' }))
    const seen = new Set()
    return [...staff, ...docs].filter(p => p.id && p.name && !seen.has(p.id) && seen.add(p.id))
  }, [org])

  const doctorName = id => (org?.settings?.doctors || []).find(d => d.id === id)?.name || ''

  // Monthly revenue for the last 6 months (org-wide), aggregated from payments.
  const revenueTrend = useMemo(() => {
    const base = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), value: 0 })
    }
    const idx = Object.fromEntries(months.map((m, i) => [m.key, i]))
    ;(payments || []).forEach(p => {
      const dt = new Date(p.payment_date || p.created_at)
      if (isNaN(dt)) return
      const k = `${dt.getFullYear()}-${dt.getMonth()}`
      if (k in idx) months[idx[k]].value += Number(p.amount) || 0
    })
    return months
  }, [payments])
  const revenueTotal = revenueTrend.reduce((s, m) => s + m.value, 0)
  const revenueMax = Math.max(...revenueTrend.map(m => m.value), 1)

  // Follow-ups, upcoming appointments, payments — current actionable items (org-wide).
  useEffect(() => {
    if (!orgId) return
    getFollowups({ status: 'Scheduled', orgId }).then(f => setFollowups((f || []).slice(0, 5))).catch(() => {})
    getAppointments({ orgId }).then(a => {
      const now = Date.now()
      const upcoming = (a || []).filter(x => x.scheduled_at && new Date(x.scheduled_at).getTime() >= now && x.status !== 'cancelled')
      setAppointments(upcoming.slice(0, 5))
    }).catch(() => {})
    getPayments({ orgId }).then(p => setPayments(p || [])).catch(() => {})
  }, [orgId, refreshKey])

  // Range + user aware metrics, recent leads, and pending tasks.
  useEffect(() => {
    if (!orgId) return
    let active = true
    const assignedTo = user === 'all' ? null : user
    getDashboardStats(orgId, { from: range.from, to: range.to, assignedTo })
      .then(s => { if (active) { setStats(s); setLoading(false); setRefreshing(false) } })
      .catch(() => { if (active) { setLoading(false); setRefreshing(false) } })
    getLeads({ orgId }).then(l => {
      if (!active) return
      const within = (l || []).filter(x => {
        if (assignedTo && x.assigned_to !== assignedTo) return false
        if (!range.from || !range.to) return true
        const c = new Date(x.created_at)
        return c >= range.from && c < range.to
      })
      setRecentLeads(within.slice(0, 5))
    }).catch(() => {})
    getTasks({ status: 'Pending', orgId }).then(t => {
      if (!active) return
      const mine = (t || []).filter(x => !assignedTo || x.assigned_to === assignedTo)
      setTasks(mine.slice(0, 5))
    }).catch(() => {})
    return () => { active = false }
  }, [orgId, range, user, refreshKey])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  )

  const totalStage = STAGES.reduce((s, k) => s + (stats?.stageCounts?.[k] || 0), 0) || 1
  const activeRules = (org?.settings?.rules || []).filter(r => r.enabled).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UserSelector value={user} onChange={setUser} users={people} />
          <DateRangePicker value={range} onChange={setRange} />
          <button type="button" onClick={refresh} disabled={refreshing} title="Refresh"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-colors hover:bg-(--color-surface-2) disabled:opacity-60"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <span className="relative rounded-full p-[1.5px]" style={{ background: 'linear-gradient(90deg, var(--color-brand), #a78bfa, #38bdf8, #a78bfa, var(--color-brand))', backgroundSize: '300% 100%', animation: 'ai-border 3s linear infinite' }}>
            <button
              type="button"
              onClick={() => openAI(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-700 text-white transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: 'var(--color-brand)' }}
            >
              <Sparkles size={14} style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.9))' }} />
              <span style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' }}>Ask Zeo</span>
            </button>
          </span>
        </div>

        <style>{`
          @keyframes ai-border {
            0%   { background-position: 0% 0% }
            100% { background-position: 300% 0% }
          }
        `}</style>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leads" value={stats?.totalLeads ?? 0} icon={TrendingUp} color="brand" trend={stats?.leadsTrend} trendLabel="vs prev period" />
        <StatCard label="Patients" value={stats?.totalPatients ?? 0} icon={Users} color="blue" trend={stats?.patientsTrend} trendLabel="vs prev period" />
        <StatCard label="Revenue Won" value={formatCurrency(stats?.totalValue ?? 0)} icon={DollarSign} color="brand" />
        <StatCard label="Conversion" value={`${stats?.conversionRate ?? 0}%`} icon={Target} color="amber" />
        <StatCard label="Pending Tasks" value={stats?.pendingTasks ?? 0} icon={CheckSquare} color="amber" />
        <StatCard label="Upcoming Appts" value={stats?.appointmentsUpcoming ?? 0} icon={Clock} color="purple" />
        <StatCard label="Today's Appts" value={stats?.appointmentsToday ?? 0} icon={Calendar} color="blue" />
        <StatCard label="Active Rules" value={activeRules} icon={Zap} color="amber" />
      </div>

      {/* Today's focus */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-(--color-border)">
          {[
            { label: 'Appointments today', value: stats?.appointmentsToday ?? 0, icon: Calendar,    color: '#7c3aed' },
            { label: 'Follow-ups due',     value: stats?.followupsDueToday ?? 0, icon: PhoneCall,   color: '#0ea5e9' },
            { label: 'Tasks due today',    value: stats?.tasksDueToday ?? 0,     icon: CheckSquare, color: '#d97706' },
            { label: 'New leads today',    value: stats?.newLeadsToday ?? 0,     icon: TrendingUp,  color: '#16a34a' },
          ].map(m => {
            const Icon = m.icon
            return (
              <div key={m.label} className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg shrink-0" style={{ background: m.color + '18' }}>
                  <Icon size={16} style={{ color: m.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-800 leading-none" style={{ color: 'var(--color-text-primary)' }}>{m.value}</p>
                  <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{m.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-600 mb-4" style={{ color: 'var(--color-text-primary)' }}>Pipeline Overview</h3>
          <div className="space-y-2.5">
            {STAGES.map(stage => {
              const count = stats?.stageCounts?.[stage] || 0
              const pct = Math.round((count / totalStage) * 100)
              return (
                <div key={stage}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{stage}</span>
                    <span className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: STAGE_BAR_COLOR[stage] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Recent Leads */}
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Recent Leads</h3>
            <Link href="/leads" className="text-xs font-500 hover:underline" style={{ color: 'var(--color-brand)' }}>View all</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No leads yet. <Link href="/leads" className="underline" style={{ color: 'var(--color-brand)' }}>Create one</Link></p>
          ) : (
            <div className="space-y-2">
              {recentLeads.map(lead => (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{lead.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {lead.organizations?.name || lead.contacts?.first_name || 'No contact'}
                      </p>
                    </div>
                    <Badge>{lead.stage}</Badge>
                    <span className="text-xs font-600 whitespace-nowrap" style={{ color: 'var(--color-brand)' }}>
                      {lead.value ? formatCurrency(lead.value) : '—'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Insights: sources · revenue · attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Sources */}
        <Card>
          <h3 className="text-sm font-600 mb-4" style={{ color: 'var(--color-text-primary)' }}>Lead Sources</h3>
          {!stats?.sources?.length ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No leads in this range</p>
          ) : (() => {
            const total = stats.sources.reduce((a, b) => a + b.count, 0) || 1
            return (
              <div className="space-y-2.5">
                {stats.sources.slice(0, 6).map((s, i) => {
                  const pct = Math.round((s.count / total) * 100)
                  return (
                    <div key={s.source}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{s.source}</span>
                        <span className="text-xs font-600 whitespace-nowrap ml-2" style={{ color: 'var(--color-text-primary)' }}>{s.count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: SRC_COLORS[i % SRC_COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </Card>

        {/* Revenue Trend */}
        <Card>
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Revenue (6 mo)</h3>
            <Link href="/billing" className="text-xs font-500 hover:underline" style={{ color: 'var(--color-brand)' }}>View all</Link>
          </div>
          <p className="text-2xl font-800 mb-3" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(revenueTotal)}</p>
          <div className="flex items-end gap-2" style={{ height: 96 }}>
            {revenueTrend.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <div className="w-full rounded-t-md transition-all" title={formatCurrency(m.value)}
                  style={{ height: `${Math.max((m.value / revenueMax) * 100, 3)}%`, background: 'var(--color-brand)', opacity: 0.85 }} />
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Needs Attention */}
        <Card>
          <h3 className="text-sm font-600 mb-4" style={{ color: 'var(--color-text-primary)' }}>Needs Attention</h3>
          <div className="space-y-2">
            {[
              { label: 'Overdue tasks',     value: stats?.overdueTasks ?? 0,    href: '/tasks', icon: CheckSquare },
              { label: 'Missed follow-ups', value: stats?.missedFollowups ?? 0, href: '/leads', icon: PhoneCall },
              { label: 'Unassigned leads',  value: stats?.unassignedLeads ?? 0, href: '/leads', icon: TrendingUp },
            ].map(a => {
              const Icon = a.icon
              const warn = a.value > 0
              return (
                <Link key={a.label} href={a.href} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-lg shrink-0" style={{ background: warn ? '#fef2f2' : 'var(--color-surface-2)' }}>
                    <Icon size={14} style={{ color: warn ? '#dc2626' : 'var(--color-text-muted)' }} />
                  </div>
                  <span className="flex-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{a.label}</span>
                  <span className="text-base font-800" style={{ color: warn ? '#dc2626' : 'var(--color-text-muted)' }}>{a.value}</span>
                </Link>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Upcoming Appointments</h3>
          <Link href="/appointments" className="text-xs font-500 hover:underline" style={{ color: 'var(--color-brand)' }}>View all</Link>
        </div>
        {appointments.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No upcoming appointments</p>
        ) : (
          <div className="space-y-2">
            {appointments.map(a => {
              const who = a.patients
                ? `${a.patients.first_name} ${a.patients.last_name || ''}`.trim()
                : (a.leads?.title || 'Appointment')
              const doc = doctorName(a.doctor_id)
              return (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--color-brand-50)' }}>
                    <Calendar size={14} style={{ color: 'var(--color-brand)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{who}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {format(new Date(a.scheduled_at), 'EEE, d MMM · h:mm a')}{doc ? ` · ${doc}` : ''}
                    </p>
                  </div>
                  <Badge>{a.status}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Pending Tasks</h3>
            <Link href="/tasks" className="text-xs font-500 hover:underline" style={{ color: 'var(--color-brand)' }}>View all</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No pending tasks</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: task.priority === 'Urgent' ? '#ef4444' : task.priority === 'High' ? '#f97316' : 'var(--color-brand)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs" style={{ color: isPast(new Date(task.due_date)) ? '#ef4444' : 'var(--color-text-muted)' }}>
                        {isToday(new Date(task.due_date)) ? 'Today' : isTomorrow(new Date(task.due_date)) ? 'Tomorrow' : format(new Date(task.due_date), 'd MMM')}
                      </p>
                    )}
                  </div>
                  <Badge>{task.priority}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Follow-ups */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Upcoming Follow-ups</h3>
            <Link href="/followups" className="text-xs font-500 hover:underline" style={{ color: 'var(--color-brand)' }}>View all</Link>
          </div>
          {followups.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No upcoming follow-ups</p>
          ) : (
            <div className="space-y-2">
              {followups.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--color-brand-50)' }}>
                    <Bell size={14} style={{ color: 'var(--color-brand)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {f.leads?.title || 'Follow-up'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {f.type} · {format(new Date(f.scheduled_at), 'd MMM, h:mm a')}
                    </p>
                  </div>
                  <Badge>{f.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
