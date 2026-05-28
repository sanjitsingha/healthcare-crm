'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, LayoutGrid, List, Filter, Download, AlertCircle } from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Select, Textarea, TagsInput, Spinner } from '@/components/ui'
import { getLeads, createLead, getContacts, getOrganizations, getPatients, getTags } from '@/lib/supabase/queries'
import KanbanBoard from '@/components/crm/KanbanBoard'
import Link from 'next/link'
import { format } from 'date-fns'
import clsx from 'clsx'

const STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']

function CreateLeadModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', stage: 'New', priority: 'Medium', source: 'Other',
    value: '', tags: [], description: '', contact_id: '',
    organization_id: '', patient_id: ''
  })
  const [contacts, setContacts] = useState([])
  const [orgs, setOrgs] = useState([])
  const [patients, setPatients] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([
        getContacts(),
        getOrganizations(),
        getPatients(),
        getTags()
      ]).then(([c, o, p, t]) => {
        setContacts(c || [])
        setOrgs(o || [])
        setPatients(p || [])
        setAvailableTags(t || [])
      })
    }
  }, [open])

  // Simple duplicate detection logic
  const checkDuplicate = (title) => {
    // In a real app, this would be a DB query
    return false
  }

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
        patient_id: form.patient_id || null,
        organization_id: '00000000-0000-0000-0000-000000000000' // Mock org id
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
    <Modal open={open} onClose={onClose} title="Create New Lead" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Lead Title *"
          placeholder="e.g. Dental Implant Inquiry"
          value={form.title}
          onChange={e => {
            setForm(f => ({ ...f, title: e.target.value }))
            setDuplicateWarning(checkDuplicate(e.target.value))
          }}
          required
        />
        {duplicateWarning && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700">
            <AlertCircle size={14} /> Potential duplicate lead detected.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select label="Stage" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
            options={STAGES.map(s => ({ value: s, label: s }))} />
          <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            options={['Low','Medium','High','Urgent'].map(s => ({ value: s, label: s }))} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Link to Patient" value={form.patient_id || ''} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
            options={[{ value: '', label: 'Select patient...' }, ...patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name || ''}`.trim() }))]} />
          <Select label="Organization" value={form.organization_id || ''} onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
            options={[{ value: '', label: 'Select org...' }, ...orgs.map(o => ({ value: o.id, label: o.name }))]} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Deal Value (₹)" type="number" placeholder="50000" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          <Select label="Source" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            options={['Website','Meta Ads','WhatsApp','Referral','Call','Email','Event','Other'].map(s => ({ value: s, label: s }))} />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Tags</label>
          <TagsInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} placeholder="Add tags (VIP, High Priority...)" />
        </div>

        <Textarea label="Description" placeholder="Notes about this lead..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Lead'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ListView({ leads }) {
  return (
    <Card className="p-0 overflow-hidden border-[var(--color-border)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {['Lead Title', 'Patient / Org', 'Stage', 'Priority', 'Value', 'Source', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-600 text-[13px] hover:text-[var(--color-brand)] transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                    {lead.title}
                  </Link>
                  <div className="flex gap-1 mt-1">
                    {lead.tags?.slice(0, 2).map(({ tags: t }) => (
                      <span key={t.id} className="text-[8px] px-1 rounded-sm border" style={{ color: t.color, borderColor: `${t.color}40` }}>{t.name}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-500" style={{ color: 'var(--color-text-primary)' }}>
                    {lead.patients ? `${lead.patients.first_name} ${lead.patients.last_name || ''}` : lead.organizations?.name || '—'}
                  </p>
                  {lead.patients && lead.organizations && (
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{lead.organizations.name}</p>
                  )}
                </td>
                <td className="px-4 py-3"><Badge>{lead.stage}</Badge></td>
                <td className="px-4 py-3"><Badge>{lead.priority}</Badge></td>
                <td className="px-4 py-3">
                  <span className="text-xs font-700" style={{ color: 'var(--color-brand)' }}>
                    {lead.value ? `₹${lead.value.toLocaleString()}` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                   <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{lead.source}</span>
                </td>
                <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {format(new Date(lead.created_at), 'MMM d, yyyy')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {leads.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No leads found matching your filters.</p>
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

  useEffect(() => {
    loadLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Lead Pipeline</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Track and manage potential patients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="hidden sm:flex">
            <Download size={14} /> Export
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="shadow-lg shadow-[var(--color-brand)]/20">
            <Plus size={16} /> New Lead
          </Button>
        </div>
      </div>

      <Card className="p-3 border-[var(--color-border)] bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all"
              placeholder="Search by lead title, patient or organization..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select
              className="min-w-[140px] flex-1 md:flex-none"
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              options={[{ value: '', label: 'All Stages' }, ...STAGES.map(s => ({ value: s, label: s }))]}
            />

            <div className="flex rounded-lg border border-[var(--color-border)] bg-white overflow-hidden p-1">
              {[
                { id: 'kanban', icon: LayoutGrid, label: 'Board' },
                { id: 'list', icon: List, label: 'List' }
              ].map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={clsx(
                    'p-1.5 rounded-md transition-all',
                    view === id ? 'text-white' : 'text-[var(--color-text-muted)] hover:bg-gray-100'
                  )}
                  style={view === id ? { background: 'var(--color-brand)' } : {}}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner size={32} />
          <p className="text-xs font-500 animate-pulse text-[var(--color-text-muted)]">Loading pipeline...</p>
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard leads={leads} />
      ) : (
        <ListView leads={leads} />
      )}

      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(lead) => { loadLeads(); setCreateOpen(false) }}
      />
    </div>
  )
}
