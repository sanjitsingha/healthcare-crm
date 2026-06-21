'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Zap, Plus, Minus, Save, Trash2, Play, Pause, Filter, Bolt,
  Bell, Tag as TagIcon, MessageSquare, Mail, CheckSquare, UserPlus, X,
  ChevronLeft, ChevronRight, Layers, GitBranch, Clock, Send, Webhook, TrendingUp,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import {
  getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule, getTags,
} from '@/lib/supabase/queries'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'

// ── Catalog ────────────────────────────────────────────────────
const TRIGGERS = [
  { value: 'lead_created',          label: 'Lead Created' },
  { value: 'stage_changed',         label: 'Lead Stage Changed' },
  { value: 'patient_created',       label: 'Patient Created' },
  { value: 'appointment_booked',    label: 'Appointment Booked' },
  { value: 'appointment_cancelled', label: 'Appointment Cancelled' },
  { value: 'followup_missed',       label: 'Follow-up Missed' },
  { value: 'followup_completed',    label: 'Follow-up Completed' },
  { value: 'consultation_logged',   label: 'Consultation Logged' },
  { value: 'tag_added',             label: 'Tag Added' },
  { value: 'task_overdue',          label: 'Task Overdue' },
  { value: 'payment_received',      label: 'Payment Received' },
  { value: 'form_submitted',        label: 'Form Submitted' },
]
const ACTIONS = [
  { value: 'add_tag',        label: 'Add Tag',        icon: TagIcon },
  { value: 'remove_tag',     label: 'Remove Tag',     icon: TagIcon },
  { value: 'change_stage',   label: 'Change Stage',   icon: TrendingUp },
  { value: 'assign_user',    label: 'Assign Owner',   icon: UserPlus },
  { value: 'create_task',    label: 'Create Task',    icon: CheckSquare },
  { value: 'create_followup',label: 'Create Follow-up', icon: Bell },
  { value: 'notify_admin',   label: 'Notify Admin',   icon: Bell },
  { value: 'send_whatsapp',  label: 'Send WhatsApp',  icon: MessageSquare },
  { value: 'send_sms',       label: 'Send SMS',       icon: Send },
  { value: 'send_email',     label: 'Send Email',     icon: Mail },
  { value: 'webhook',        label: 'Call Webhook',   icon: Webhook },
]
const COND_FIELDS = ['source', 'priority', 'stage', 'value', 'status', 'type', 'gender']
const COND_OPS = [
  { value: '==', label: 'is' },
  { value: '!=', label: 'is not' },
  { value: '>',  label: '>' },
  { value: '<',  label: '<' },
  { value: 'contains', label: 'contains' },
]
const DELAY_UNITS = ['minutes', 'hours', 'days', 'weeks']
const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email']

const NODE_STYLE = {
  trigger:   { color: '#f59e0b', bg: '#fef9c3', label: 'Trigger',   icon: Bolt },
  condition: { color: '#7c3aed', bg: '#f3e8ff', label: 'Condition', icon: Filter },
  branch:    { color: '#db2777', bg: '#fce7f3', label: 'If / Else', icon: GitBranch },
  delay:     { color: '#0891b2', bg: '#cffafe', label: 'Delay',     icon: Clock },
  action:    { color: '#0ea5e9', bg: '#dbeafe', label: 'Action',    icon: Zap },
}

const NODE_W = 230
const uid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2))

// branch output port vertical offsets (must match the rendered dots)
const BRANCH_YES_Y = 86
const BRANCH_NO_Y  = 116

// anchor points (relative to canvas) for a node's ports
const outAnchor = (n, port) => {
  if (n.type === 'branch') return { x: n.x + NODE_W, y: n.y + (port === 'no' ? BRANCH_NO_Y : BRANCH_YES_Y) }
  return { x: n.x + NODE_W, y: n.y + 26 }
}
const inAnchor = (n) => ({ x: n.x, y: n.y + 26 })

function wirePath(s, t) {
  const dx = Math.max(40, Math.abs(t.x - s.x) / 2)
  return `M ${s.x} ${s.y} C ${s.x + dx} ${s.y}, ${t.x - dx} ${t.y}, ${t.x} ${t.y}`
}

export default function AutomationPage() {
  const { orgId, org } = useOrg()
  const canvasRef = useRef(null)
  const scrollRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [savedOpen, setSavedOpen] = useState(true)

  const staff = org?.settings?.staff_members || []
  const leadStages = (org?.settings?.lead_stages || []).map(s => typeof s === 'string' ? { name: s } : s)
  const [tags, setTags]       = useState([])
  const [rules, setRules]     = useState([])
  const [loading, setLoading] = useState(true)
  const [ruleId, setRuleId]   = useState(null)        // currently editing
  const [name, setName]       = useState('Untitled Automation')
  const [isActive, setActive] = useState(true)
  const [nodes, setNodes]     = useState([])
  const [edges, setEdges]     = useState([])
  const [saving, setSaving]   = useState(false)

  const [drag, setDrag]         = useState(null)       // { id, dx, dy }
  const [connect, setConnect]   = useState(null)       // { from, x, y }

  // ── Load rules ──
  const loadRules = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [r, t] = await Promise.all([getAutomationRules(orgId), getTags(orgId).catch(() => [])])
      setRules(r || [])
      setTags(t || [])
    }
    catch { setRules([]) }
    finally { setLoading(false) }
  }, [orgId])
  useEffect(() => { loadRules() }, [loadRules])

  // ── Canvas coordinate helper ──
  const toCanvas = (clientX, clientY) => {
    const r = canvasRef.current?.getBoundingClientRect()
    return { x: (clientX - (r?.left || 0)) / zoom, y: (clientY - (r?.top || 0)) / zoom }
  }

  // ── Drag + connect global listeners ──
  useEffect(() => {
    if (!drag && !connect) return
    const move = (e) => {
      const p = toCanvas(e.clientX, e.clientY)
      if (drag) {
        setNodes(ns => ns.map(n => n.id === drag.id ? { ...n, x: p.x - drag.dx, y: p.y - drag.dy } : n))
      } else if (connect) {
        setConnect(c => ({ ...c, x: p.x, y: p.y }))
      }
    }
    const up = () => { setDrag(null); setConnect(null) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [drag, connect])

  // ── Node ops ──
  const addNode = (type) => {
    const base =
      type === 'trigger'   ? { event: TRIGGERS[0].value } :
      type === 'condition' ? { field: 'source', op: '==', value: '' } :
      type === 'branch'    ? { field: 'source', op: '==', value: '' } :
      type === 'delay'     ? { amount: 1, unit: 'hours' } :
                             { action: ACTIONS[0].value }
    // Drop at the center of the current viewport
    const sr = scrollRef.current
    let x = 120, y = 120
    if (sr) {
      const centerClientX = sr.getBoundingClientRect().left + sr.clientWidth / 2
      const centerClientY = sr.getBoundingClientRect().top + sr.clientHeight / 2
      const c = toCanvas(centerClientX, centerClientY)
      x = Math.max(20, c.x - NODE_W / 2)
      y = Math.max(20, c.y - 40)
    }
    // small offset so stacked adds don't perfectly overlap
    const jitter = (nodes.length % 4) * 18
    setNodes(ns => [...ns, { id: uid(), type, x: x + jitter, y: y + jitter, data: base }])
  }
  const updateNode = (id, data) => setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
  const removeNode = (id) => {
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.from !== id && e.to !== id))
  }

  const startConnect = (e, nodeId, port = 'out') => {
    e.stopPropagation()
    const p = toCanvas(e.clientX, e.clientY)
    setConnect({ from: nodeId, port, x: p.x, y: p.y })
  }
  const completeConnect = (e, nodeId) => {
    e.stopPropagation()
    if (!connect || connect.from === nodeId) return
    setEdges(es => es.some(x => x.from === connect.from && x.to === nodeId && x.port === connect.port)
      ? es
      : [...es, { id: uid(), from: connect.from, to: nodeId, port: connect.port }])
    setConnect(null)
  }
  const removeEdge = (id) => setEdges(es => es.filter(e => e.id !== id))

  const startDrag = (e, n) => {
    if (e.button !== 0) return
    const p = toCanvas(e.clientX, e.clientY)
    setDrag({ id: n.id, dx: p.x - n.x, dy: p.y - n.y })
  }

  // ── Rule load / new / save ──
  const loadRule = (rule) => {
    setRuleId(rule.id)
    setName(rule.name || 'Untitled Automation')
    setActive(rule.is_active ?? true)
    const graph = rule.conditions || {}
    setNodes(Array.isArray(graph.nodes) ? graph.nodes : [])
    setEdges(Array.isArray(graph.edges) ? graph.edges : [])
  }
  const newRule = () => {
    setRuleId(null); setName('Untitled Automation'); setActive(true); setNodes([]); setEdges([])
  }

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const triggerNode = nodes.find(n => n.type === 'trigger')
      const payload = {
        organization_id: orgId,
        name: name.trim() || 'Untitled Automation',
        trigger_event: triggerNode?.data?.event || 'manual',
        conditions: { nodes, edges },
        actions: nodes.filter(n => n.type === 'action').map(n => n.data.action),
        is_active: isActive,
      }
      if (ruleId) {
        const u = await updateAutomationRule(ruleId, payload)
        setRules(rs => rs.map(r => r.id === ruleId ? u : r))
      } else {
        const c = await createAutomationRule(payload)
        setRules(rs => [c, ...rs]); setRuleId(c.id)
      }
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSaving(false) }
  }

  const handleDeleteRule = async () => {
    if (!ruleId) { newRule(); return }
    const ok = await showConfirm({ title: 'Delete this automation?', confirmLabel: 'Delete' })
    if (!ok) return
    try { await deleteAutomationRule(ruleId); setRules(rs => rs.filter(r => r.id !== ruleId)); newRule() }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  const nodeById = (id) => nodes.find(n => n.id === id)

  return (
    <div className="flex flex-col h-[calc(100vh-40px)]" style={{ background: 'var(--color-bg)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef9c3' }}>
            <Zap size={16} style={{ color: '#f59e0b' }} />
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-sm font-700 bg-transparent outline-none border-b border-transparent focus:border-(--color-border) px-1 py-0.5"
            style={{ color: 'var(--color-text-primary)', minWidth: 180 }}
          />
        </div>

        <div className="flex-1" />

        {/* Active toggle */}
        <button type="button" onClick={() => setActive(a => !a)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors"
          style={isActive
            ? { background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
            : { background: 'var(--color-surface)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
          {isActive ? <Play size={13} /> : <Pause size={13} />} {isActive ? 'Active' : 'Paused'}
        </button>

        {ruleId && (
          <button type="button" onClick={handleDeleteRule} className="p-2 rounded-lg border border-(--color-border) hover:bg-red-50 hover:text-red-500 transition-colors text-gray-400">
            <Trash2 size={15} />
          </button>
        )}
        <Button onClick={handleSave} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Saved automations — collapsible (moved before palette) */}
        {savedOpen ? (
          <aside className="w-56 shrink-0 border-r border-(--color-border) flex flex-col" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-(--color-border)">
              <p className="text-[10px] font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                <Layers size={13} /> Saved ({rules.length})
              </p>
              <button type="button" onClick={() => setSavedOpen(false)} title="Collapse"
                className="p-1 rounded-lg hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                <ChevronLeft size={15} />
              </button>
            </div>
            <div className="p-2">
              <button type="button" onClick={newRule}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-600 border border-dashed transition-colors hover:bg-(--color-brand-50) mb-2"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-brand)' }}>
                <Plus size={14} /> New Automation
              </button>
              <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {loading ? (
                  <div className="flex justify-center py-6"><Spinner size={20} /></div>
                ) : rules.length === 0 ? (
                  <p className="text-[11px] text-center py-6 px-2" style={{ color: 'var(--color-text-muted)' }}>No saved automations yet.</p>
                ) : (
                  rules.map(r => {
                    const active = r.id === ruleId
                    const trig = TRIGGERS.find(t => t.value === r.trigger_event)?.label || r.trigger_event
                    return (
                      <button key={r.id} type="button" onClick={() => loadRule(r)}
                        className="w-full text-left px-2.5 py-2 rounded-lg border transition-colors"
                        style={active
                          ? { background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' }
                          : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.is_active ? '#16a34a' : '#cbd5e1' }} />
                          <span className="text-xs font-600 truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>{r.name}</span>
                        </div>
                        <p className="text-[10px] mt-0.5 truncate pl-3" style={{ color: 'var(--color-text-muted)' }}>{trig}</p>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </aside>
        ) : (
          <div className="w-9 shrink-0 border-r border-(--color-border) flex flex-col items-center py-2" style={{ background: 'var(--color-surface)' }}>
            <button type="button" onClick={() => setSavedOpen(true)} title="Saved automations"
              className="p-1.5 rounded-lg hover:bg-(--color-surface-2) transition-colors relative" style={{ color: 'var(--color-text-muted)' }}>
              <ChevronRight size={15} />
            </button>
            <Layers size={15} className="mt-2" style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-[10px] font-700 mt-1" style={{ color: 'var(--color-text-muted)' }}>{rules.length}</span>
          </div>
        )}

        {/* Palette */}
        <aside className="w-48 shrink-0 border-r border-(--color-border) p-3 space-y-2" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[10px] font-700 uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Add Node</p>
          {[
            { type: 'trigger',   label: 'Trigger',   desc: 'When this happens' },
            { type: 'condition', label: 'Condition', desc: 'Continue only if…' },
            { type: 'branch',    label: 'If / Else',  desc: 'Split into Yes / No' },
            { type: 'delay',     label: 'Delay',     desc: 'Wait before next step' },
            { type: 'action',    label: 'Action',    desc: 'Do this' },
          ].map(({ type, label, desc }) => {
            const s = NODE_STYLE[type]; const Icon = s.icon
            return (
              <button key={type} type="button" onClick={() => addNode(type)}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-(--color-border) text-left transition-all hover:shadow-sm"
                style={{ background: 'var(--color-surface)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                  <Icon size={15} style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                </div>
              </button>
            )
          })}

          <div className="pt-3 mt-2 border-t border-(--color-border)">
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Click a node's <span className="font-700" style={{ color: 'var(--color-brand)' }}>right dot</span> then another node's <span className="font-700" style={{ color: 'var(--color-brand)' }}>left dot</span> to connect them.
            </p>
          </div>
        </aside>

        {/* Canvas viewport */}
        <div className="flex-1 relative min-h-0">
          <div ref={scrollRef} className="absolute inset-0 overflow-auto">
            {/* Sizer matches scaled dimensions so scrollbars are correct */}
            <div style={{ width: 2400 * zoom, height: 1400 * zoom }}>
              <div
                ref={canvasRef}
                className="relative"
                style={{
                  width: 2400, height: 1400,
                  transform: `scale(${zoom})`, transformOrigin: '0 0',
                  backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
                onPointerDown={() => setConnect(null)}
              >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center"><Spinner size={28} /></div>
            ) : nodes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                <Bolt size={40} className="opacity-20 mb-3" />
                <p className="text-sm font-500">Start by adding a Trigger from the left.</p>
                <p className="text-xs mt-1">Then add Conditions and Actions, and wire them together.</p>
              </div>
            ) : null}

            {/* Wires */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              {edges.map(e => {
                const a = nodeById(e.from), b = nodeById(e.to)
                if (!a || !b) return null
                const s = outAnchor(a, e.port), t = inAnchor(b)
                const mid = { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 }
                const stroke = e.port === 'yes' ? '#16a34a' : e.port === 'no' ? '#dc2626' : 'var(--color-brand)'
                return (
                  <g key={e.id}>
                    <path d={wirePath(s, t)} fill="none" stroke={stroke} strokeWidth={2} />
                    <circle cx={mid.x} cy={mid.y} r={8} fill="var(--color-surface)" stroke="var(--color-border)"
                      style={{ pointerEvents: 'all', cursor: 'pointer' }} onClick={() => removeEdge(e.id)} />
                    <text x={mid.x} y={mid.y + 3} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>×</text>
                  </g>
                )
              })}
              {/* temp wire */}
              {connect && (() => {
                const a = nodeById(connect.from); if (!a) return null
                return <path d={wirePath(outAnchor(a, connect.port), { x: connect.x, y: connect.y })} fill="none" stroke="var(--color-brand)" strokeWidth={2} strokeDasharray="5 4" />
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map(n => {
              const s = NODE_STYLE[n.type]; const Icon = s.icon
              const hasInput  = n.type !== 'trigger'
              const hasOutput = n.type !== 'action'
              return (
                <div key={n.id} className="absolute rounded-xl border shadow-sm select-none"
                  style={{ left: n.x, top: n.y, width: NODE_W, background: 'var(--color-surface)', borderColor: s.color + '60' }}>
                  {/* Header (drag handle) */}
                  <div onPointerDown={(e) => startDrag(e, n)}
                    className="flex items-center gap-2 px-3 py-2 rounded-t-xl cursor-grab active:cursor-grabbing"
                    style={{ background: s.bg }}>
                    <Icon size={14} style={{ color: s.color }} />
                    <span className="text-xs font-700 flex-1" style={{ color: s.color }}>{s.label}</span>
                    <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => removeNode(n.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"><X size={13} /></button>
                  </div>

                  {/* Body */}
                  <div className="p-3 space-y-2">
                    {n.type === 'trigger' && (
                      <select value={n.data.event} onChange={e => updateNode(n.id, { event: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                        {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    )}
                    {n.type === 'condition' && (
                      <div className="space-y-1.5">
                        <select value={n.data.field} onChange={e => updateNode(n.id, { field: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                          {COND_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <div className="flex gap-1.5">
                          <select value={n.data.op} onChange={e => updateNode(n.id, { op: e.target.value })}
                            className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                            {COND_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <input value={n.data.value} onChange={e => updateNode(n.id, { value: e.target.value })} placeholder="value"
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                        </div>
                      </div>
                    )}
                    {n.type === 'branch' && (
                      <div className="space-y-1.5">
                        <select value={n.data.field} onChange={e => updateNode(n.id, { field: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                          {COND_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <div className="flex gap-1.5">
                          <select value={n.data.op} onChange={e => updateNode(n.id, { op: e.target.value })}
                            className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                            {COND_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <input value={n.data.value} onChange={e => updateNode(n.id, { value: e.target.value })} placeholder="value"
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                        </div>
                        {/* Yes / No legend rows aligned to the output ports */}
                        <div className="flex items-center justify-end gap-1 h-5"><span className="text-[10px] font-700" style={{ color: '#16a34a' }}>Yes →</span></div>
                        <div className="flex items-center justify-end gap-1 h-5"><span className="text-[10px] font-700" style={{ color: '#dc2626' }}>No →</span></div>
                      </div>
                    )}
                    {n.type === 'delay' && (
                      <div className="flex gap-1.5">
                        <input type="number" min="1" value={n.data.amount} onChange={e => updateNode(n.id, { amount: e.target.value })}
                          className="w-16 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                        <select value={n.data.unit} onChange={e => updateNode(n.id, { unit: e.target.value })}
                          className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                          {DELAY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    )}
                    {n.type === 'action' && (
                      <div className="space-y-1.5">
                        <select value={n.data.action} onChange={e => updateNode(n.id, { action: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                          {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>

                        {/* Secondary config per action */}
                        {(n.data.action === 'add_tag' || n.data.action === 'remove_tag') && (
                          tags.length === 0 ? (
                            <p className="text-[10px] px-0.5" style={{ color: 'var(--color-text-muted)' }}>No tags yet — create in Settings → Tags.</p>
                          ) : (
                            <select value={n.data.tag_id || ''} onChange={e => updateNode(n.id, { tag_id: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border outline-none"
                              style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderColor: n.data.tag_id ? 'var(--color-border)' : '#f59e0b' }}>
                              <option value="">Select a tag…</option>
                              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          )
                        )}

                        {n.data.action === 'change_stage' && (
                          leadStages.length === 0 ? (
                            <p className="text-[10px] px-0.5" style={{ color: 'var(--color-text-muted)' }}>No stages — set in Settings → Tags.</p>
                          ) : (
                            <select value={n.data.stage || ''} onChange={e => updateNode(n.id, { stage: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border outline-none"
                              style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderColor: n.data.stage ? 'var(--color-border)' : '#f59e0b' }}>
                              <option value="">Select stage…</option>
                              {leadStages.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                          )
                        )}

                        {n.data.action === 'create_followup' && (
                          <select value={n.data.followup_type || ''} onChange={e => updateNode(n.id, { followup_type: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                            <option value="">Follow-up type…</option>
                            {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        )}

                        {n.data.action === 'webhook' && (
                          <input value={n.data.url || ''} onChange={e => updateNode(n.id, { url: e.target.value })}
                            placeholder="https://…"
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                        )}

                        {n.data.action === 'assign_user' && (
                          staff.length === 0 ? (
                            <p className="text-[10px] px-0.5" style={{ color: 'var(--color-text-muted)' }}>No team members — add in Settings → People.</p>
                          ) : (
                            <select value={n.data.assignee_id || ''} onChange={e => updateNode(n.id, { assignee_id: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border outline-none"
                              style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderColor: n.data.assignee_id ? 'var(--color-border)' : '#f59e0b' }}>
                              <option value="">Select owner…</option>
                              {staff.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          )
                        )}

                        {(n.data.action === 'send_whatsapp' || n.data.action === 'send_email' || n.data.action === 'send_sms') && (
                          <textarea value={n.data.message || ''} onChange={e => updateNode(n.id, { message: e.target.value })}
                            placeholder={n.data.action === 'send_email' ? 'Email message / template…' : n.data.action === 'send_sms' ? 'SMS message…' : 'WhatsApp message…'} rows={2}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none resize-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                        )}

                        {n.data.action === 'create_task' && (
                          <input value={n.data.task_title || ''} onChange={e => updateNode(n.id, { task_title: e.target.value })}
                            placeholder="Task title…"
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                        )}

                        {n.data.action === 'notify_admin' && (
                          <input value={n.data.note || ''} onChange={e => updateNode(n.id, { note: e.target.value })}
                            placeholder="Note (optional)…"
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ports */}
                  {hasInput && (
                    <div onPointerUp={(e) => completeConnect(e, n.id)}
                      className="absolute w-3.5 h-3.5 rounded-full border-2 cursor-crosshair"
                      style={{ left: -8, top: 19, background: 'var(--color-surface)', borderColor: s.color }}
                      title="Input" />
                  )}
                  {n.type === 'branch' ? (
                    <>
                      <div onPointerDown={(e) => startConnect(e, n.id, 'yes')}
                        className="absolute w-3.5 h-3.5 rounded-full border-2 cursor-crosshair"
                        style={{ right: -8, top: BRANCH_YES_Y - 7, background: '#16a34a', borderColor: '#16a34a' }}
                        title="Yes branch" />
                      <div onPointerDown={(e) => startConnect(e, n.id, 'no')}
                        className="absolute w-3.5 h-3.5 rounded-full border-2 cursor-crosshair"
                        style={{ right: -8, top: BRANCH_NO_Y - 7, background: '#dc2626', borderColor: '#dc2626' }}
                        title="No branch" />
                    </>
                  ) : hasOutput && (
                    <div onPointerDown={(e) => startConnect(e, n.id)}
                      className="absolute w-3.5 h-3.5 rounded-full border-2 cursor-crosshair"
                      style={{ right: -8, top: 19, background: s.color, borderColor: s.color }}
                      title="Drag to connect" />
                  )}
                </div>
              )
            })}
              </div>
            </div>
          </div>

          {/* Zoom control */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 px-1.5 py-1 rounded-xl border border-(--color-border) shadow-sm" style={{ background: 'var(--color-surface)' }}>
            <button type="button" onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
              <Minus size={15} />
            </button>
            <button type="button" onClick={() => setZoom(1)}
              className="text-xs font-700 w-12 text-center tabular-nums hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-primary)' }}
              title="Reset to 100%">
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" onClick={() => setZoom(z => Math.min(1.6, +(z + 0.1).toFixed(2)))}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
