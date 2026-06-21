'use client'
import { useEffect, useState } from 'react'
import {
  MessageCircle, Plus, Trash2, Zap, Filter, Send, Info,
} from 'lucide-react'
import { Button, Card, Input, Spinner, Switch } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import {
  getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule,
} from '@/lib/supabase/queries'
import { RULE_FIELDS, RULE_OPS, fieldOptions, OP_NEEDS_VALUE, FREEFORM_OPS } from '@/lib/rulesEngine'

// Curated triggers that the live engine actually fires. Each knows its target
// so condition fields resolve correctly.
const TRIGGERS = [
  { value: 'lead_created',         label: 'Lead created',           target: 'lead' },
  { value: 'stage_changed',        label: 'Lead stage changed',     target: 'lead' },
  { value: 'source_changed',       label: 'Lead source changed',    target: 'lead' },
  { value: 'lead_assigned',        label: 'Lead assigned',          target: 'lead' },
  { value: 'converted_to_patient', label: 'Converted to patient',   target: 'lead' },
  { value: 'status_changed',       label: 'Patient status changed', target: 'patient' },
  { value: 'appointment_booked',   label: 'Appointment booked',     target: 'appointment' },
  { value: 'followup_missed',      label: 'Follow-up missed',       target: 'lead' },
  { value: 'followup_completed',   label: 'Follow-up completed',    target: 'lead' },
]
const triggerTarget = (ev) => TRIGGERS.find(t => t.value === ev)?.target || 'lead'
const triggerLabel = (ev) => TRIGGERS.find(t => t.value === ev)?.label || ev

const inputCls = 'px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none'
const inputStyle = { background: 'var(--color-surface)', color: 'var(--color-text-primary)' }

const blankForm = () => ({
  name: '', trigger_event: 'lead_created', match: 'all', items: [],
  template: '', language: 'en', to_field: '', params: [], is_active: true,
})

const toForm = (r) => ({
  id: r.id,
  name: r.name || '',
  trigger_event: r.trigger_event || 'lead_created',
  match: r.conditions?.match || 'all',
  items: r.conditions?.items || [],
  template: r.actions?.[0]?.template || '',
  language: r.actions?.[0]?.language || 'en',
  to_field: r.actions?.[0]?.to_field || '',
  params: r.actions?.[0]?.params || [],
  is_active: r.is_active ?? true,
})

export default function AutomationPage() {
  const { org, orgId } = useOrg()
  const stages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? s : s.name)
  const waReady = !!org?.settings?.whatsapp?.provider && org?.settings?.whatsapp?.enabled !== false

  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)   // currently-edited automation (null = none)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!orgId) return
    getAutomationRules(orgId)
      .then(r => setRules(r || []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false))
  }, [orgId])

  const target = form ? triggerTarget(form.trigger_event) : 'lead'
  const fields = RULE_FIELDS[target] || []
  const patch = (p) => setForm(f => ({ ...f, ...p }))

  // ── Conditions ──
  const addItem = () => patch({ items: [...form.items, { field: fields[0] || 'source', op: '==', value: '' }] })
  const setItem = (i, p) => patch({ items: form.items.map((c, idx) => idx === i ? { ...c, ...p } : c) })
  const delItem = (i) => patch({ items: form.items.filter((_, idx) => idx !== i) })

  // ── Template params ──
  const addParam = () => patch({ params: [...form.params, { source: 'field', value: fields[0] || 'first_name' }] })
  const setParam = (i, p) => patch({ params: form.params.map((x, idx) => idx === i ? { ...x, ...p } : x) })
  const delParam = (i) => patch({ params: form.params.filter((_, idx) => idx !== i) })

  const startNew = () => setForm(blankForm())
  const selectRule = (r) => setForm(toForm(r))

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ type: 'error', title: 'Name your automation' }); return }
    if (!form.template.trim()) { toast({ type: 'error', title: 'Enter the WhatsApp template name' }); return }
    setSaving(true)
    try {
      const payload = {
        organization_id: orgId,
        name: form.name.trim(),
        trigger_event: form.trigger_event,
        conditions: { match: form.match, items: form.items.filter(c => c.field) },
        actions: [{
          type: 'send_whatsapp',
          template: form.template.trim(),
          language: form.language || 'en',
          to_field: form.to_field || '',
          params: form.params,
        }],
        is_active: form.is_active,
      }
      if (form.id) {
        const u = await updateAutomationRule(form.id, payload)
        setRules(rs => rs.map(r => r.id === form.id ? u : r))
        setForm(toForm(u))
      } else {
        const c = await createAutomationRule(payload)
        setRules(rs => [...rs, c])
        setForm(toForm(c))
      }
      toast({ type: 'success', title: 'Automation saved' })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSaving(false) }
  }

  const toggleActive = async (r) => {
    try {
      const u = await updateAutomationRule(r.id, { is_active: !r.is_active })
      setRules(rs => rs.map(x => x.id === r.id ? u : x))
      if (form?.id === r.id) setForm(f => ({ ...f, is_active: u.is_active }))
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const handleDelete = async (r) => {
    const ok = await showConfirm({ title: 'Delete this automation?', confirmLabel: 'Delete' })
    if (!ok) return
    try {
      await deleteAutomationRule(r.id)
      setRules(rs => rs.filter(x => x.id !== r.id))
      if (form?.id === r.id) setForm(null)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  return (
    <div className="flex -m-6 -mb-16 h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Left rail */}
      <aside className="w-64 shrink-0 border-r border-(--color-border) h-full flex flex-col" style={{ background: 'var(--color-surface)' }}>
        <div className="p-4 border-b border-(--color-border) flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-700 tracking-tight flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
              <MessageCircle size={16} style={{ color: '#15803d' }} /> WhatsApp
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Automations</p>
          </div>
          <Button size="sm" variant="secondary" onClick={startNew}><Plus size={14} /> New</Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner size={22} /></div>
          ) : rules.length === 0 ? (
            <p className="text-xs text-center px-3 py-8" style={{ color: 'var(--color-text-muted)' }}>No automations yet. Click <b>New</b>.</p>
          ) : rules.map(r => {
            const active = form?.id === r.id
            return (
              <button key={r.id} type="button" onClick={() => selectRule(r)}
                className="w-full text-left rounded-lg border p-2.5 transition-all"
                style={active ? { borderColor: 'var(--color-brand)', background: 'var(--color-brand-50)' } : { borderColor: 'transparent', background: 'transparent' }}>
                <div className="flex items-center gap-2">
                  <MessageCircle size={13} style={{ color: '#15803d', flexShrink: 0 }} />
                  <span className="flex-1 min-w-0 text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{r.name || 'Untitled'}</span>
                  <span className="w-2 h-2 rounded-full shrink-0" title={r.is_active ? 'Active' : 'Inactive'} style={{ background: r.is_active ? '#22c55e' : '#cbd5e1' }} />
                </div>
                <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{triggerLabel(r.trigger_event)}</p>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto p-6 pb-16">
        <div className="mb-4">
          <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>WhatsApp Automations</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            When an event happens, optionally check conditions, then send a WhatsApp template. Runs on the live engine.
          </p>
        </div>

        {/* Banners */}
        {!waReady && (
          <div className="flex gap-2.5 px-4 py-3 mb-4 rounded-xl border" style={{ background: '#fffbeb', borderColor: '#f59e0b55' }}>
            <Info size={15} className="shrink-0 mt-0.5" style={{ color: '#b45309' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#b45309' }}>
              WhatsApp isn’t connected yet. Set it up in <b>Settings → Integrations → WhatsApp</b> for these to actually send.
            </p>
          </div>
        )}
        <div className="flex gap-2.5 px-4 py-2.5 mb-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Zap size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Tag, stage, task, assignment & notification automations now live in <b>Settings → Workflow Rules</b>. This page is just for WhatsApp messages.
          </p>
        </div>

        {!form ? (
          <div className="py-20 text-center border border-dashed rounded-2xl border-(--color-border)">
            <MessageCircle size={30} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>Select an automation, or create a new one.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {/* Header row */}
            <Card className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Input placeholder="Automation name (e.g. Welcome new website leads)" value={form.name}
                  onChange={e => patch({ name: e.target.value })} className="flex-1 min-w-48" />
                <label className="flex items-center gap-2 text-xs font-600 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  <Switch checked={form.is_active} onChange={() => patch({ is_active: !form.is_active })} />
                  {form.is_active ? 'Active' : 'Inactive'}
                </label>
                {form.id && (
                  <button type="button" onClick={() => handleDelete(rules.find(r => r.id === form.id) || form)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"><Trash2 size={15} /></button>
                )}
              </div>
            </Card>

            {/* WHEN */}
            <Card className="p-4 space-y-2">
              <p className="text-[10px] font-700 uppercase tracking-wide flex items-center gap-1.5" style={{ color: '#f59e0b' }}><Zap size={12} /> When</p>
              <select value={form.trigger_event} onChange={e => patch({ trigger_event: e.target.value, items: [] })}
                className={`w-full ${inputCls}`} style={inputStyle}>
                {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Card>

            {/* IF */}
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-700 uppercase tracking-wide flex items-center gap-1.5" style={{ color: '#7c3aed' }}><Filter size={12} /> If</p>
                <div className="flex items-center gap-2">
                  {form.items.length > 1 && (
                    <select value={form.match} onChange={e => patch({ match: e.target.value })} className={`${inputCls} text-[11px] font-700`} style={inputStyle}>
                      <option value="all">Match ALL</option>
                      <option value="any">Match ANY</option>
                    </select>
                  )}
                  <button type="button" onClick={addItem} className="text-[11px] font-700 px-2.5 py-1 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2)" style={{ color: 'var(--color-brand)' }}><Plus size={12} className="inline mr-0.5" /> Condition</button>
                </div>
              </div>
              {form.items.length === 0 ? (
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No conditions — runs for every <b>{triggerLabel(form.trigger_event)}</b>.</p>
              ) : (
                <div className="space-y-2">
                  {form.items.map((c, i) => {
                    const opts = fieldOptions(target, c.field, { stages })
                    const showSelect = opts && opts.length && !FREEFORM_OPS.has(c.op)
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <select value={c.field} onChange={e => setItem(i, { field: e.target.value })} className={`${inputCls} max-w-40`} style={inputStyle}>
                          {fields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select value={c.op} onChange={e => setItem(i, { op: e.target.value })} className={inputCls} style={inputStyle}>
                          {RULE_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {!OP_NEEDS_VALUE[c.op] ? (
                          <span className="flex-1 text-[11px] italic" style={{ color: 'var(--color-text-muted)' }}>no value</span>
                        ) : showSelect ? (
                          <select value={c.value} onChange={e => setItem(i, { value: e.target.value })} className={`flex-1 ${inputCls}`} style={inputStyle}>
                            <option value="">Select…</option>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input value={c.value} onChange={e => setItem(i, { value: e.target.value })} placeholder="value" className={`flex-1 ${inputCls}`} style={inputStyle} />
                        )}
                        <button type="button" onClick={() => delItem(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* SEND WhatsApp */}
            <Card className="p-4 space-y-3">
              <p className="text-[10px] font-700 uppercase tracking-wide flex items-center gap-1.5" style={{ color: '#15803d' }}><Send size={12} /> Send WhatsApp</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Template name *</label>
                  <input value={form.template} onChange={e => patch({ template: e.target.value })} placeholder="e.g. welcome_lead" className={`w-full ${inputCls} font-mono`} style={inputStyle} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Language</label>
                  <input value={form.language} onChange={e => patch({ language: e.target.value })} placeholder="en" className={`w-full ${inputCls}`} style={inputStyle} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Send to</label>
                <select value={form.to_field} onChange={e => patch({ to_field: e.target.value })} className={`${inputCls}`} style={inputStyle}>
                  <option value="">Auto — record’s WhatsApp / phone</option>
                  <option value="phone">phone</option>
                </select>
              </div>

              {/* Template variables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Template variables — in order ({'{{1}}'}, {'{{2}}'}…)</label>
                  <button type="button" onClick={addParam} className="text-[11px] font-700 px-2.5 py-1 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2)" style={{ color: 'var(--color-brand)' }}><Plus size={12} className="inline mr-0.5" /> Variable</button>
                </div>
                {form.params.length === 0 ? (
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>No variables — sends the template as-is.</p>
                ) : (
                  <div className="space-y-2">
                    {form.params.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-700 w-8 text-center px-1 py-1 rounded" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>{`{{${i + 1}}}`}</span>
                        <select value={p.source} onChange={e => setParam(i, { source: e.target.value })} className={inputCls} style={inputStyle}>
                          <option value="field">Field</option>
                          <option value="static">Text</option>
                        </select>
                        {p.source === 'field' ? (
                          <select value={p.value} onChange={e => setParam(i, { value: e.target.value })} className={`flex-1 ${inputCls}`} style={inputStyle}>
                            {fields.map(f => <option key={f} value={f}>{f}</option>)}
                            <option value="first_name">first_name</option>
                          </select>
                        ) : (
                          <input value={p.value} onChange={e => setParam(i, { value: e.target.value })} placeholder="static text" className={`flex-1 ${inputCls}`} style={inputStyle} />
                        )}
                        <button type="button" onClick={() => delParam(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save automation'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
