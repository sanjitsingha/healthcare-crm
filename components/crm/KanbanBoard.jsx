'use client'
import { Plus, MoreHorizontal, AlertCircle } from 'lucide-react'
import { Badge, Avatar } from '@/components/ui'
import Link from 'next/link'
import clsx from 'clsx'

const STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']
const STAGE_COLORS = {
  New: 'border-t-blue-400',
  Contacted: 'border-t-purple-400',
  Interested: 'border-t-amber-400',
  'Follow-up': 'border-t-orange-400',
  Converted: 'border-t-emerald-400',
  Lost: 'border-t-red-400',
}

export default function KanbanBoard({ leads, onMoveLead }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {STAGES.map(stage => {
        const stageLeads = leads.filter(l => l.stage === stage)
        return (
          <div key={stage} className="flex-shrink-0 w-72">
            <div className={clsx('bg-[var(--color-surface-2)]/50 rounded-xl border-t-2 border border-[var(--color-border)] overflow-hidden', STAGE_COLORS[stage])}>
              <div className="px-3 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between bg-white/50">
                <span className="text-xs font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{stage}</span>
                <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-white border border-[var(--color-border)]" style={{ color: 'var(--color-text-primary)' }}>{stageLeads.length}</span>
              </div>

              <div className="p-2 space-y-2 min-h-[500px]">
                {stageLeads.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <div className="bg-white rounded-lg border border-[var(--color-border)] p-3 hover:shadow-md transition-all cursor-pointer group shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-600 line-clamp-2 pr-4" style={{ color: 'var(--color-text-primary)' }}>{lead.title}</p>
                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all">
                          <MoreHorizontal size={14} className="text-gray-400" />
                        </button>
                      </div>

                      {(lead.organizations?.name || lead.patients?.first_name) && (
                        <p className="text-[10px] mb-3 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                          {lead.organizations?.name || `${lead.patients?.first_name} ${lead.patients?.last_name || ''}`}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {lead.tags?.map(({ tags: t }) => (
                          <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded border" style={{ backgroundColor: `${t.color}10`, color: t.color, borderColor: `${t.color}30` }}>
                            {t.name}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-1.5">
                           <Badge className="text-[9px] px-1.5 py-0">{lead.priority}</Badge>
                           {lead.priority === 'Urgent' && <AlertCircle size={12} className="text-red-500" />}
                        </div>
                        {lead.value > 0 && (
                          <span className="text-[11px] font-700" style={{ color: 'var(--color-brand)' }}>
                            ₹{lead.value >= 100000 ? `${(lead.value/100000).toFixed(1)}L` : lead.value >= 1000 ? `${(lead.value/1000).toFixed(0)}K` : lead.value}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}

                <button className="w-full py-2 border border-dashed border-[var(--color-border)] rounded-lg text-[10px] font-500 text-[var(--color-text-muted)] hover:bg-white hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-all flex items-center justify-center gap-1">
                  <Plus size={12} /> Add Lead
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
