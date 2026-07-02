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
  tag: '#8b5cf6', staff: '#10b981', number: '#135BFB', text: '#64748b',
  task: '#2563eb', followup: '#0891b2', notify: '#ea580c',
  field: '#135BFB', custom: '#0891b2', convert: '#15803d',
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

// Internal columns hidden from the field pickers.
const FIELD_NOISE = new Set([
  'id', 'organization_id', 'created_at', 'updated_at', 'patient_code',
  'custom_data', 'search_vector', 'search_tsv', 'deleted_at',
])
const TARGET_PAGE = { lead: 'leads', patient: 'patients' }

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
  const [colsByTarget, setColsByTarget] = useState({})   // real DB columns per target

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

  // Lazily fetch the real DB columns for a target the first time a field-trigger
  // rule needs them (reads one sample row → its scalar column names).
  const isFieldTrig = selected && (selected.event === 'field_updated' || selected.event === 'field_entered')
  useEffect(() => {
    if (!orgId || !selected || !isFieldTrig) return
    const t = selected.target
    if (colsByTarget[t]) return
    let cancelled = false
    fetchSample(t, orgId).then(s => {
      if (cancelled) return
      const keys = s
        ? Object.keys(s).filter(k => !FIELD_NOISE.has(k) && (s[k] === null || typeof s[k] !== 'object'))
        : []
      setColsByTarget(c => ({ ...c, [t]: keys.length ? keys : (RULE_FIELDS[t] || []) }))
    }).catch(() => setColsByTarget(c => ({ ...c, [t]: RULE_FIELDS[t] || [] })))
    return () => { cancelled = true }
  }, [orgId, selected?.target, isFieldTrig, colsByTarget])

  // Custom module fields configured for this target (stored on org.settings.modules).
  const customFieldsFor = target => {
    const page = TARGET_PAGE[target]
    if (!page) return []
    return (org?.settings?.modules || [])
      .filter(m => m.page === page)
      .flatMap(m => (m.fields || []).map(f => ({ value: 'custom:' + f.id, label: `${f.label || f.id} (custom)` })))
  }
  // Full watch list = real DB columns (or fallback) + custom fields, de-duped.
  const watchOptionsFor = target => {
    const std = (colsByTarget[target] || RULE_FIELDS[target] || []).map(c => ({ value: c, label: c }))
    const seen = new Set()
    return [...std, ...customFieldsFor(target)].filter(o => (seen.has(o.value) ? false : seen.add(o.value)))
  }
  const fieldLabelFor = (target, value) => watchOptionsFor(target).find(o => o.value === value)?.label || value

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

  // ── section card wrapper ──────────────────────────────────────
  const SectionCard = ({ accent, icon: Icon, iconBg, title, hint, children, footer }) => (
    <div className="mb-6 rounded-2xl overflow-hidden"
      style={{ border:'1px solid var(--color-border)', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* card header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-(--color-border)"
        style={{ background:'var(--color-surface-2)', borderLeft:`4px solid ${accent}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background:iconBg }}>
          <Icon size={15} style={{color:accent}}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-700 leading-tight" style={{color:'var(--color-text-primary)'}}>{title}</p>
          {hint && <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{hint}</p>}
        </div>
      </div>
      {/* card body */}
      <div className="px-5 py-4" style={{ background:'var(--color-surface)' }}>{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-(--color-border)" style={{ background:'var(--color-surface-2)' }}>
          {footer}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex -m-6 -mb-16 h-screen" style={{ background:'var(--color-surface-2)' }}>

      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 border-r border-(--color-border) h-full flex flex-col"
        style={{ background:'var(--color-surface)' }}>

        {/* Sidebar header */}
        <div className="px-5 py-5 border-b border-(--color-border)">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:'var(--color-brand)', boxShadow:'0 2px 8px rgba(15,110,86,0.35)' }}>
                <Zap size={15} className="text-white"/>
              </div>
              <div>
                <p className="text-sm font-800 leading-tight" style={{color:'var(--color-text-primary)'}}>Workflow Rules</p>
                <p className="text-[11px]" style={{color:'var(--color-text-muted)'}}>{rules.length} rule{rules.length!==1?'s':''}</p>
              </div>
            </div>
          </div>

          {/* New rule button + dropdown */}
          <div className="relative">
            {addOpen && <div className="fixed inset-0 z-10" onClick={()=>setAddOpen(false)}/>}
            <button type="button" onClick={()=>setAddOpen(o=>!o)}
              className="btn btn-primary btn-md w-full">
              <Plus size={14}/> New Rule
            </button>
            {addOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-20"
                style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', boxShadow:'0 16px 40px rgba(0,0,0,0.16)' }}>
                <div className="px-4 py-2.5 border-b border-(--color-border)">
                  <p className="text-[10px] font-700 uppercase tracking-widest" style={{color:'var(--color-text-muted)'}}>Choose module</p>
                </div>
                {RULE_TARGETS.map(({value}) => {
                  const meta=TARGET_META[value]; const Icon=meta.icon
                  return (
                    <button key={value} type="button" onClick={()=>{addRule(value);setAddOpen(false)}}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-(--color-surface-2)">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{background:meta.bg}}>
                        <Icon size={13} style={{color:meta.color}}/>
                      </div>
                      <div>
                        <p className="font-600 text-sm leading-tight" style={{color:'var(--color-text-primary)'}}>{meta.label}</p>
                        <p className="text-[11px]" style={{color:'var(--color-text-muted)'}}>Rule for {meta.label.toLowerCase()} events</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rules list */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-3">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size={20}/></div>
          ) : rules.length===0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{background:'var(--color-surface-2)'}}>
                <Zap size={20} style={{color:'var(--color-text-muted)'}}/>
              </div>
              <p className="text-sm font-600" style={{color:'var(--color-text-primary)'}}>No rules yet</p>
              <p className="text-xs mt-1" style={{color:'var(--color-text-muted)'}}>Click <b>New Rule</b> above to get started</p>
            </div>
          ) : rules.map(r => {
            const meta=TARGET_META[r.target]||TARGET_META.lead; const Icon=meta.icon
            const active=r.id===selectedId
            return (
              <button key={r.id} type="button"
                onClick={()=>{setSelectedId(r.id);setTestResult(null)}}
                className="w-full text-left px-3 py-3 rounded-xl transition-all"
                style={active
                  ? { background:'var(--color-brand-50)', border:'1px solid var(--color-brand)', boxShadow:'0 1px 4px rgba(15,110,86,0.12)' }
                  : { background:'transparent', border:'1px solid transparent' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{background:meta.bg}}>
                    <Icon size={12} style={{color:meta.color}}/>
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-600 truncate" style={{color:'var(--color-text-primary)'}}>
                    {r.name||'Untitled rule'}
                  </span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{background:r.enabled?'#22c55e':'#d1d5db'}}/>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 pl-9">
                  <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-full" style={{background:meta.bg,color:meta.color}}>
                    {meta.label}
                  </span>
                  <p className="text-[11px] truncate" style={{color:'var(--color-text-muted)'}}>
                    {eventLabel(r.target, r.event)}
                  </p>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Right panel ───────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center"><Spinner size={28}/></div>
        ) : !selected ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:'var(--color-surface-2)'}}>
              <Zap size={28} style={{color:'var(--color-text-muted)',opacity:0.4}}/>
            </div>
            <div className="text-center">
              <p className="text-base font-600" style={{color:'var(--color-text-primary)'}}>Select a rule to edit</p>
              <p className="text-sm mt-1" style={{color:'var(--color-text-muted)'}}>Or create a new rule from the sidebar</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-8 py-8">

            {/* ── Top bar ── */}
            <div className="flex items-start gap-4 mb-8">
              {/* Rule name + meta */}
              <div className="flex-1 min-w-0">
                <input
                  value={selected.name}
                  onChange={e=>patch({name:e.target.value})}
                  placeholder="Rule name…"
                  className="w-full text-xl font-800 bg-transparent outline-none border-b-2 border-transparent transition-colors focus:border-(--color-brand) pb-1"
                  style={{color:'var(--color-text-primary)'}}
                />
                {(() => { const meta=TARGET_META[selected.target]||TARGET_META.lead; const Icon=meta.icon; return (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-700" style={{background:meta.bg,color:meta.color}}>
                      <Icon size={11}/>{meta.label}
                    </span>
                    <span className="text-xs" style={{color:'var(--color-text-muted)'}}>{eventLabel(selected.target, selected.event)}</span>
                  </div>
                )})()}
              </div>

              {/* Actions cluster */}
              <div className="flex items-center gap-2 shrink-0 pt-1">
                {/* Active toggle */}
                <button type="button" onClick={()=>patch({enabled:!selected.enabled})}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-700 transition-all border"
                  style={selected.enabled
                    ? { background:'#dcfce7', color:'#15803d', borderColor:'#86efac' }
                    : { background:'var(--color-surface-2)', color:'var(--color-text-muted)', borderColor:'var(--color-border)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{background:selected.enabled?'#22c55e':'#94a3b8'}}/>
                  {selected.enabled ? 'Active' : 'Inactive'}
                </button>
                <button type="button" onClick={()=>removeRule(selected.id)}
                  className="btn btn-danger btn-icon" title="Delete rule">
                  <Trash2 size={14}/>
                </button>
                <button type="button" onClick={handleSave} disabled={saving||!dirty}
                  className="btn btn-primary btn-md disabled:opacity-50">
                  {saving ? <Spinner size={13}/> : <Check size={13}/>}
                  {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </button>
              </div>
            </div>

            {/* ── STEP 1: WHEN ── */}
            <SectionCard accent="#f59e0b" icon={CalendarClock} iconBg="#fef3c7"
              title="When should this rule trigger?"
              hint="Choose the event that starts this rule.">
              <div className="space-y-3">
                {/* Event selector */}
                <div className="flex items-center gap-4">
                  <label className="text-xs font-700 uppercase tracking-wide w-20 shrink-0" style={{color:'var(--color-text-muted)'}}>Event</label>
                  <select value={selected.event} onChange={e=>patch({event:e.target.value})}
                    className={`${fs} flex-1 font-600`} style={fb}>
                    {(RULE_EVENTS[selected.target]||[]).map(ev=>(
                      <option key={ev.value} value={ev.value}>{ev.label}</option>
                    ))}
                  </select>
                  {(selected.event==='field_updated'||selected.event==='field_entered') && (
                    <select value={selected.trigger_field_mode||'any'} onChange={e=>patch({trigger_field_mode:e.target.value})}
                      className={`${fs} font-700`}
                      style={{background:'#fffbeb',color:'#b45309',borderColor:'#fcd34d'}}>
                      <option value="any">Any field</option>
                      <option value="specific">Specific field(s)</option>
                    </select>
                  )}
                </div>

                {/* Specific fields chooser */}
                {(selected.event==='field_updated'||selected.event==='field_entered') && selected.trigger_field_mode==='specific' && (() => {
                  const opts=watchOptionsFor(selected.target); const picked=selected.trigger_fields||[]
                  return (
                    <div className="flex items-start gap-4">
                      <label className="text-xs font-700 uppercase tracking-wide w-20 shrink-0 mt-2" style={{color:'var(--color-text-muted)'}}>Watch</label>
                      <div className="flex-1 space-y-2">
                        <select value="" onChange={e=>{ const v=e.target.value; if(!v||picked.includes(v)) return; patch({trigger_fields:[...picked,v]}) }}
                          className={`${fs} w-full`} style={fb}>
                          <option value="">{opts.length?'Add a field to watch…':'Loading fields…'}</option>
                          {opts.filter(o=>!picked.includes(o.value)).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {picked.length>0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {picked.map(v=>(
                              <span key={v} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-600"
                                style={{background:'#fef3c7',color:'#b45309'}}>
                                {fieldLabelFor(selected.target,v)}
                                <button type="button" onClick={()=>patch({trigger_fields:picked.filter(x=>x!==v)})}
                                  className="rounded-full p-0.5 hover:bg-amber-200/60"><X size={10}/></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </SectionCard>

            {/* ── STEP 2: CONDITIONS ── */}
            <SectionCard accent="#7c3aed" icon={SlidersHorizontal} iconBg="#ede9fe"
              title="Filter by conditions"
              hint="Leave empty to run on every event, or narrow the scope."
              footer={
                <button type="button" onClick={addCond}
                  className="inline-flex items-center gap-1.5 text-xs font-700 transition-colors"
                  style={{color:'var(--color-brand)'}}>
                  <Plus size={13}/> Add condition
                </button>
              }>
              {/* Match mode */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-(--color-border)">
                <span className="text-xs font-500" style={{color:'var(--color-text-muted)'}}>Run when</span>
                <select value={selected.condition_match||'all'} onChange={e=>patch({condition_match:e.target.value})}
                  className="px-2.5 py-1.5 rounded-lg border border-(--color-border) text-xs font-700 outline-none" style={fb}>
                  <option value="all">ALL</option>
                  <option value="any">ANY</option>
                </select>
                <span className="text-xs font-500" style={{color:'var(--color-text-muted)'}}>of these conditions are met</span>
              </div>

              {(selected.conditions||[]).length===0 ? (
                <div className="flex items-center gap-3 py-2 px-1">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background:'#ede9fe'}}>
                    <CheckSquare size={16} style={{color:'#7c3aed'}}/>
                  </div>
                  <div>
                    <p className="text-sm font-600" style={{color:'var(--color-text-primary)'}}>No conditions — rule runs on every event</p>
                    <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>Add a condition below to narrow when this rule fires.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(selected.conditions||[]).map((cond,i) => {
                    const needsVal=OP_NEEDS_VALUE[cond.op]!==false
                    const opts=needsVal&&!FREEFORM_OPS.has(cond.op)?fieldOptions(selected.target,cond.field,{stages}):null
                    return (
                      <div key={cond.id||i} className="group flex items-center gap-2 p-3 rounded-xl border transition-colors hover:border-(--color-brand)/40"
                        style={{borderColor:'var(--color-border)',background:'var(--color-surface-2)'}}>
                        <span className="text-[10px] font-800 w-5 text-center shrink-0" style={{color:'var(--color-text-muted)'}}>{i+1}</span>
                        <select value={cond.field} onChange={e=>patchCond(i,{...cond,field:e.target.value,value:''})}
                          className={`${fs} flex-1`} style={fb}>
                          <option value=''>Select field…</option>
                          {(RULE_FIELDS[selected.target]||[]).map(f=><option key={f} value={f}>{f}</option>)}
                        </select>
                        <select value={cond.op} onChange={e=>patchCond(i,{...cond,op:e.target.value})}
                          className={`${fs} shrink-0`} style={fb}>
                          {RULE_OPS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {needsVal ? (
                          opts ? (
                            <select value={cond.value} onChange={e=>patchCond(i,{...cond,value:e.target.value})}
                              className={`${fs} flex-1`} style={fb}>
                              <option value=''>Select…</option>
                              {opts.map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input value={cond.value} onChange={e=>patchCond(i,{...cond,value:e.target.value})}
                              placeholder={cond.op==='between'?'min,max':cond.op==='in'?'a, b':'value'}
                              className={`${fs} flex-1`} style={fb}/>
                          )
                        ) : (
                          <div className="flex-1 px-2 text-xs" style={{color:'var(--color-text-muted)'}}>—</div>
                        )}
                        <button type="button" onClick={()=>removeCond(i)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                          style={{color:'#ef4444'}}>
                          <X size={13}/>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>

            {/* ── STEP 3: ACTIONS ── */}
            <SectionCard accent="#2563eb" icon={Zap} iconBg="#dbeafe"
              title="Perform these actions"
              hint="Actions execute in order once conditions are satisfied."
              footer={
                <button type="button" onClick={addAct}
                  className="inline-flex items-center gap-1.5 text-xs font-700 transition-colors"
                  style={{color:'var(--color-brand)'}}>
                  <Plus size={13}/> Add action
                </button>
              }>
              {(selected.actions||[]).length===0 ? (
                <div className="flex items-center gap-3 py-2 px-1">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background:'#dbeafe'}}>
                    <Zap size={16} style={{color:'#2563eb'}}/>
                  </div>
                  <p className="text-sm font-600" style={{color:'var(--color-text-primary)'}}>No actions yet — add one below</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(selected.actions||[]).map((action,i) => {
                    const def=(RULE_ACTIONS[selected.target]||[]).find(a=>a.value===action.type)
                    const kind=def?.kind||'text'; const kColor=KIND_COLOR[kind]||'#64748b'
                    const Icon=ACTION_ICON[action.type]||ClipboardList
                    return (
                      <div key={action.id||i} className="rounded-xl overflow-hidden"
                        style={{border:`1px solid ${kColor}30`,boxShadow:`0 1px 4px ${kColor}10`}}>
                        {/* action header */}
                        <div className="flex items-center gap-3 px-4 py-3"
                          style={{background:`${kColor}08`,borderBottom:`1px solid ${kColor}20`}}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{background:`${kColor}20`}}>
                            <Icon size={14} style={{color:kColor}}/>
                          </div>
                          <select value={action.type}
                            onChange={e=>patchAct(i,{id:action.id,type:e.target.value,value:''})}
                            className="flex-1 bg-transparent border-none outline-none text-sm font-700 cursor-pointer"
                            style={{color:'var(--color-text-primary)'}}>
                            {(RULE_ACTIONS[selected.target]||[]).map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                          <span className="text-[10px] font-800 px-2 py-1 rounded-full shrink-0"
                            style={{background:`${kColor}18`,color:kColor}}>
                            #{i+1}
                          </span>
                          <button type="button" onClick={()=>removeAct(i)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-50 shrink-0"
                            style={{color:'#9ca3af'}}>
                            <X size={13}/>
                          </button>
                        </div>
                        {/* action fields */}
                        <div className="px-4 py-1" style={{background:'var(--color-surface)'}}>
                          <ActionFields action={action} target={selected.target} stages={stages}
                            tags={tagsFor(selected.target)} staff={staffList}
                            onChange={u=>patchAct(i,u)}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>

            {/* ── Test & History ── */}
            <SectionCard accent="#16a34a" icon={Play} iconBg="#dcfce7"
              title="Test & History"
              hint="Dry-run this rule against a real record to verify it works.">
              <div className="space-y-4">
                {/* buttons */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={runTest} disabled={testing}
                    className="btn btn-success btn-sm disabled:opacity-50">
                    <Play size={12}/>{testing?'Testing…':'Test on latest record'}
                  </button>
                  {selectedRuns.length>0 && (
                    <button type="button" onClick={()=>setShowRuns(s=>!s)}
                      className="btn btn-secondary btn-sm">
                      <History size={12}/>{selectedRuns.length} run{selectedRuns.length!==1?'s':''}
                    </button>
                  )}
                </div>

                {/* test result */}
                {testResult && (
                  <div className="rounded-xl p-4 text-xs"
                    style={{background:testResult.error?'#fffbeb':testResult.matched?'#f0fdf4':'#fff1f2',
                      border:`1px solid ${testResult.error?'#fcd34d':testResult.matched?'#86efac':'#fca5a5'}`}}>
                    {testResult.error
                      ? <p style={{color:'#b45309'}}>{testResult.error}</p>
                      : <div className="space-y-1">
                          <p className="font-600" style={{color:'var(--color-text-secondary)'}}>
                            Tested on: <b>{sampleLabel(selected.target,testResult.sample)}</b>
                            {' · '}
                            {testResult.matched
                              ? <span style={{color:'#15803d',fontWeight:700}}>✓ Conditions matched</span>
                              : <span style={{color:'#b91c1c',fontWeight:700}}>✗ Did not match</span>}
                          </p>
                          {testResult.matched && <p style={{color:'var(--color-text-muted)'}}>Would run: {testResult.actions.map(a=>a.type).join(', ')||'(no actions)'}</p>}
                          <p style={{color:'var(--color-text-muted)'}}>Dry run — no records changed.</p>
                        </div>
                    }
                  </div>
                )}

                {/* run history */}
                {showRuns && selectedRuns.length>0 && (
                  <div className="rounded-xl overflow-hidden border border-(--color-border)">
                    {selectedRuns.slice(0,8).map(r => {
                      const st=RUN_STATUS[r.status]||RUN_STATUS.skipped; const StIcon=st.icon
                      return (
                        <div key={r.id} className="flex items-center gap-3 text-xs px-4 py-2.5 border-b border-(--color-border) last:border-0"
                          style={{background:'var(--color-surface)'}}>
                          <span className="inline-flex items-center gap-1 font-700 px-2 py-0.5 rounded-full shrink-0"
                            style={{background:st.bg,color:st.color}}>
                            <StIcon size={10}/>{st.label}
                          </span>
                          <span style={{color:'var(--color-text-muted)'}}>{eventLabel(r.target,r.event)}</span>
                          {r.error && <span className="truncate" style={{color:'#b91c1c'}}>· {r.error}</span>}
                          <span className="ml-auto shrink-0 font-mono text-[11px]" style={{color:'var(--color-text-muted)'}}>
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {!testResult && !showRuns && (
                  <p className="text-xs" style={{color:'var(--color-text-muted)'}}>
                    Evaluates conditions against your most recent {selected.target} record — no changes are made.
                    Run history appears once the rule has fired at least once.
                  </p>
                )}
              </div>
            </SectionCard>

          </div>
        )}
      </div>
    </div>
  )
}
