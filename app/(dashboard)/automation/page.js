'use client'
import { useEffect, useState } from 'react'
import { Zap, Plus, Play, Pause, Trash2, Edit2, AlertCircle, Wand2, Bell, UserPlus, Tag as TagIcon } from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Select, Spinner } from '@/components/ui'
import { getAutomationRules } from '@/lib/supabase/queries'

export default function AutomationPage() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    getAutomationRules()
      .then(data => setRules(data || []))
      .catch(err => {
        console.error('Failed to fetch automation rules:', err)
        setRules([])
      })
      .finally(() => setLoading(false))
  }, [])

  const defaultRules = [
    { id: '1', name: 'New Lead Auto-Tagging', trigger: 'lead_created', action: 'add_tag', condition: 'source == "Meta Ads"', is_active: true },
    { id: '2', name: 'Follow-up Reminder', trigger: 'followup_missed', action: 'notify_admin', condition: 'priority == "Urgent"', is_active: true },
    { id: '3', name: 'Appointment Confirmation', trigger: 'appointment_booked', action: 'send_whatsapp', condition: 'true', is_active: false }
  ]

  const displayRules = rules.length > 0 ? rules : defaultRules

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Workflow Automation</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Automate repetitive tasks and communication workflows</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600">
          <Zap size={16} /> Create Automation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Templates */}
        <Card className="p-6 border-dashed border-2 border-[var(--color-border)] bg-gray-50/30">
          <h3 className="text-sm font-700 text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <Wand2 size={16} className="text-amber-500" /> Recommended Templates
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Auto-assign Meta Leads', desc: 'Assign sales executive to Meta Ads leads', icon: UserPlus },
              { title: 'Appointment Reminders', desc: 'Send WhatsApp 24h before appointment', icon: Bell },
              { title: 'VIP Patient Tagging', desc: 'Tag patients with high billing history', icon: TagIcon },
            ].map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-white border border-gray-100 hover:border-amber-200 transition-all cursor-pointer group shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <t.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-700 text-[var(--color-text-primary)]">{t.title}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{t.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Status Info */}
        <Card className="p-6 bg-[var(--color-brand)] text-white">
          <h3 className="text-sm font-700 mb-4 opacity-80 uppercase tracking-widest">Automation Engine</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                <Play size={20} />
              </div>
              <div>
                <p className="text-2xl font-900">Active</p>
                <p className="text-xs opacity-70">Engine is running and monitoring events</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-[10px] font-700 opacity-60 uppercase">Executions (24h)</p>
                <p className="text-xl font-800">142</p>
              </div>
              <div>
                <p className="text-[10px] font-700 opacity-60 uppercase">Errors</p>
                <p className="text-xl font-800">0</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        <h3 className="text-sm font-700 text-[var(--color-text-primary)] px-1">My Automations</h3>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : (
          <div className="space-y-3">
            {displayRules.map(rule => (
              <Card key={rule.id} className="p-5 border-[var(--color-border)] hover:border-amber-200 transition-all bg-white group shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={clsx(
                      'p-3 rounded-2xl transition-all',
                      rule.is_active ? 'bg-amber-50 text-amber-500' : 'bg-gray-100 text-gray-400'
                    )}>
                      <Zap size={20} fill={rule.is_active ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-800 text-[var(--color-text-primary)]">{rule.name}</h4>
                        <Badge className={rule.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-500'}>
                          {rule.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <p className="text-[11px] font-600" style={{ color: 'var(--color-text-secondary)' }}>
                          <span className="text-[var(--color-text-muted)] uppercase text-[9px] mr-1">If:</span> {rule.trigger || rule.trigger_event}
                        </p>
                        <p className="text-[11px] font-600" style={{ color: 'var(--color-brand)' }}>
                          <span className="text-[var(--color-text-muted)] uppercase text-[9px] mr-1">Then:</span> {rule.action || 'Custom Action'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className={clsx(
                      'p-2 rounded-xl border transition-all',
                      rule.is_active ? 'border-amber-100 text-amber-600 hover:bg-amber-50' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                    )}>
                      {rule.is_active ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-[var(--color-text-primary)]">
                      <Edit2 size={18} />
                    </button>
                    <button className="p-2 rounded-xl border border-red-50 text-red-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Automation">
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
            <Zap size={32} />
          </div>
          <h3 className="text-lg font-800">Visual Workflow Builder</h3>
          <p className="text-sm text-[var(--color-text-muted)]">Our node-based workflow builder is currently in development. You can use standard templates for now.</p>
          <div className="pt-4 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Close</Button>
            <Button className="bg-amber-500 hover:bg-amber-600">View Templates</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
