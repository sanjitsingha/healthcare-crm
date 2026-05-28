'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, Users, Building2, CheckSquare, Bell, DollarSign, Award, Clock, Activity, Target, Zap } from 'lucide-react'
import { StatCard, Card, Badge, Spinner } from '@/components/ui'
import { getDashboardStats, getLeads, getTasks, getFollowups, getAppointments } from '@/lib/supabase/queries'
import Link from 'next/link'
import { format, isToday, isTomorrow, isPast } from 'date-fns'

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
const STAGE_BAR_COLOR = {
  New: '#3b82f6', Contacted: '#8b5cf6', Qualified: '#f59e0b',
  Proposal: '#f97316', Negotiation: '#ec4899', Won: '#10b981', Lost: '#ef4444',
}

function formatCurrency(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [recentLeads, setRecentLeads] = useState([])
  const [tasks, setTasks] = useState([])
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)

  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    Promise.all([
      getDashboardStats().catch(() => null),
      getLeads().catch(() => []),
      getTasks({ status: 'Pending' }).catch(() => []),
      getFollowups({ status: 'Scheduled' }).catch(() => []),
      getAppointments({ status: 'booked' }).catch(() => []),
    ]).then(([s, l, t, f, a]) => {
      setStats(s)
      setRecentLeads((l || []).slice(0, 5))
      setTasks((t || []).slice(0, 5))
      setFollowups((f || []).slice(0, 5))
      setAppointments((a || []).slice(0, 5))
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  )

  const totalStage = STAGES.reduce((s, k) => s + (stats?.stageCounts?.[k] || 0), 0) || 1

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats?.totalLeads ?? 0} icon={TrendingUp} color="brand" trend={12} />
        <StatCard label="Total Patients" value={stats?.totalPatients ?? 0} icon={Users} color="blue" trend={8} />
        <StatCard label="Revenue Won" value={formatCurrency(stats?.totalValue ?? 0)} icon={DollarSign} color="brand" trend={15} />
        <StatCard label="Conversion" value={`${stats?.conversionRate ?? 0}%`} icon={Target} color="amber" trend={2} />
        <StatCard label="Pending Tasks" value={stats?.pendingTasks ?? 0} icon={CheckSquare} color="amber" />
        <StatCard label="Appointments" value={appointments.length} icon={Clock} color="purple" />
        <StatCard label="Organizations" value={stats?.totalOrgs ?? 0} icon={Building2} color="purple" />
        <StatCard label="Automations" value="12" icon={Zap} color="amber" />
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
