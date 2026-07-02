'use client'
import { useState } from 'react'
import {
  Hash, UserRound, TrendingUp, Calendar, FileText, ClipboardList,
  GripVertical, X, Plus, Type, ListOrdered, Minus, Check, Save,
  Stethoscope, ChevronDown, ChevronUp, User,
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization, getOrganization } from '@/lib/supabase/queries'
import { DATE_FORMATS, SEPARATORS, toTokens, buildPatientCode } from '@/lib/patientId'
import { toast } from '@/lib/toast'

const uid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2))

const TOKEN_META = {
  text:      { label: 'Text',      icon: Type,        color: '#0ea5e9' },
  date:      { label: 'Date',      icon: Calendar,    color: '#7c3aed' },
  seq:       { label: 'Sequence',  icon: ListOrdered, color: '#0f6e56' },
  separator: { label: 'Separator', icon: Minus,       color: '#b45309' },
  doctor:    { label: 'Doctor',    icon: User,        color: '#7c3aed' },
}

// Doctor code format options shown inside the doctor token chip.
const DOCTOR_CODE_FORMATS = [
  { value: 'initials', label: 'Initials (e.g. AS)' },
  { value: 'name',     label: 'Last name (e.g. SHARMA)' },
]

const mkDefault = (prefix, useDate = false, seqDigits = 4) => [
  { id: uid(), type: 'text',      value: prefix },
  { id: uid(), type: 'separator', value: '-' },
  ...(useDate ? [
    { id: uid(), type: 'date',      value: 'YYYYMMDD' },
    { id: uid(), type: 'separator', value: '-' },
  ] : []),
  { id: uid(), type: 'seq',       value: seqDigits },
]

const ID_CATALOG = [
  {
    key:         'patient_id_format',
    label:       'Patient ID',
    description: 'Auto-generated code assigned to every new patient',
    example:     'PT-0001',
    icon:        UserRound,
    color:       '#0ea5e9',
    defaultTokens: mkDefault('PT'),
  },
  {
    key:         'lead_id_format',
    label:       'Lead ID',
    description: 'Unique reference for CRM leads and enquiries',
    example:     'LD-0001',
    icon:        TrendingUp,
    color:       '#f59e0b',
    defaultTokens: mkDefault('LD'),
  },
  {
    key:         'appointment_id_format',
    label:       'Appointment ID',
    description: 'Unique reference number for each appointment booking',
    example:     'APT-20260101-001',
    icon:        Calendar,
    color:       '#7c3aed',
    defaultTokens: mkDefault('APT', true, 3),
  },
  {
    key:         'invoice_id_format',
    label:       'Invoice ID',
    description: 'Auto number for consultation invoices and billing',
    example:     'INV-00001',
    icon:        FileText,
    color:       '#059669',
    defaultTokens: mkDefault('INV', false, 5),
  },
  {
    key:         'prescription_id_format',
    label:       'Prescription ID',
    description: 'Unique code for every prescription issued',
    example:     'RX-202601-0001',
    icon:        Stethoscope,
    color:       '#dc2626',
    defaultTokens: mkDefault('RX', true),
  },
  {
    key:         'consultation_id_format',
    label:       'Consultation ID',
    description: 'Reference ID for consultation records',
    example:     'CON-0001',
    icon:        ClipboardList,
    color:       '#db2777',
    defaultTokens: mkDefault('CON'),
  },
]

// ── Reusable token builder ─────────────────────────────────────
function TokenBuilder({ format, onChange, allowDoctor = false }) {
  const [dragIdx, setDragIdx] = useState(null)

  const addToken = (type) => {
    const defaults = { text: '', date: 'YYYYMMDD', seq: 4, separator: '-', doctor: 'initials' }
    onChange({ ...format, tokens: [...format.tokens, { id: uid(), type, value: defaults[type] }] })
  }
  const updateToken = (id, value) =>
    onChange({ ...format, tokens: format.tokens.map(t => t.id === id ? { ...t, value } : t) })
  const removeToken = (id) =>
    onChange({ ...format, tokens: format.tokens.filter(t => t.id !== id) })
  const reorder = (from, to) => {
    const next = [...format.tokens]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    onChange({ ...format, tokens: next })
  }

  const preview = buildPatientCode(format, Number(format.next_seq) || 1, new Date(), { doctorCode: 'DR' })

  return (
    <div className="space-y-3 pt-4 border-t border-(--color-border)">
      {/* Add-block buttons */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(TOKEN_META)
          .filter(([type]) => type !== 'doctor' || allowDoctor)
          .map(([type, m]) => {
            const Icon = m.icon
            return (
              <button key={type} type="button" onClick={() => addToken(type)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-600 transition-colors hover:bg-(--color-surface-2)"
                style={{ borderColor: 'var(--color-border)', color: m.color, background: 'var(--color-surface)' }}>
                <Plus size={11} /><Icon size={11} /> {m.label}
              </button>
            )
          })}
      </div>
      {allowDoctor && format.tokens.some(t => t.type === 'doctor') && (
        <p className="text-[11px] px-0.5 -mt-1" style={{ color: '#7c3aed' }}>
          ✦ Doctor token detected — each doctor gets their own sequence counter.
        </p>
      )}

      {/* Token chips */}
      <div>
        <p className="text-[10px] font-700 uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Format blocks — drag to reorder
        </p>
        {format.tokens.length === 0 ? (
          <div className="py-5 text-center border border-dashed rounded-xl border-(--color-border)">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No blocks yet. Add Text, Date, Sequence or Separator above.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {format.tokens.map((tok, i) => {
              const m = TOKEN_META[tok.type]; const Icon = m.icon
              return (
                <div key={tok.id} draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragIdx !== null && dragIdx !== i) reorder(dragIdx, i); setDragIdx(null) }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border"
                  style={{ borderColor: m.color + '60', background: m.color + '0d' }}>
                  <GripVertical size={13} className="cursor-grab active:cursor-grabbing shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                  <Icon size={11} style={{ color: m.color }} />
                  {tok.type === 'text' && (
                    <input value={tok.value} onChange={e => updateToken(tok.id, e.target.value)} placeholder="ABC"
                      className="w-20 px-2 py-1 text-xs rounded border outline-none"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  )}
                  {tok.type === 'date' && (
                    <select value={tok.value} onChange={e => updateToken(tok.id, e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      {Object.entries(DATE_FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  )}
                  {tok.type === 'seq' && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <input type="number" min="1" max="10" value={tok.value} onChange={e => updateToken(tok.id, e.target.value)}
                        className="w-12 px-2 py-1 text-xs rounded border outline-none"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      digits
                    </span>
                  )}
                  {tok.type === 'separator' && (
                    <select value={tok.value} onChange={e => updateToken(tok.id, e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      {SEPARATORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  )}
                  {tok.type === 'doctor' && (
                    <select value={tok.value || 'initials'} onChange={e => updateToken(tok.id, e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      {DOCTOR_CODE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => removeToken(tok.id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Next seq + preview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>Next number</label>
          <input type="number" min="1" value={format.next_seq}
            onChange={e => onChange({ ...format, next_seq: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Next record gets this number, then increments.</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>Live preview</label>
          <div className="px-3 py-2 rounded-lg border text-sm font-mono font-700"
            style={{ borderColor: 'var(--color-brand)', background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
            {preview || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Per-entity card ────────────────────────────────────────────
function IdFormatCard({ entity, allowDoctor = false }) {
  const { org, orgId } = useOrg()
  const [open, setOpen] = useState(false)
  const [fmt, setFmt] = useState(() => {
    const saved = org?.settings?.[entity.key]
    return {
      enabled:  saved?.enabled  ?? false,
      next_seq: saved?.next_seq ?? 1,
      tokens:   saved ? toTokens(saved) : entity.defaultTokens,
    }
  })
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Fetch fresh settings to avoid overwriting sibling keys changed by other cards.
      const fresh = await getOrganization(orgId)
      await updateOrganization(orgId, {
        settings: {
          ...(fresh?.settings || org?.settings || {}),
          [entity.key]: {
            enabled:  fmt.enabled,
            next_seq: Number(fmt.next_seq) || 1,
            tokens:   fmt.tokens,
          },
        },
      })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
      toast({ type: 'success', title: `${entity.label} format saved` })
    } catch (err) {
      toast({ type: 'error', title: 'Save failed', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const Icon = entity.icon
  const statusLabel = fmt.enabled ? 'Active' : 'Off'
  const statusStyle = fmt.enabled
    ? { background: '#dcfce7', color: '#15803d' }
    : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: entity.color + '18' }}>
          <Icon size={18} style={{ color: entity.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{entity.label}</p>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={statusStyle}>
              {statusLabel}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {entity.description}
            {!fmt.enabled && (
              <span className="ml-2 opacity-60">Example: <code className="text-[10px]">{entity.example}</code></span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Enable toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!fmt.enabled}
              onChange={e => setFmt(f => ({ ...f, enabled: e.target.checked }))}
              className="w-4 h-4" style={{ accentColor: 'var(--color-brand)' }} />
            <span className="text-xs font-600" style={{ color: 'var(--color-text-secondary)' }}>Enable</span>
          </label>
          {/* Save */}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {savedOk ? <><Check size={13} /> Saved</> : saving ? 'Saving…' : <><Save size={13} /> Save</>}
          </Button>
          {/* Expand toggle */}
          <button type="button" onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors"
            style={{ color: 'var(--color-text-muted)' }}>
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded builder */}
      {open && (
        <div className="px-5 pb-5">
          <TokenBuilder format={fmt} onChange={setFmt} allowDoctor={allowDoctor} />
        </div>
      )}
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function IdFormatsPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <Hash size={18} style={{ color: 'var(--color-brand)' }} />
          <h1 className="text-lg font-700" style={{ color: 'var(--color-text-primary)' }}>ID Formats</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Configure auto-generated ID numbers for each record type. Expand a card to customise the format blocks.
        </p>
      </div>

      {/* Format cards */}
      {ID_CATALOG.map(entity => (
        <IdFormatCard
          key={entity.key}
          entity={entity}
          allowDoctor={entity.key === 'appointment_id_format'}
        />
      ))}

      {/* Info box */}
      <div className="flex gap-2.5 px-4 py-3 rounded-xl border text-xs leading-relaxed"
        style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' + '30', color: 'var(--color-text-secondary)' }}>
        <Hash size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
        <span>
          Each enabled format auto-assigns a unique ID when a new record is created.
          The <strong>Next number</strong> is the sequence counter — you can reset it at any time without affecting existing IDs.
          Drag blocks to reorder, add <em>Date</em> for date-stamped codes, <em>Text</em> for a fixed prefix, and <em>Sequence</em> for the incrementing number.
        </span>
      </div>
    </div>
  )
}
