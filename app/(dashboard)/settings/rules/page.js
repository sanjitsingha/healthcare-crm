'use client'
import { useState, useEffect } from 'react'
import {
  Plus, Trash2, ChevronDown, X, Check,
  TrendingUp, UserRound, CalendarClock, CheckSquare, Stethoscope,
  Play, History, CheckCircle2, AlertTriangle, MinusCircle,
  ClipboardList, BellRing, Tag, UserCheck, StickyNote, BarChart2, GitMerge,
  Zap, SlidersHorizontal, Braces, UserPlus,
} from 'lucide-react'
import { Button, Spinner, Switch } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import {
  updateOrganization, getTags, getAutomationRuns,
  getLeads, getPatients, getAppointments, getTasks, getConsultations,
} from '@/lib/supabase/queries'
import {
  RULE_TARGETS, RULE_EVENTS, RULE_FIELDS, RULE_OPS, RULE_ACTIONS,
  PRIORITIES, SOURCES, STATUS_OPTIONS, FOLLOWUP_TYPES, SETTABLE_FIELDS,
  fieldOptions, OP_NEEDS_VALUE, FREEFORM_OPS,
  ruleActions, eventLabel, evaluateConditions,
} from '@/lib/rulesEngine'

// ── Constants ──────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2)
const DEFAULT_STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost']
const DUE_MODES    = [['in', 'in days from now'], ['before', 'days before'], ['after', 'days after']]
const DATE_FIELDS  = {
  lead: ['date_of_birth'], patient: ['date_of_birth'],
  appointment: ['scheduled_at'], consultation: ['consulted_at', 'follow_up_date'], task: ['due_date'],
}

const ACTION_ICON = {
  set_stage: GitMerge, set_priority: BarChart2, set_source: Tag, set_status: GitMerge,
  set_value: BarChart2, set_field: SlidersHorizontal, set_custom: Braces,
  add_tag: Tag, remove_tag: Tag, assign_to: UserCheck, convert_to_patient: UserPlus,
  add_note: StickyNote, create_task: ClipboardList, schedule_followup: CalendarClock, notify: BellRing,
}
// Color per action kind — used for left-border accent on action cards
const KIND_COLOR = {
  stage: '#7c3aed', status: '#7c3aed', priority: '#f59e0b', source: '#0891b2',
  tag: '#8b5cf6', staff: '#10b981', number: '#6366f1', text: '#64748b',
  task: '#2563eb', followup: '#0891b2', notify: '#ea580c',
  field: '#6366f1', custom: '#0891b2', convert: '#15803d',
}

const blankCond   = ()       => ({ id: uid(), field: '', op: '==', value: '' })
const blankAction = (target) => ({ id: uid(), type: RULE_ACTIONS[target]?.[0]?.value || 'set_stage', value: '' })
const blankRule   = (target) => ({
  id: uid(), name: '', enabled: true, target,
  event: RULE_EVENTS[target][0].value,
  condition_match: 'all', conditions: [],
  actions: [blankAction(target)],
})

const TARGET_META = {
  lead:         { label: 'Lead',         ruleLabel: 'Lead rule',         icon: TrendingUp,    color: '#1d4ed8', bg: '#dbeafe' },
  patient:      { label: 'Patient',      ruleLabel: 'Patient rule',      icon: UserRound,     color: '#15803d', bg: '#dcfce7' },
  appointment:  { label: 'Appointment',  ruleLabel: 'Appointment rule',  icon: CalendarClock, color: '#7c3aed', bg: '#ede9fe' },
  task:         { label: 'Task',         ruleLabel: 'Task rule',         icon: CheckSquare,   color: '#b45309', bg: '#fef3c7' },
  consultation: { label: 'Consultation', ruleLabel: 'Consultation rule', icon: Stethoscope,   color: '#0ea5e9', bg: '#e0f2fe' },
}
const RUN_STATUS = {
  success: { bg: '#dcfce7', color: '#15803d', icon: CheckCircle2,  label: 'Success' },
  partial: { bg: '#fef3c7', color: '#b45309', icon: AlertTriangle, label: 'Partial' },
  failed:  { bg: '#fee2e2', color: '#b91c1c', icon: AlertTriangle, label: 'Failed'  },
  skipped: { bg: '#f3f4f6', color: '#6b7280', icon: MinusCircle,   label: 'Skipped' },
}

// ── Shared field style ─────────────────────────────────────────────────
const fs = 'px-2.5 py-1.5 rounded-lg border border-(--color-border) text-sm outline-none transition-colors focus:border-(--color-brand)'
const fb = { background: 'var(--color-surface)', color: 'var(--color-text-primary)' }

// ── Step (Zoho-style vertical stepper) ────────────────────────────────
function Step({ n, color, label, hint, children, last }) {
  return (
    <div className="flex gap-5">
      {/* Number circle + connector */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-800 select-none"
          style={{
            background: color, color: 'white',
            boxShadow: `0 0 0 3px white, 0 0 0 6px ${color}35, 0 2px 8px ${color}50`,
          }}>
          {n}
        </div>
        {!last && (
          <div className="w-px flex-1 mt-2.5"
            style={{ background: 'linear-gradient(to bottom, #cbd5e1 0%, transparent 100%)', minHeight: 36 }} />
        )}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 pb-10">
        <div className="mb-3.5">
          <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
          {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Action fields (below the action card header) ───────────────────────
function ActionFields({ action, target, stages, tags, staff, onChange }) {
  const def  = (RULE_ACTIONS[target] || []).find(a => a.value === action.type)
  const kind = def?.kind
  if (!kind) return null

  const p = patch => onChange({ ...action, ...patch })
  const dateOpts = DATE_FIELDS[target] || []

  const row = (label, children) => (
    <div className="flex items-start gap-3 py-2 border-b border-(--color-border) last:border-0">
      <span className="text-xs font-600 w-24 shrink-0 mt-2" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )

  if (kind === 'stage')    return row('Stage',    <select value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb}><option value=''>Select…</option>{stages.map(s=><option key={s} value={s}>{s}</option>)}</select>)
  if (kind === 'status')   return row('Status',   <select value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb}><option value=''>Select…</option>{(STATUS_OPTIONS[target]||[]).map(s=><option key={s} value={s}>{s}</option>)}</select>)
  if (kind === 'priority') return row('Priority', <select value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb}><option value=''>Select…</option>{PRIORITIES.map(s=><option key={s} value={s}>{s}</option>)}</select>)
  if (kind === 'source')   return row('Source',   <select value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb}><option value=''>Select…</option>{SOURCES.map(s=><option key={s} value={s}>{s}</option>)}</select>)
  if (kind === 'tag')      return row('Tag',      <select value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb}><option value=''>Select…</option>{(tags||[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>)
  if (kind === 'staff')    return row('Assign to',<select value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb}><option value=''>Select…</option>{(staff||[]).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>)
  if (kind === 'number')   return row('Value',    <input type='number' value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-36`} style={fb} placeholder='0'/>)
  if (kind === 'text')     return row('Text',     <input value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb} placeholder='Enter text…'/>)

  if (kind === 'field') {
    const opts = fieldOptions(target, action.field, { stages })
    return (
      <>
        {row('Field', (
          <select value={action.field||''} onChange={e=>p({field:e.target.value, value:''})} className={`${fs} w-full`} style={fb}>
            <option value=''>Select field…</option>
            {(SETTABLE_FIELDS[target]||[]).map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        ))}
        {row('Value', opts
          ? <select value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb}><option value=''>Select…</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
          : <input value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb} placeholder={action.field?'New value…':'Pick a field first'}/>
        )}
      </>
    )
  }

  if (kind === 'custom') return (
    <>
      {row('Field name', <input value={action.field||''} onChange={e=>p({field:e.target.value})} className={`${fs} w-full font-mono text-xs`} style={fb} placeholder='custom_field_api_name'/>)}
      {row('Value',      <input value={action.value||''} onChange={e=>p({value:e.target.value})} className={`${fs} w-full`} style={fb} placeholder='New value…'/>)}
    </>
  )

  if (kind === 'convert') return (
    <p className="py-2.5 text-xs leading-relaxed" style={{ color:'var(--color-text-muted)' }}>
      Creates a <b>patient</b> record from this lead — copying name, contact &amp; demographics — and marks the lead
      as <b style={{color:'var(--color-text-secondary)'}}>Converted</b>. Skipped if the lead is already converted.
    </p>
  )

  if (kind === 'task') return (
    <>
      {row('Title',    <input value={action.title||''} onChange={e=>p({title:e.target.value})} className={`${fs} w-full`} style={fb} placeholder='Task title…'/>)}
      {row('Priority', <select value={action.priority||'Medium'} onChange={e=>p({priority:e.target.value})} className={`${fs}`} style={fb}>{PRIORITIES.map(x=><option key={x} value={x}>{x}</option>)}</select>)}
      {row('Due date', (
        <div className="flex items-center gap-2 flex-wrap">
          <input type='number' min={0} value={action.dueDays??''} onChange={e=>p({dueDays:e.target.value})} placeholder='N' className={`${fs} w-16`} style={fb}/>
          <select value={action.dueMode||'in'} onChange={e=>p({dueMode:e.target.value})} className={fs} style={fb}>
            {DUE_MODES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
          {(action.dueMode==='before'||action.dueMode==='after') && dateOpts.length>0 && (
            <select value={action.dueField||dateOpts[0]} onChange={e=>p({dueField:e.target.value})} className={fs} style={fb}>
              {dateOpts.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          )}
        </div>
      ))}
    </>
  )

  if (kind === 'followup') return (
    <>
      {row('Type', <select value={action.fuType||'Call'} onChange={e=>p({fuType:e.target.value})} className={fs} style={fb}>{FOLLOWUP_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>)}
      {row('In days', <div className="flex items-center gap-2"><input type='number' min={0} value={action.inDays??''} onChange={e=>p({inDays:e.target.value})} placeholder='0' className={`${fs} w-20`} style={fb}/><span className="text-sm" style={{color:'var(--color-text-muted)'}}>days from now</span></div>)}
    </>
  )

  if (kind === 'notify') return (
    <>
      {row('Title',   <input value={action.title||''} onChange={e=>p({title:e.target.value})} className={`${fs} w-full`} style={fb} placeholder='Notification title'/>)}
      {row('Message', <input value={action.message||''} onChange={e=>p({message:e.target.value})} className={`${fs} w-full`} style={fb} placeholder='Message body'/>)}
    </>
  )

  return null
}

// ── Helpers ────────────────────────────────────────────────────────────
function sampleLabel(target, e) {
  if (!e) return 'record'
  if (target === 'lead')         return [e.first_name, e.last_name].filter(Boolean).join(' ') || e.phone || 'lead'
  if (target === 'patient')      return [e.first_name, e.last_name].filter(Boolean).join(' ') || e.phone || 'patient'
  if (target === 'appointment')  return `appt ${e.scheduled_at ? new Date(e.scheduled_at).toLocaleDateString() : ''}`.trim()
  if (target === 'task')         return e.title || 'task'
  return e.chief_complaint || 'record'
}
async function fetchSample(target, orgId) {
  const o = { orgId }
  if (target === 'lead')         return (await getLeads(o))?.[0]        || null
  if (target === 'patient')      return (await getPatients(o))?.[0]     || null
  if (target === 'appointment')  return (await getAppointments(o))?.[0] || null
  if (target === 'task')         return (await getTasks(o))?.[0]        || null
  if (target === 'consultation') return (await getConsultations(o))?.[0]|| null
  return null
}

// ── Page ───────────────────────────────────────────────────────────────
export default function RulesPage() {
  const { org, orgId } = useOrg()
  const [rules,      setRules]      = useState([])
  const [tags,       setTags]       = useState([])
  const [runs,       setRuns]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [dirty,      setDirty]      = useState(false)
  const [addOpen,    setAddOpen]    = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showRuns,   setShowRuns]   = useState(false)

  const stages    = (org?.settings?.lead_stages || DEFAULT_STAGES).map(s => typeof s === 'string' ? s : s.name)
  const staffList = org?.settings?.staff_members || []

  useEffect(() => {
    if (!orgId) return
    const existing = org?.settings?.rules
    if (Array.isArray(existing)) {
      const m = existing.map(r => Array.isArray(r.actions) ? r : { ...r, actions: r.action ? [r.action] : [], action: undefined })
      setRules(m); setSelectedId(id => id || m[0]?.id || null)
    } else if (Array.isArray(org?.settings?.stage_rules)) {
      const m = org.settings.stage_rules.map(r => ({ id: r.id || uid(), name: 'Imported rule', enabled: true, target: 'lead', event: r.event, condition_match: 'all', conditions: [], actions: [{ type: 'set_stage', value: r.stage }] }))
      setRules(m); setSelectedId(id => id || m[0]?.id || null)
    }
    getTags(orgId).then(t => setTags(t||[])).catch(()=>setTags([])).finally(()=>setLoading(false))
    getAutomationRuns({ orgId, limit: 200 }).then(r => setRuns(r||[])).catch(()=>setRuns([]))
  }, [orgId, org])

  const selected     = rules.find(r => r.id === selectedId) || null
  const selectedRuns = runs.filter(x => x.rule_id === selectedId)
  const tagsFor = target => (tags||[]).filter(t => target==='lead' ? t.page==='leads' : t.page==='patients'||!t.page)

  const patch      = p => { setRules(prev => prev.map(r => r.id===selectedId ? {...r,...p} : r)); setDirty(true) }
  const addCond    = ()    => patch({ conditions: [...(selected.conditions||[]), blankCond()] })
  const patchCond  = (i,u) => { const c=[...(selected.conditions||[])]; c[i]=u; patch({conditions:c}) }
  const removeCond = i     => patch({ conditions: (selected.conditions||[]).filter((_,idx)=>idx!==i) })
  const addAct     = ()    => patch({ actions: [...(selected.actions||[]), blankAction(selected.target)] })
  const patchAct   = (i,u) => { const a=[...(selected.actions||[])]; a[i]=u; patch({actions:a}) }
  const removeAct  = i     => patch({ actions: (selected.actions||[]).filter((_,idx)=>idx!==i) })

  const addRule = target => {
    const r = blankRule(target)
    setRules(p=>[...p,r]); setSelectedId(r.id); setDirty(true); setTestResult(null)
  }
  const removeRule = async id => {
    if (!await showConfirm({ title: 'Delete this rule?', confirmLabel: 'Delete' })) return
    setRules(p => { const n=p.filter(r=>r.id!==id); if(id===selectedId) setSelectedId(n[0]?.id||null); return n })
    setDirty(true)
  }
  const handleSave = async () => {
    setSaving(true)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings||{}), rules } })
      setDirty(false)
    } catch(err) { toast({ type:'error', title:'Error', message:err.message }) }
    finally { setSaving(false) }
  }
  const runTest = async () => {
    if (!selected) return
    setTesting(true); setTestResult(null)
    try {
      const sample = await fetchSample(selected.target, orgId)
      if (!sample) { setTestResult({ error:`No ${selected.target} records found to test against.` }); return }
      const matched = evaluateConditions(sample, selected, null)
      setTestResult({ sample, matched, actions: matched ? ruleActions(selected) : [] })
    } catch(e) { setTestResult({ error: e.message }) }
    finally { setTesting(false) }
  }

  return (
    <div className="flex -m-6 -mb-16 h-screen" style={{ background:'var(--color-bg)' }}>

      {/* ── Left rail ─────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-(--color-border) h-full flex flex-col" style={{ background:'var(--color-surface)' }}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-(--color-border) flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'var(--color-brand)', color:'white' }}>
              <Zap size={14}/>
            </div>
            <div>
              <p className="text-sm font-700 leading-tight" style={{ color:'var(--color-text-primary)' }}>Workflow Rules</p>
              <p className="text-[11px]" style={{ color:'var(--color-text-muted)' }}>{rules.length} rule{rules.length!==1?'s':''}</p>
            </div>
          </div>
          <div className="relative">
            {addOpen && <div className="fixed inset-0 z-10" onClick={()=>setAddOpen(false)}/>}
            <button type="button" className="relative z-20 flex items-center gap-1 text-xs font-700 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-(--color-surface-2)"
              style={{ color:'var(--color-brand)', border:'1px solid var(--color-brand)20', background:'var(--color-brand-50)' }}
              onClick={()=>setAddOpen(o=>!o)}>
              <Plus size={13}/> New
            </button>
            {addOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-48 rounded-xl overflow-hidden z-20"
                style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', boxShadow:'0 12px 32px rgba(0,0,0,0.14)' }}>
                <div className="px-3 py-2 border-b border-(--color-border)">
                  <p className="text-[10px] font-700 uppercase tracking-wide" style={{ color:'var(--color-text-muted)' }}>Choose module</p>
                </div>
                {RULE_TARGETS.map(({value}) => {
                  const meta=TARGET_META[value]; const Icon=meta.icon
                  return (
                    <button key={value} type="button" onClick={()=>{addRule(value);setAddOpen(false)}}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-(--color-surface-2) transition-colors">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background:meta.bg }}>
                        <Icon size={12} style={{color:meta.color}}/>
                      </div>
                      <span className="font-500" style={{color:'var(--color-text-primary)'}}>{meta.ruleLabel}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rules list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size={20}/></div>
          ) : rules.length===0 ? (
            <div className="px-4 py-10 text-center">
              <Zap size={24} className="mx-auto mb-2 opacity-20"/>
              <p className="text-xs font-500" style={{color:'var(--color-text-muted)'}}>No rules yet</p>
              <p className="text-[11px] mt-0.5" style={{color:'var(--color-text-muted)'}}>Click <b>New</b> to create one</p>
            </div>
          ) : rules.map(r => {
            const meta=TARGET_META[r.target]||TARGET_META.lead
            const Icon=meta.icon
            const active=r.id===selectedId
            return (
              <button key={r.id} type="button"
                onClick={()=>{setSelectedId(r.id);setTestResult(null)}}
                className="w-full text-left px-4 py-3 transition-all relative"
                style={active ? {
                  borderLeft:'3px solid var(--color-brand)',
                  background:'var(--color-brand-50)',
                  paddingLeft:'calc(1rem - 3px)',
                } : {
                  borderLeft:'3px solid transparent',
                }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background:active?meta.bg+'cc':meta.bg }}>
                    <Icon size={12} style={{color:meta.color}}/>
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-600 truncate" style={{ color:'var(--color-text-primary)' }}>{r.name||'Untitled rule'}</span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:r.enabled?'#22c55e':'#cbd5e1' }}/>
                </div>
                <p className="text-[11px] mt-0.5 truncate pl-8" style={{ color:'var(--color-text-muted)' }}>
                  {eventLabel(r.target, r.event)}
                </p>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Spinner size={28}/></div>
        ) : !selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-30">
            <Zap size={40} style={{color:'var(--color-text-muted)'}}/>
            <p className="text-sm" style={{color:'var(--color-text-muted)'}}>Select a rule or create a new one</p>
          </div>
        ) : (
          <>
            {/* ── Sticky top bar ── */}
            <div className="sticky top-0 z-20 flex items-center gap-3 px-8 py-3 border-b border-(--color-border)"
              style={{ background:'var(--color-surface)', backdropFilter:'blur(8px)' }}>
              <input
                value={selected.name}
                onChange={e=>patch({name:e.target.value})}
                placeholder="Rule name…"
                className="flex-1 min-w-0 text-base font-700 bg-transparent outline-none"
                style={{ color:'var(--color-text-primary)' }}
              />
              {/* status pill */}
              <button type="button" onClick={()=>patch({enabled:!selected.enabled})}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-700 transition-all shrink-0"
                style={selected.enabled
                  ? { background:'#dcfce7', color:'#15803d' }
                  : { background:'var(--color-surface-2)', color:'var(--color-text-muted)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background:selected.enabled?'#22c55e':'#94a3b8' }}/>
                {selected.enabled ? 'Active' : 'Inactive'}
              </button>
              <button type="button" onClick={()=>removeRule(selected.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
                <Trash2 size={14}/>
              </button>
              {/* Save button */}
              <button type="button" onClick={handleSave} disabled={saving||!dirty}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-700 transition-all shrink-0 disabled:opacity-50"
                style={dirty
                  ? { background:'var(--color-brand)', color:'white' }
                  : { background:'var(--color-surface-2)', color:'var(--color-text-muted)' }}>
                {saving ? <Spinner size={13}/> : dirty ? null : <Check size={13}/>}
                {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
              </button>
            </div>

            {/* ── Stepper body ── */}
            <div className="flex-1 px-8 py-8 max-w-2xl w-full">

              {/* STEP 1 — WHEN */}
              <Step n="1" color="#f59e0b" label="When should this rule trigger?"
                hint="Choose the module and the event that starts this rule.">
                <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--color-border)', background:'var(--color-surface)' }}>
                  {/* Module row */}
                  <div className="flex items-center gap-4 px-4 py-3 border-b border-(--color-border)" style={{ background:'var(--color-surface-2)' }}>
                    <span className="text-xs font-600 w-16 shrink-0" style={{color:'var(--color-text-muted)'}}>Module</span>
                    {(() => { const meta=TARGET_META[selected.target]||TARGET_META.lead; const Icon=meta.icon; return (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-700" style={{ background:meta.bg, color:meta.color }}>
                        <Icon size={12}/>{meta.label}
                      </div>
                    )})()}
                    <span className="text-[11px] ml-auto" style={{color:'var(--color-text-muted)'}}>Set when rule was created</span>
                  </div>
                  {/* Event row */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    <span className="text-xs font-600 w-16 shrink-0" style={{color:'var(--color-text-muted)'}}>Event</span>
                    <select value={selected.event} onChange={e=>patch({event:e.target.value})}
                      className={`${fs} flex-1 font-500`} style={fb}>
                      {(RULE_EVENTS[selected.target]||[]).map(ev=>(
                        <option key={ev.value} value={ev.value}>{ev.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Field-update trigger config (Zoho-style: any field / specific field) */}
                  {(selected.event === 'field_updated' || selected.event === 'field_entered') && (
                    <>
                      <div className="flex items-center gap-4 px-4 py-3 border-t border-(--color-border)">
                        <span className="text-xs font-600 w-16 shrink-0" style={{color:'var(--color-text-muted)'}}>Fields</span>
                        <select value={selected.trigger_field_mode||'any'} onChange={e=>patch({trigger_field_mode:e.target.value})}
                          className={`${fs} font-500`} style={fb}>
                          <option value="any">Any field</option>
                          <option value="specific">Specific field(s)</option>
                        </select>
                        <span className="text-[11px]" style={{color:'var(--color-text-muted)'}}>
                          {selected.event==='field_entered'
                            ? 'runs when the field goes from empty to filled'
                            : 'runs when the field value changes'}
                        </span>
                      </div>
                      {(selected.trigger_field_mode==='specific') && (
                        <div className="flex items-start gap-4 px-4 py-3 border-t border-(--color-border)">
                          <span className="text-xs font-600 w-16 shrink-0 mt-1.5" style={{color:'var(--color-text-muted)'}}>Watch</span>
                          <div className="flex-1 flex flex-wrap gap-1.5">
                            {(RULE_FIELDS[selected.target]||[]).map(f => {
                              const on = (selected.trigger_fields||[]).includes(f)
                              return (
                                <button key={f} type="button"
                                  onClick={()=>{ const cur=selected.trigger_fields||[]; patch({ trigger_fields: on?cur.filter(x=>x!==f):[...cur,f] }) }}
                                  className="px-2.5 py-1 rounded-full text-xs font-600 border transition-colors"
                                  style={on
                                    ? { background:'#f59e0b', borderColor:'#f59e0b', color:'white' }
                                    : { background:'var(--color-surface)', borderColor:'var(--color-border)', color:'var(--color-text-secondary)' }}>
                                  {f}
                                </button>
                              )
                            })}
                            {!(selected.trigger_fields||[]).length && (
                              <span className="text-[11px] mt-1.5" style={{color:'var(--color-text-muted)'}}>Select one or more fields to watch.</span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Step>

              {/* STEP 2 — CONDITIONS */}
              <Step n="2" color="#7c3aed" label="Filter by conditions"
                hint="Leave empty to run on every event, or add conditions to narrow the scope.">
                <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--color-border)', background:'var(--color-surface)' }}>
                  {/* Match toggle */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-(--color-border)" style={{ background:'var(--color-surface-2)' }}>
                    <span className="text-xs font-500" style={{color:'var(--color-text-muted)'}}>Run when</span>
                    <select value={selected.condition_match||'all'} onChange={e=>patch({condition_match:e.target.value})}
                      className="px-2 py-1 rounded-lg border border-(--color-border) text-xs font-700 outline-none" style={fb}>
                      <option value="all">ALL</option>
                      <option value="any">ANY</option>
                    </select>
                    <span className="text-xs font-500" style={{color:'var(--color-text-muted)'}}>of the following conditions match</span>
                  </div>

                  {/* Conditions table */}
                  {(selected.conditions||[]).length > 0 ? (
                    <table className="w-full text-sm" style={{ tableLayout:'fixed' }}>
                      <colgroup>
                        <col style={{width:'32%'}}/><col style={{width:'26%'}}/><col style={{width:'35%'}}/><col style={{width:'7%'}}/>
                      </colgroup>
                      <thead>
                        <tr style={{ background:'var(--color-surface-2)', borderBottom:'1px solid var(--color-border)' }}>
                          {['Field','Operator','Value',''].map(h=>(
                            <th key={h} className="text-left px-3 py-2 text-[11px] font-700 uppercase tracking-wide" style={{color:'var(--color-text-muted)'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.conditions||[]).map((cond,i) => {
                          const needsVal = OP_NEEDS_VALUE[cond.op] !== false
                          const opts     = needsVal && !FREEFORM_OPS.has(cond.op) ? fieldOptions(selected.target, cond.field, {stages}) : null
                          return (
                            <tr key={cond.id||i} className="group border-b border-(--color-border) last:border-0 hover:bg-(--color-brand-50) transition-colors">
                              <td className="px-3 py-2">
                                <select value={cond.field} onChange={e=>patchCond(i,{...cond,field:e.target.value,value:''})}
                                  className={`${fs} w-full`} style={fb}>
                                  <option value=''>Select field…</option>
                                  {(RULE_FIELDS[selected.target]||[]).map(f=><option key={f} value={f}>{f}</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-2">
                                <select value={cond.op} onChange={e=>patchCond(i,{...cond,op:e.target.value})}
                                  className={`${fs} w-full`} style={fb}>
                                  {RULE_OPS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-2">
                                {needsVal ? (
                                  opts ? (
                                    <select value={cond.value} onChange={e=>patchCond(i,{...cond,value:e.target.value})}
                                      className={`${fs} w-full`} style={fb}>
                                      <option value=''>Select…</option>
                                      {opts.map(o=><option key={o} value={o}>{o}</option>)}
                                    </select>
                                  ) : (
                                    <input value={cond.value} onChange={e=>patchCond(i,{...cond,value:e.target.value})}
                                      placeholder={cond.op==='between'?'min,max':cond.op==='in'?'a, b':'value'}
                                      className={`${fs} w-full`} style={fb}/>
                                  )
                                ) : (
                                  <span className="text-xs px-2" style={{color:'var(--color-text-muted)'}}>—</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button type="button" onClick={()=>removeCond(i)}
                                  className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                  <X size={13}/>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background:'#ede9fe' }}>
                        <CheckSquare size={15} style={{color:'#7c3aed'}}/>
                      </div>
                      <div>
                        <p className="text-sm font-500" style={{color:'var(--color-text-primary)'}}>No conditions added</p>
                        <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>This rule will run on every <em>{eventLabel(selected.target, selected.event)}</em> event.</p>
                      </div>
                    </div>
                  )}

                  {/* Add row footer */}
                  <div className="px-4 py-2.5 border-t border-(--color-border)" style={{ background:'var(--color-surface-2)' }}>
                    <button type="button" onClick={addCond}
                      className="inline-flex items-center gap-1.5 text-xs font-700 transition-colors hover:opacity-80"
                      style={{color:'var(--color-brand)'}}>
                      <Plus size={13}/> Add condition
                    </button>
                  </div>
                </div>
              </Step>

              {/* STEP 3 — ACTIONS */}
              <Step n="3" color="#2563eb" label="Perform these actions" hint="Actions run in order after conditions are met." last>
                <div className="space-y-2.5">
                  {(selected.actions||[]).length === 0 && (
                    <p className="text-sm px-1" style={{color:'var(--color-text-muted)'}}>No actions added yet.</p>
                  )}

                  {(selected.actions||[]).map((action, i) => {
                    const def  = (RULE_ACTIONS[selected.target]||[]).find(a=>a.value===action.type)
                    const kind = def?.kind || 'text'
                    const kColor = KIND_COLOR[kind] || '#64748b'
                    const Icon = ACTION_ICON[action.type] || ClipboardList
                    return (
                      <div key={action.id||i} className="rounded-xl overflow-hidden"
                        style={{ border:'1px solid var(--color-border)', borderLeft:`3px solid ${kColor}`, background:'var(--color-surface)' }}>
                        {/* Card header */}
                        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-(--color-border)" style={{ background:'var(--color-surface-2)' }}>
                          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{ background: kColor + '18' }}>
                            <Icon size={13} style={{color:kColor}}/>
                          </div>
                          <select value={action.type}
                            onChange={e=>patchAct(i,{id:action.id,type:e.target.value,value:''})}
                            className="flex-1 bg-transparent border-none outline-none text-sm font-700 cursor-pointer"
                            style={{color:'var(--color-text-primary)'}}>
                            {(RULE_ACTIONS[selected.target]||[]).map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                          <span className="text-[10px] font-600 px-2 py-0.5 rounded-full shrink-0" style={{ background:kColor+'15', color:kColor }}>
                            {String(i+1).padStart(2,'0')}
                          </span>
                          <button type="button" onClick={()=>removeAct(i)}
                            className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-1">
                            <X size={13}/>
                          </button>
                        </div>
                        {/* Card fields */}
                        <div className="px-4 py-1">
                          <ActionFields action={action} target={selected.target} stages={stages}
                            tags={tagsFor(selected.target)} staff={staffList}
                            onChange={u=>patchAct(i,u)}/>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add action */}
                  <button type="button" onClick={addAct}
                    className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed transition-all"
                    style={{ borderColor:'var(--color-border)', color:'var(--color-text-muted)' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--color-brand)';e.currentTarget.style.background='var(--color-brand-50)';e.currentTarget.style.color='var(--color-brand)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--color-border)';e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--color-text-muted)'}}>
                    <Plus size={15}/>
                    <span className="text-sm font-600">Add action</span>
                  </button>
                </div>
              </Step>

              {/* ── Test & History ── */}
              <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--color-border)', background:'var(--color-surface)' }}>
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-(--color-border)" style={{ background:'var(--color-surface-2)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background:'#dcfce7' }}>
                      <Play size={12} style={{color:'#16a34a'}}/>
                    </div>
                    <p className="text-sm font-700" style={{color:'var(--color-text-primary)'}}>Test &amp; History</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={runTest} disabled={testing}
                      className="text-xs font-700 px-3 py-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      style={{color:'var(--color-brand)'}}>
                      <Play size={11}/>{testing?'Testing…':'Test on latest record'}
                    </button>
                    {selectedRuns.length>0 && (
                      <button type="button" onClick={()=>setShowRuns(s=>!s)}
                        className="text-xs font-700 px-3 py-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) inline-flex items-center gap-1.5 transition-colors"
                        style={{color:'var(--color-text-muted)'}}>
                        <History size={11}/>{selectedRuns.length} run{selectedRuns.length!==1?'s':''}
                      </button>
                    )}
                  </div>
                </div>

                {testResult && (
                  <div className="px-4 py-3 text-xs border-b border-(--color-border)"
                    style={{ background: testResult.error ? '#fffbeb' : testResult.matched ? '#f0fdf4' : '#fff1f2' }}>
                    {testResult.error
                      ? <p style={{color:'#b45309'}}>{testResult.error}</p>
                      : <div className="space-y-0.5">
                          <p className="font-500" style={{color:'var(--color-text-secondary)'}}>
                            Tested on: <b>{sampleLabel(selected.target, testResult.sample)}</b>
                            {' · '}
                            {testResult.matched
                              ? <span style={{color:'#15803d',fontWeight:700}}>✓ Conditions matched</span>
                              : <span style={{color:'#b91c1c',fontWeight:700}}>✗ Conditions did not match</span>}
                          </p>
                          {testResult.matched && <p style={{color:'var(--color-text-muted)'}}>Would run: {testResult.actions.map(a=>a.type).join(', ')||'(no actions)'}</p>}
                          <p style={{color:'var(--color-text-muted)'}}>Dry run — no records were changed.</p>
                        </div>
                    }
                  </div>
                )}

                {showRuns && selectedRuns.length>0 && (
                  <div className="divide-y divide-(--color-border)">
                    {selectedRuns.slice(0,8).map(r => {
                      const st=RUN_STATUS[r.status]||RUN_STATUS.skipped; const StIcon=st.icon
                      return (
                        <div key={r.id} className="flex items-center gap-2.5 text-xs px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 font-700 px-2 py-0.5 rounded-full shrink-0" style={{background:st.bg,color:st.color}}>
                            <StIcon size={10}/>{st.label}
                          </span>
                          <span style={{color:'var(--color-text-muted)'}}>{eventLabel(r.target,r.event)}</span>
                          {r.error && <span className="truncate" style={{color:'#b91c1c'}} title={r.error}>· {r.error}</span>}
                          <span className="ml-auto shrink-0 font-mono text-[11px]" style={{color:'var(--color-text-muted)'}}>{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {!testResult && !showRuns && (
                  <div className="px-4 py-3">
                    <p className="text-xs" style={{color:'var(--color-text-muted)'}}>
                      Test evaluates conditions against your most recent {selected.target} record without making any changes.
                      Run history appears after the rule has executed at least once.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
