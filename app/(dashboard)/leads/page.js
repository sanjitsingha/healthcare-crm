'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, LayoutGrid, List, TrendingUp, Filter } from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Select, Textarea, TagsInput, EmptyState, Spinner, Avatar } from '@/components/ui'
import { getLeads, createLead, getContacts, getOrganizations } from '@/lib/supabase/queries'
import Link from 'next/link'
import { format } from 'date-fns'
import clsx from 'clsx'

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
const STAGE_COLORS = {
  New: 'border-t-blue-400', Contacted: 'border-t-purple-400', Qualified: 'border-t-amber-400',
  Proposal: 'border-t-orange-400', Negotiation: 'border-t-pink-400', Won: 'border-t-emerald-400', Lost: 'border-t-red-400',
}

function CreateLeadModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', stage: 'New', priority: 'Medium', source: 'Other', value: '', tags: [], description: '' })
  const [contacts, setContacts] = useState([])
  const [orgs, setOrgs] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getContacts().then(setContacts).catch(() => [])
      getOrganizations().then(setOrgs).catch(() => [])
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const lead = await createLead({
        title: form.title,
        description: form.description,
        stage: form.stage,
        priority: form.priority,
        source: form.source,
        value: parseFloat(form.value) || 0,
        contact_id: form.contact_id || null,
        organization_id: form.organization_id || null,
        tags: form.tags,
      })
      onCreated(lead)
      setForm({ title: '', stage: 'New', priority: 'Medium', source: 'Other', value: '', tags: [], description: '' })
      onClose()
    } catch (err) {
      alert('Error creating lead: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Lead" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Lead Title *" placeholder="e.g. Cardiac Equipment Supply" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Stage" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
            options={STAGES.map(s => ({ value: s, label: s }))} />
          <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            options={['Low','Medium','High','Urgent'].map(s => ({ value: s, label: s }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Contact" value={form.contact_id || ''} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
            options={[{ value: '', label: 'Select contact...' }, ...contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}`.trim() }))]} />
          <Select label="Organization" value={form.organization_id || ''} onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
            options={[{ value: '', label: 'Select org...' }, ...orgs.map(o => ({ value: o.id, label: o.name }))]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Deal Value (₹)" type="number" placeholder="50000" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          <Select label="Source" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            options={['Website','Referral','Cold Call','Email','Event','Social Media','Other'].map(s => ({ value: s, label: s }))} />
        </div>
        <Input label="Expected Close Date" type="date" value={form.expected_close_date || ''} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} />
        <div className="space-y-1">
          <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Tags</label>
          <TagsInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
        </div>
        <Textarea label="Description" placeholder="Brief description of this lead..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Lead'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function KanbanView({ leads }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {STAGES.map(stage => {
        const stageLeads = leads.filter(l => l.stage === stage)
        return (
          <div key={stage} className="flex-shrink-0 w-64">
            <div className={clsx('bg-white rounded-xl border-t-2 border border-[var(--color-border)] overflow-hidden', STAGE_COLORS[stage])}>
              <div className="px-3 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
                <span className="text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>{stage}</span>
                <span className="text-xs font-700 px-1.5 py-0.5 rounded-full bg-gray-100" style={{ color: 'var(--color-text-primary)' }}>{stageLeads.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-32">
                {stageLeads.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <div className="bg-white rounded-lg border border-[var(--color-border)] p-3 hover:shadow-md transition-all cursor-pointer">
                      <p className="text-xs font-600 mb-1 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>{lead.title}</p>
                      {lead.organizations?.name && (
                        <p className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{lead.organizations.name}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge>{lead.priority}</Badge>
                        {lead.value > 0 && (
                          <span className="text-[10px] font-600" style={{ color: 'var(--color-brand)' }}>
                            ₹{lead.value >= 1000 ? `${(lead.value/1000).toFixed(0)}K` : lead.value}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({ leads }) {
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]" style={{ background: 'var(--color-surface-2)' }}>
            {['Lead', 'Organization / Contact', 'Stage', 'Priority', 'Value', 'Created'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr key={lead.id} className={clsx('border-b border-[var(--color-border)] hover:bg-gray-50 transition-colors cursor-pointer', i % 2 === 0 ? '' : 'bg-[var(--color-surface-2)]')}>
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="font-500 hover:underline" style={{ color: 'var(--color-text-primary)' }}>{lead.title}</Link>
              </td>
              <td className="px-4 py-3">
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{lead.organizations?.name || '—'}</p>
                {lead.contacts && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{lead.contacts.first_name} {lead.contacts.last_name || ''}</p>
                )}
              </td>
              <td className="px-4 py-3"><Badge>{lead.stage}</Badge></td>
              <td className="px-4 py-3"><Badge>{lead.priority}</Badge></td>
              <td className="px-4 py-3">
                <span className="text-xs font-600" style={{ color: 'var(--color-brand)' }}>
                  {lead.value ? `₹${lead.value >= 1000 ? `${(lead.value/1000).toFixed(0)}K` : lead.value}` : '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {format(new Date(lead.created_at), 'd MMM')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No leads found</p>
        </div>
      )}
    </Card>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [view, setView] = useState('kanban')
  const [createOpen, setCreateOpen] = useState(false)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLeads({ search, stage: stageFilter })
      setLeads(data || [])
    } catch { setLeads([]) }
    setLoading(false)
  }, [search, stageFilter])

  useEffect(() => { loadLeads() }, [loadLeads])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Leads</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{leads.length} leads</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Lead</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2"
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none cursor-pointer"
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
        >
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="flex rounded-lg border border-[var(--color-border)] bg-white overflow-hidden ml-auto">
          {[['kanban', LayoutGrid], ['list', List]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)} className={clsx('p-2 transition-colors', view === v ? 'text-white' : 'hover:bg-gray-50')} style={view === v ? { background: 'var(--color-brand)' } : {}}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : view === 'kanban' ? (
        <KanbanView leads={leads} />
      ) : (
        <ListView leads={leads} />
      )}

      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(lead) => { setLeads(prev => [lead, ...prev]); setCreateOpen(false) }}
      />
    </div>
  )
}
