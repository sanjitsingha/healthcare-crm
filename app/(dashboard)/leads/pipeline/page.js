'use client'
import { useState, useEffect } from 'react'
import { Plus, Phone, Kanban, List, ChevronDown } from 'lucide-react'
import { getLeads, updateLead } from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import Link from 'next/link'
import { format } from 'date-fns'
import { Spinner } from '@/components/ui'
import clsx from 'clsx'

const DEFAULT_LEAD_STAGES = [
  { name: 'New',        color: '#6366f1' },
  { name: 'Contacted',  color: '#0ea5e9' },
  { name: 'Interested', color: '#f59e0b' },
  { name: 'Follow-up',  color: '#8b5cf6' },
  { name: 'Converted',  color: '#10b981' },
  { name: 'Lost',       color: '#ef4444' },
]

const PRIORITY_COLOR = {
  Low:    { bg: '#f1f5f9', color: '#64748b' },
  Medium: { bg: '#fef9c3', color: '#a16207' },
  High:   { bg: '#fee2e2', color: '#b91c1c' },
  Urgent: { bg: '#f3e8ff', color: '#7c3aed' },
}

// ── Kanban card ────────────────────────────────────────────────
function LeadCard({ lead, onDragStart, staffMembers }) {
  const displayName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.title
  const pri = PRIORITY_COLOR[lead.priority] || PRIORITY_COLOR.Medium
  const assignee = lead.assigned_to ? staffMembers.find(m => m.id === lead.assigned_to) : null
  const phone = lead.phone || lead.patients?.phone || lead.contacts?.phone

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-xl border border-(--color-border) p-3 cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-md"
      style={{ background: 'var(--color-surface)' }}
    >
      <Link href={`/leads/${lead.id}`} className="block" draggable={false}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-xs font-600 leading-snug line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
            {displayName}
          </p>
          <span
            className="text-[9px] font-700 px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wide"
            style={{ background: pri.bg, color: pri.color }}
          >
            {lead.priority}
          </span>
        </div>

        {phone && (
          <div className="flex items-center gap-1.5 mb-1">
            <Phone size={10} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{phone}</span>
          </div>
        )}

        {lead.source && (
          <span
            className="inline-block text-[9px] font-600 px-1.5 py-0.5 rounded-full mb-2"
            style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
          >
            {lead.source}
          </span>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-(--color-border)">
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {format(new Date(lead.created_at), 'MMM d')}
          </span>
          {lead.value > 0 && (
            <span className="text-[10px] font-600" style={{ color: 'var(--color-text-secondary)' }}>
              ₹{Number(lead.value).toLocaleString('en-IN')}
            </span>
          )}
          {assignee && (
            <span
              className="w-5 h-5 rounded-full text-[9px] font-700 flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
              title={assignee.name}
            >
              {assignee.name[0].toUpperCase()}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}

// ── List view — grouped by stage ───────────────────────────────
function ListView({ leads, stages, stageNames, staffMembers }) {
  const [collapsed, setCollapsed] = useState({})
  const toggle = (name) => setCollapsed(p => ({ ...p, [name]: !p[name] }))

  const allStages = [
    ...stages,
    ...(leads.some(l => !stageNames.has(l.stage)) ? [{ name: 'Other', color: '#94a3b8' }] : []),
  ]

  return (
    <div className="p-5 space-y-3">
      {allStages.map(stage => {
        const rows = stage.name === 'Other'
          ? leads.filter(l => !stageNames.has(l.stage))
          : leads.filter(l => l.stage === stage.name)

        const isOpen = !collapsed[stage.name]
        const totalValue = rows.reduce((s, l) => s + (Number(l.value) || 0), 0)

        return (
          <div key={stage.name} className="rounded-2xl border border-(--color-border) overflow-hidden">
            {/* Stage header */}
            <button
              type="button"
              onClick={() => toggle(stage.name)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--color-surface-2)"
              style={{ background: 'var(--color-surface-2)', borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: stage.color }}
            >
              <span className="text-xs font-700 flex-1" style={{ color: 'var(--color-text-primary)' }}>
                {stage.name}
              </span>
              <span
                className="text-[10px] font-700 px-2 py-0.5 rounded-full"
                style={{ background: stage.color + '20', color: stage.color }}
              >
                {rows.length}
              </span>
              {totalValue > 0 && (
                <span className="text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>
                  ₹{totalValue.toLocaleString('en-IN')}
                </span>
              )}
              <ChevronDown
                size={14}
                style={{
                  color: 'var(--color-text-muted)',
                  transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: 'transform 0.15s',
                }}
              />
            </button>

            {/* Rows */}
            {isOpen && (
              rows.length === 0 ? (
                <p className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  No leads in this stage.
                </p>
              ) : (
                <div>
                  {/* Table header */}
                  <div
                    className="grid px-4 py-2 text-[10px] font-600 uppercase tracking-wide border-b border-(--color-border)"
                    style={{ gridTemplateColumns: '1fr 120px 80px 80px 100px 80px 80px', color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}
                  >
                    <span>Name</span>
                    <span>Phone</span>
                    <span>Priority</span>
                    <span>Source</span>
                    <span>Value</span>
                    <span>Assigned</span>
                    <span>Created</span>
                  </div>
                  {rows.map((lead, i) => {
                    const displayName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.title
                    const phone = lead.phone || lead.patients?.phone || lead.contacts?.phone
                    const pri = PRIORITY_COLOR[lead.priority] || PRIORITY_COLOR.Medium
                    const assignee = lead.assigned_to ? staffMembers.find(m => m.id === lead.assigned_to) : null

                    return (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className={clsx(
                          'grid px-4 py-3 text-xs items-center border-b border-(--color-border) transition-colors hover:bg-(--color-surface-2)',
                          i === rows.length - 1 && 'border-b-0'
                        )}
                        style={{ gridTemplateColumns: '1fr 120px 80px 80px 100px 80px 80px', background: 'var(--color-surface)' }}
                      >
                        <span className="font-500 truncate pr-3" style={{ color: 'var(--color-text-primary)' }}>
                          {displayName}
                        </span>
                        <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {phone || '—'}
                        </span>
                        <span>
                          <span
                            className="text-[9px] font-700 px-1.5 py-0.5 rounded-full uppercase"
                            style={{ background: pri.bg, color: pri.color }}
                          >
                            {lead.priority}
                          </span>
                        </span>
                        <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {lead.source || '—'}
                        </span>
                        <span className="font-500" style={{ color: 'var(--color-text-secondary)' }}>
                          {lead.value > 0 ? `₹${Number(lead.value).toLocaleString('en-IN')}` : '—'}
                        </span>
                        <span>
                          {assignee ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-5 h-5 rounded-full text-[9px] font-700 flex items-center justify-center shrink-0"
                                style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}
                              >
                                {assignee.name[0].toUpperCase()}
                              </span>
                              <span className="truncate text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                {assignee.name.split(' ')[0]}
                              </span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {format(new Date(lead.created_at), 'MMM d')}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function LeadPipelinePage() {
  const { org, orgId } = useOrg()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [draggingId, setDraggingId] = useState(null)
  const [draggingStage, setDraggingStage] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const stages = (org?.settings?.lead_stages || DEFAULT_LEAD_STAGES).map(s =>
    typeof s === 'string' ? { name: s, color: '#6366f1' } : s
  )
  const stageNames = new Set(stages.map(s => s.name))
  const staffMembers = org?.settings?.staff_members || []

  useEffect(() => {
    if (!orgId) return
    getLeads({ orgId }).then(data => {
      setLeads(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [orgId])

  const handleDrop = async (targetStage) => {
    if (!draggingId || targetStage === draggingStage) {
      setDraggingId(null); setDraggingStage(null); setDragOver(null)
      return
    }
    const id = draggingId
    const prevStage = draggingStage
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: targetStage } : l))
    setDraggingId(null); setDraggingStage(null); setDragOver(null)
    try {
      await updateLead(id, { stage: targetStage })
    } catch (err) {
      alert(err.message)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: prevStage } : l))
    }
  }

  const otherLeads = leads.filter(l => !stageNames.has(l.stage))

  if (loading) return <div className="flex items-center justify-center py-32"><Spinner size={32} /></div>

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-(--color-border)"
        style={{ background: 'var(--color-surface)' }}
      >
        <div>
          <h1 className="text-base font-700" style={{ color: 'var(--color-text-primary)' }}>Lead Pipeline</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} · {stages.length} stage{stages.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
            <button
              type="button"
              onClick={() => setView('board')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 transition-all"
              style={view === 'board'
                ? { background: 'var(--color-brand)', color: 'white' }
                : { color: 'var(--color-text-muted)' }}
            >
              <Kanban size={13} /> Board
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 transition-all"
              style={view === 'list'
                ? { background: 'var(--color-brand)', color: 'white' }
                : { color: 'var(--color-text-muted)' }}
            >
              <List size={13} /> List
            </button>
          </div>

          <Link
            href="/leads/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-opacity hover:opacity-85"
            style={{ background: 'var(--color-brand)', color: 'white' }}
          >
            <Plus size={13} /> New Lead
          </Link>
        </div>
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-5 min-w-max items-start">
            {stages.map(stage => {
              const cols = leads.filter(l => l.stage === stage.name)
              const totalValue = cols.reduce((sum, l) => sum + (Number(l.value) || 0), 0)
              const isOver = dragOver === stage.name

              return (
                <div
                  key={stage.name}
                  className="flex flex-col w-64 rounded-2xl border border-(--color-border) overflow-hidden transition-all"
                  style={{
                    background: isOver ? stage.color + '08' : 'var(--color-surface-2)',
                    borderColor: isOver ? stage.color + '60' : undefined,
                    minHeight: '200px',
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOver(stage.name) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) }}
                  onDrop={() => handleDrop(stage.name)}
                >
                  <div
                    className="px-3 pt-3 pb-2.5 border-b border-(--color-border)"
                    style={{ borderTopWidth: '3px', borderTopStyle: 'solid', borderTopColor: stage.color }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-700" style={{ color: 'var(--color-text-primary)' }}>{stage.name}</span>
                      <span
                        className="text-[10px] font-700 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: stage.color + '20', color: stage.color }}
                      >
                        {cols.length}
                      </span>
                    </div>
                    {totalValue > 0 && (
                      <p className="text-[10px] mt-0.5 font-500" style={{ color: 'var(--color-text-muted)' }}>
                        ₹{totalValue.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 p-2 flex-1">
                    {cols.length === 0 ? (
                      <div
                        className="flex-1 flex items-center justify-center py-8 rounded-xl border border-dashed border-(--color-border) text-xs"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        Drop here
                      </div>
                    ) : (
                      cols.map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          staffMembers={staffMembers}
                          onDragStart={() => { setDraggingId(lead.id); setDraggingStage(lead.stage) }}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}

            {otherLeads.length > 0 && (
              <div
                className="flex flex-col w-64 rounded-2xl border border-(--color-border) overflow-hidden"
                style={{ background: 'var(--color-surface-2)', minHeight: '200px' }}
              >
                <div
                  className="px-3 pt-3 pb-2.5 border-b border-(--color-border)"
                  style={{ borderTopWidth: '3px', borderTopStyle: 'solid', borderTopColor: '#94a3b8' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-700" style={{ color: 'var(--color-text-primary)' }}>Other</span>
                    <span className="text-[10px] font-700 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#94a3b820', color: '#64748b' }}>
                      {otherLeads.length}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-2">
                  {otherLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      staffMembers={staffMembers}
                      onDragStart={() => { setDraggingId(lead.id); setDraggingStage(lead.stage) }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <ListView
          leads={leads}
          stages={stages}
          stageNames={stageNames}
          staffMembers={staffMembers}
        />
      )}
    </div>
  )
}
