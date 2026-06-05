'use client'
import { useState, useEffect } from 'react'
import { Workflow, Plus, Trash2, ChevronDown, Filter, Zap, ToggleLeft, ToggleRight, TrendingUp, UserRound } from 'lucide-react'
import { Button, Card, Input, Select, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization, getTags } from '@/lib/supabase/queries'
import { RULE_TARGETS, RULE_EVENTS, RULE_FIELDS, RULE_OPS, RULE_ACTIONS, FIELD_OPTIONS, eventLabel } from '@/lib/rulesEngine'

const uid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2))

const DEFAULT_LEAD_STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']

const blankRule = (target = 'lead') => ({
  id: uid(),
  name: '',
  enabled: true,
  target,
  event: RULE_EVENTS[target][0].value,
  conditions: [],
  action: { type: RULE_ACTIONS[target][0].value, value: '' },
})

function RuleCard({ rule, stages, tags, onChange, onRemove }) {
  const [open, setOpen] = useState(!rule.name)
  const events  = RULE_EVENTS[rule.target] || []
  const fields  = RULE_FIELDS[rule.target] || []
  const actions = RULE_ACTIONS[rule.target] || []

  const patch = (p) => onChange({ ...rule, ...p })
  const setAction = (p) => onChange({ ...rule, action: { ...rule.action, ...p } })

  const addCond    = () => onChange({ ...rule, conditions: [...(rule.conditions || []), { field: fields[0], op: '==', value: '' }] })
  const setCond    = (i, p) => onChange({ ...rule, conditions: rule.conditions.map((c, idx) => idx === i ? { ...c, ...p } : c) })
  const removeCond = (i) => onChange({ ...rule, conditions: rule.conditions.filter((_, idx) => idx !== i) })

  // when target changes, reset event + action to that target's options
  const changeTarget = (target) => onChange({
    ...rule, target,
    event: RULE_EVENTS[target][0].value,
    action: { type: RULE_ACTIONS[target][0].value, value: '' },
    conditions: [],
  })

  const actionValueOptions = () => {
    if (rule.action.type === 'set_stage')  return stages.map(s => ({ value: s, label: s }))
    if (rule.action.type === 'set_status') return ['Active', 'Inactive'].map(s => ({ value: s, label: s }))
    if (rule.action.type === 'add_tag')    return tags.filter(t => t.page === rule.target + 's' || (!t.page && rule.target === 'patient')).map(t => ({ value: t.id, label: t.name }))
    return []
  }

  return (
    <div className="rounded-2xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      {/* summary header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'var(--color-surface-2)' }}>
        <button type="button" onClick={() => patch({ enabled: !rule.enabled })} title={rule.enabled ? 'Enabled' : 'Disabled'}
          style={{ color: rule.enabled ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>
          {rule.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{rule.name || 'Untitled rule'}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
            <span className="capitalize">{rule.target}</span> · {eventLabel(rule.target, rule.event)}
            {rule.conditions?.length ? ` · ${rule.conditions.length} condition${rule.conditions.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <span className="text-[10px] font-700 px-2 py-0.5 rounded-full capitalize" style={rule.target === 'lead' ? { background: '#dbeafe', color: '#1d4ed8' } : { background: '#dcfce7', color: '#15803d' }}>{rule.target}</span>
        <button type="button" onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-(--color-surface)" style={{ color: 'var(--color-text-muted)' }}>
          <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rule name" placeholder="e.g. Tag hot Meta leads" value={rule.name} onChange={e => patch({ name: e.target.value })} />
            <Select label="Applies to" value={rule.target} onChange={e => changeTarget(e.target.value)} options={RULE_TARGETS} />
          </div>

          {/* WHEN */}
          <div className="rounded-xl border border-(--color-border) p-3" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-[10px] font-700 uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: '#f59e0b' }}><Zap size={12} /> When</p>
            <Select value={rule.event} onChange={e => patch({ event: e.target.value })} options={events.map(ev => ({ value: ev.value, label: ev.label }))} />
          </div>

          {/* IF (conditions) */}
          <div className="rounded-xl border border-(--color-border) p-3" style={{ background: 'var(--color-surface-2)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-700 uppercase tracking-wide flex items-center gap-1.5" style={{ color: '#7c3aed' }}><Filter size={12} /> If (all match)</p>
              <button type="button" onClick={addCond} className="text-[11px] font-600 flex items-center gap-1" style={{ color: 'var(--color-brand)' }}><Plus size={12} /> Add condition</button>
            </div>
            {(!rule.conditions || rule.conditions.length === 0) ? (
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No conditions — runs on every event.</p>
            ) : (
              <div className="space-y-2">
                {rule.conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select value={c.field} onChange={e => setCond(i, { field: e.target.value })}
                      className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      {fields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={c.op} onChange={e => setCond(i, { op: e.target.value })}
                      className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      {RULE_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {(() => {
                      const opts = c.field === 'stage' ? stages : FIELD_OPTIONS[c.field]
                      if (opts && c.op !== '>' && c.op !== '<' && c.op !== 'contains') {
                        return (
                          <select value={c.value} onChange={e => setCond(i, { value: e.target.value })}
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                            <option value="">Select…</option>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )
                      }
                      return (
                        <input value={c.value} onChange={e => setCond(i, { value: e.target.value })} placeholder="value"
                          type={c.field === 'value' ? 'number' : 'text'}
                          className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      )
                    })()}
                    <button type="button" onClick={() => removeCond(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* THEN (action) */}
          <div className="rounded-xl border border-(--color-border) p-3" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-[10px] font-700 uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: '#0ea5e9' }}><Workflow size={12} /> Then</p>
            <div className="flex items-center gap-2">
              <select value={rule.action.type} onChange={e => setAction({ type: e.target.value, value: '' })}
                className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <select value={rule.action.value} onChange={e => setAction({ value: e.target.value })}
                className="flex-1 px-2 py-1.5 text-xs rounded-lg border outline-none"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderColor: rule.action.value ? 'var(--color-border)' : '#f59e0b' }}>
                <option value="">Select…</option>
                {actionValueOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RulesPage() {
  const { org, orgId } = useOrg()
  const [rules, setRules] = useState([])
  const [tags, setTags]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [addOpen, setAddOpen] = useState(false)

  const stages = (org?.settings?.lead_stages || DEFAULT_LEAD_STAGES).map(s => typeof s === 'string' ? s : s.name)

  useEffect(() => {
    if (!orgId) return
    // Seed from new rules, else migrate legacy stage_rules
    const existing = org?.settings?.rules
    if (Array.isArray(existing)) {
      setRules(existing)
    } else if (Array.isArray(org?.settings?.stage_rules)) {
      setRules(org.settings.stage_rules.map(r => ({
        id: r.id || uid(), name: 'Imported rule', enabled: true, target: 'lead',
        event: r.event, conditions: [], action: { type: 'set_stage', value: r.stage },
      })))
    }
    getTags(orgId).then(t => setTags(t || [])).catch(() => setTags([])).finally(() => setLoading(false))
  }, [orgId, org])

  const [dirty, setDirty] = useState(false)

  const addRule    = (target) => { setRules(prev => [...prev, blankRule(target)]); setDirty(true) }
  const updateRule = (r) => { setRules(prev => prev.map(x => x.id === r.id ? r : x)); setDirty(true) }
  const removeRule = (id) => { if (confirm('Delete this rule?')) { setRules(prev => prev.filter(r => r.id !== id)); setDirty(true) } }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), rules } })
      setSavedAt(Date.now()); setDirty(false)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Workflow size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Automation Rules</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                When an event happens, optionally check conditions, then run an action — for leads and patients.
                {saving ? ' · Saving…' : dirty ? ' · Unsaved changes' : savedAt ? ' · Saved' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <div className="relative">
            {addOpen && <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />}
            <Button size="sm" variant="secondary" className="relative z-20" onClick={() => setAddOpen(o => !o)}>
              <Plus size={14} /> Add Rule
              <ChevronDown size={13} style={{ transform: addOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </Button>
            {addOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-44 rounded-xl border border-(--color-border) overflow-hidden z-20"
                style={{ background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <button type="button" onClick={() => { addRule('lead'); setAddOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-600 text-left transition-colors hover:bg-(--color-surface-2)">
                  <TrendingUp size={14} style={{ color: '#1d4ed8' }} /> <span style={{ color: 'var(--color-text-primary)' }}>Lead rule</span>
                </button>
                <button type="button" onClick={() => { addRule('patient'); setAddOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-600 text-left transition-colors hover:bg-(--color-surface-2)">
                  <UserRound size={14} style={{ color: '#15803d' }} /> <span style={{ color: 'var(--color-text-primary)' }}>Patient rule</span>
                </button>
              </div>
            )}
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : rules.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-2xl border-(--color-border)">
          <Workflow size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No rules yet.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Add a lead or patient rule to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleCard key={rule.id} rule={rule} stages={stages} tags={tags}
              onChange={updateRule} onRemove={() => removeRule(rule.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
