'use client'
import { useState } from 'react'
import {
  Plug, Globe, Webhook, MessageCircle, BookOpen,
  Check, Copy, Trash2, Link2, RefreshCw, ChevronDown,
  Key, Eye, EyeOff, Code2, Lock, Plus, Pencil, X,
} from 'lucide-react'
import { Button, Card, Input, Switch } from '@/components/ui'
import { GoogleFormsLogo, MetaLogo, ZapierLogo } from '@/components/crm/BrandLogos'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization, getOrganization, generateOrgApiKey } from '@/lib/supabase/queries'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'

// ── Provider catalog ───────────────────────────────────────────
const PROVIDERS = [
  {
    type: 'google_forms',
    name: 'Google Forms',
    description: 'Capture leads from Google Form submissions via Apps Script.',
    icon: GoogleFormsLogo,
    color: '#7c3aed',
    fields: [
      { key: 'webhook_url', label: 'Inbound Webhook URL', kind: 'generated' },
      { key: 'secret',      label: 'Shared Secret',        kind: 'secret', placeholder: 'Optional verification token' },
    ],
  },
  {
    type: 'wordpress',
    name: 'WordPress Forms',
    description: 'Contact Form 7, WPForms, or Elementor — forward entries to the CRM.',
    icon: Globe,
    color: '#0ea5e9',
    fields: [
      { key: 'webhook_url', label: 'Inbound Webhook URL', kind: 'generated' },
      { key: 'site_url',    label: 'WordPress Site URL',   kind: 'text', placeholder: 'https://yourclinic.com' },
      { key: 'secret',      label: 'Shared Secret',        kind: 'secret', placeholder: 'Optional verification token' },
    ],
  },
  {
    type: 'meta_lead_ads',
    name: 'Meta Lead Ads',
    description: 'Facebook & Instagram lead-gen forms push leads in real time.',
    icon: MetaLogo,
    color: '#1d4ed8',
    fields: [
      { key: 'page_access_token', label: 'Page Access Token', kind: 'secret', placeholder: 'EAAB...' },
      { key: 'form_id',           label: 'Lead Form ID',      kind: 'text', placeholder: '1234567890' },
      { key: 'verify_token',      label: 'Verify Token',      kind: 'text', placeholder: 'A token you choose' },
    ],
  },
  {
    type: 'webhook',
    name: 'Generic Webhook',
    description: 'Any service that can POST JSON — get a URL to send leads to.',
    icon: Webhook,
    color: '#10b981',
    fields: [
      { key: 'webhook_url', label: 'Inbound Webhook URL', kind: 'generated' },
      { key: 'secret',      label: 'Shared Secret',        kind: 'secret', placeholder: 'Optional verification token' },
    ],
  },
  {
    type: 'zapier',
    name: 'Zapier',
    description: 'Connect 6,000+ apps. Use the webhook URL as a Zap action.',
    icon: ZapierLogo,
    color: '#f59e0b',
    fields: [
      { key: 'webhook_url', label: 'Inbound Webhook URL', kind: 'generated' },
      { key: 'api_key',     label: 'API Key',              kind: 'secret', placeholder: 'Optional' },
    ],
  },
  {
    type: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Capture inbound WhatsApp enquiries as leads.',
    icon: MessageCircle,
    color: '#15803d',
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', kind: 'text', placeholder: '1234567890' },
      { key: 'access_token',    label: 'Access Token',     kind: 'secret', placeholder: 'EAAB...' },
    ],
  },
]

const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map(p => [p.type, p]))

const DOCS_ANCHOR = {
  google_forms:  'google-forms',
  wordpress:     'wordpress',
  meta_lead_ads: 'integrations',
  zapier:        'integrations',
  webhook:       'integrations',
  whatsapp:      'integrations',
}

const LEAD_FIELD_OPTIONS = [
  { value: 'first_name',    label: 'First name' },
  { value: 'last_name',     label: 'Last name' },
  { value: 'phone',         label: 'Phone' },
  { value: 'email',         label: 'Email' },
  { value: 'gender',        label: 'Gender' },
  { value: 'date_of_birth', label: 'Date of birth' },
  { value: 'address',       label: 'Address' },
  { value: 'value',         label: 'Value (number)' },
  { value: 'source',        label: 'Source' },
  { value: 'priority',      label: 'Priority' },
  { value: 'stage',         label: 'Stage' },
  { value: 'description',   label: 'Notes / Message' },
  { value: 'title',         label: 'Title' },
  { value: 'custom:',       label: 'Custom field (store as-is)' },
]

// ── Page tabs ──────────────────────────────────────────────────
const TABS = [
  { id: 'integrations', label: 'Configuration' },
  { id: 'api-access',   label: 'API Access' },
  { id: 'api-names',    label: 'API Names' },
]

// ── API Names — entity definitions ─────────────────────────────
const ENTITIES = [
  { id: 'leads',         label: 'Lead Page' },
  { id: 'patients',      label: 'Patient Page' },
  { id: 'consultations', label: 'Consultation Page' },
]

const SYSTEM_FIELDS = {
  leads: [
    { api_name: 'first_name',    display: 'First Name',        type: 'text',     note: '* One of first_name / phone / email required' },
    { api_name: 'last_name',     display: 'Last Name',         type: 'text',     note: '' },
    { api_name: 'name',          display: 'Full Name (alias)', type: 'text',     note: 'Auto-split into first_name + last_name' },
    { api_name: 'phone',         display: 'Phone',             type: 'text',     note: '* One of first_name / phone / email required' },
    { api_name: 'email',         display: 'Email',             type: 'email',    note: '* One of first_name / phone / email required' },
    { api_name: 'gender',        display: 'Gender',            type: 'text',     note: 'Male / Female / Other' },
    { api_name: 'date_of_birth', display: 'Date of Birth',     type: 'date',     note: 'YYYY-MM-DD' },
    { api_name: 'address',       display: 'Address',           type: 'text',     note: '' },
    { api_name: 'source',        display: 'Source',            type: 'text',     note: 'e.g. Website, Instagram' },
    { api_name: 'stage',         display: 'Stage',             type: 'text',     note: 'New / Contacted / Interested / Follow-up / Converted / Lost' },
    { api_name: 'priority',      display: 'Priority',          type: 'text',     note: 'Low / Medium / High / Urgent' },
    { api_name: 'notes',         display: 'Notes / Message',   type: 'text',     note: 'Alias for description' },
    { api_name: 'description',   display: 'Description',       type: 'text',     note: '' },
  ],
  patients: [
    { api_name: 'first_name',    display: 'First Name',        type: 'text',     note: '' },
    { api_name: 'last_name',     display: 'Last Name',         type: 'text',     note: '' },
    { api_name: 'phone',         display: 'Phone',             type: 'text',     note: '' },
    { api_name: 'email',         display: 'Email',             type: 'email',    note: '' },
    { api_name: 'gender',        display: 'Gender',            type: 'text',     note: 'Male / Female / Other' },
    { api_name: 'date_of_birth', display: 'Date of Birth',     type: 'date',     note: 'YYYY-MM-DD (month only: YYYY-MM-01)' },
    { api_name: 'address',       display: 'Address',           type: 'text',     note: '' },
    { api_name: 'blood_group',   display: 'Blood Group',       type: 'text',     note: 'A+ / A- / B+ / B- / O+ / O- / AB+ / AB-' },
    { api_name: 'marital_status',display: 'Marital Status',    type: 'text',     note: 'Single / Married / Widowed / Divorced' },
    { api_name: 'age',           display: 'Age',               type: 'number',   note: '' },
    { api_name: 'city',          display: 'City',              type: 'text',     note: '' },
    { api_name: 'state',         display: 'State',             type: 'text',     note: '' },
    { api_name: 'zip_code',      display: 'ZIP / Pincode',     type: 'text',     note: '' },
    { api_name: 'occupation',    display: 'Occupation',        type: 'text',     note: '' },
    { api_name: 'alt_phone',     display: 'Alternate Phone',   type: 'text',     note: '' },
    { api_name: 'whatsapp_phone',display: 'WhatsApp Number',   type: 'text',     note: '' },
  ],
  consultations: [
    { api_name: 'scheduled_at',              display: 'Date & Time',         type: 'datetime', note: 'ISO 8601 — e.g. 2026-06-21T10:30:00' },
    { api_name: 'doctor_id',                 display: 'Doctor (ID)',          type: 'uuid',     note: 'UUID of the doctor record' },
    { api_name: 'consultation_fee',          display: 'Consultation Fee',     type: 'number',   note: '' },
    { api_name: 'consultation_fee_status',   display: 'Fee Status',           type: 'text',     note: 'pending / paid' },
    { api_name: 'payment_mode',              display: 'Payment Mode',         type: 'text',     note: 'cash / online' },
    { api_name: 'registration_fee',          display: 'Registration Fee',     type: 'number',   note: '' },
    { api_name: 'registration_fee_status',   display: 'Reg Fee Status',       type: 'text',     note: 'pending / paid' },
    { api_name: 'notes',                     display: 'Notes',                type: 'text',     note: '' },
    { api_name: 'status',                    display: 'Status',               type: 'text',     note: 'scheduled / completed / cancelled' },
  ],
}

const FIELD_TYPES = ['text', 'number', 'date', 'email', 'phone', 'select']

// ── Helpers ────────────────────────────────────────────────────
function toApiName(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function genToken() {
  return (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '')
}

// ── Sub-components ─────────────────────────────────────────────
function FieldCombobox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const q = (value || '').toLowerCase()
  const filtered = (options || []).filter(o => o.toLowerCase().includes(q))
  const list = filtered.length ? filtered : (options || [])
  return (
    <div className="relative flex-1 min-w-0">
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full px-2 py-1.5 pr-7 text-xs rounded-lg border border-(--color-border) outline-none"
        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
      />
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
      {open && list.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-(--color-border) shadow-lg"
          style={{ background: 'var(--color-surface)' }}>
          {list.map(o => (
            <button key={o} type="button" onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(o); setOpen(false) }}
              className="block w-full text-left px-2.5 py-1.5 text-xs hover:bg-(--color-brand-50)"
              style={{ color: 'var(--color-text-primary)' }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionHead({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-4 pb-4 border-b border-(--color-border)">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
        <Icon size={16} style={{ color: 'var(--color-brand)' }} />
      </div>
      <div>
        <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {description && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      </div>
    </div>
  )
}

// ── Connected integration card ─────────────────────────────────
function IntegrationCard({ integration, onSave, onToggle, onRemove }) {
  const provider = PROVIDER_MAP[integration.type]
  const [editing, setEditing]   = useState(false)
  const [values, setValues]     = useState({ ...integration.config })
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState('')
  const { orgId }               = useOrg()
  const [mapRows, setMapRows]   = useState(() => integration.config?.field_map || [])
  const [savingMap, setSavingMap] = useState(false)
  const [mapOpen, setMapOpen]   = useState(false)
  const [liveDetected, setLiveDetected] = useState(null)
  const [refreshing, setRefreshing]     = useState(false)
  const detected = liveDetected ?? (integration.config?.detected_fields || [])

  const addMapRow    = () => setMapRows(r => [...r, { form_field: '', lead_field: '' }])
  const setMapRow    = (i, p) => setMapRows(r => r.map((x, idx) => idx === i ? { ...x, ...p } : x))
  const removeMapRow = (i) => setMapRows(r => r.filter((_, idx) => idx !== i))
  const saveMap = async () => {
    setSavingMap(true)
    try { await onSave(integration.id, { field_map: mapRows.filter(r => r.form_field && r.lead_field) }) }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSavingMap(false) }
  }
  const refreshFields = async () => {
    setRefreshing(true)
    try {
      const o = await getOrganization(orgId)
      const integ = (o?.settings?.integrations || []).find(i => i.id === integration.id)
      setLiveDetected(integ?.config?.detected_fields || [])
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setRefreshing(false) }
  }

  if (!provider) return null
  const Icon = provider.icon

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500) } catch {}
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(integration.id, values); setEditing(false) }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: provider.color + '18' }}>
          <Icon size={18} style={{ color: provider.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{provider.name}</p>
            <span className="text-[10px] font-700 px-2 py-0.5 rounded-full"
              style={integration.enabled
                ? { background: '#dcfce7', color: '#15803d' }
                : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              {integration.enabled ? 'Active' : 'Paused'}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{provider.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Switch checked={integration.enabled} onChange={() => onToggle(integration.id)} title={integration.enabled ? 'Pause' : 'Activate'} />
          <button type="button" onClick={() => onRemove(integration.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="border-t border-(--color-border) p-4 space-y-3" style={{ background: 'var(--color-surface-2)' }}>
        {provider.fields.map(field => {
          const val = (editing ? values[field.key] : integration.config?.[field.key]) || ''
          if (field.kind === 'generated') {
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{field.label}</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={val}
                    className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }} />
                  <button type="button" onClick={() => copy(val, field.key)}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-(--color-border) text-xs font-600 transition-colors hover:bg-(--color-brand-50) shrink-0"
                    style={{ color: copied === field.key ? '#15803d' : 'var(--color-text-muted)' }}>
                    {copied === field.key ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              </div>
            )
          }
          return editing ? (
            <Input key={field.key} label={field.label} type={field.kind === 'secret' ? 'password' : 'text'}
              placeholder={field.placeholder} value={values[field.key] || ''}
              onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} />
          ) : (
            <div key={field.key} className="flex items-center justify-between gap-4">
              <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>{field.label}</span>
              <span className="text-xs font-500 truncate text-right" style={{ color: 'var(--color-text-primary)' }}>
                {val ? (field.kind === 'secret' ? '••••••••' : val) : <span style={{ color: 'var(--color-text-muted)' }}>Not set</span>}
              </span>
            </div>
          )
        })}

        {(integration.config?.webhook_url != null) && (
          <div className="rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
            <button type="button" onClick={() => setMapOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5">
              <span className="text-xs font-600 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                <Link2 size={13} /> Field Mapping
                <span className="text-[10px] font-500" style={{ color: 'var(--color-text-muted)' }}>
                  · {detected.length ? `${detected.length} field${detected.length !== 1 ? 's' : ''} detected` : 'submit once to detect'}
                </span>
              </span>
              <ChevronDown size={15} style={{ color: 'var(--color-text-muted)', transform: mapOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            {mapOpen && (
              <div className="px-3 pb-3 space-y-2.5 border-t border-(--color-border) pt-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    Map each form question to a lead field. Unmapped questions are still auto-detected and saved.
                  </p>
                  <button type="button" onClick={refreshFields} disabled={refreshing}
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-600 px-2 py-1 rounded-md border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                    style={{ color: 'var(--color-text-muted)' }}>
                    <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh fields
                  </button>
                </div>
                {mapRows.length > 0 && (
                  <div className="space-y-2">
                    {mapRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <FieldCombobox value={row.form_field} onChange={v => setMapRow(i, { form_field: v })}
                          options={detected} placeholder="Form question" />
                        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>→</span>
                        <select value={row.lead_field} onChange={e => setMapRow(i, { lead_field: e.target.value })}
                          className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>
                          <option value="">Select lead field…</option>
                          {LEAD_FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button type="button" onClick={() => removeMapRow(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {detected.length === 0 && mapRows.length === 0 && (
                  <p className="text-[11px] px-2.5 py-2 rounded-md" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                    No fields detected yet. Submit the form once, then click <b>Refresh fields</b>.
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <Button variant="secondary" size="sm" type="button" onClick={addMapRow}>+ Add mapping</Button>
                  <Button size="sm" type="button" onClick={saveMap} disabled={savingMap}>{savingMap ? 'Saving…' : 'Save mapping'}</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <a href={`/docs#${DOCS_ANCHOR[integration.type] || 'integrations'}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
            style={{ color: 'var(--color-text-secondary)' }}>
            <BookOpen size={13} /> Docs
          </a>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="secondary" size="sm" type="button" onClick={() => { setValues({ ...integration.config }); setEditing(false) }}>Cancel</Button>
                <Button size="sm" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" type="button" onClick={() => { setValues({ ...integration.config }); setEditing(true) }}>Configure</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function ConfigurationPage() {
  const { org, orgId } = useOrg()

  // Mutable local copy of org settings so multiple saves don't step on each other
  const [localSettings, setLocalSettings] = useState(() => org?.settings || {})

  // ── Tab state ────────────────────────────────────────────────
  const [tab, setTab] = useState('integrations')

  // ── Integrations state ───────────────────────────────────────
  const [integrations, setIntegrations] = useState(() => localSettings.integrations || [])
  const [busy, setBusy] = useState(false)

  // ── API Access state ─────────────────────────────────────────
  const [apiKey, setApiKey]       = useState(() => localSettings.public_api_key || '')
  const [showKey, setShowKey]     = useState(false)
  const [keyCopied, setKeyCopied] = useState('')
  const [keyBusy, setKeyBusy]     = useState(false)
  const [showCode, setShowCode]   = useState(false)

  // ── API Names state ──────────────────────────────────────────
  const [entity, setEntity]           = useState('leads')
  const [apiFieldsMap, setApiFieldsMap] = useState(() => localSettings.api_fields || {})
  const [addingField, setAddingField] = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [fieldForm, setFieldForm]     = useState({ display: '', api_name: '', type: 'text', note: '' })
  const [fieldBusy, setFieldBusy]     = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // ── Save helper — always merges into latest localSettings ────
  const saveSettings = async (patch) => {
    const updated = { ...localSettings, ...patch }
    await updateOrganization(orgId, { settings: updated })
    setLocalSettings(updated)
    return updated
  }

  // ── Integrations handlers ────────────────────────────────────
  const persist = async (updated) => {
    setBusy(true)
    try {
      await saveSettings({ integrations: updated })
      setIntegrations(updated)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setBusy(false) }
  }

  const connectedTypes = new Set(integrations.map(i => i.type))
  const available = PROVIDERS.filter(p => !connectedTypes.has(p.type))

  const handleConnect = async (provider) => {
    const token = genToken()
    const config = {}
    provider.fields.forEach(f => {
      config[f.key] = f.kind === 'generated' ? `${origin}/api/webhooks/${provider.type}/${token}` : ''
    })
    await persist([...integrations, { id: crypto.randomUUID(), type: provider.type, token, enabled: true, config, created_at: new Date().toISOString() }])
  }
  const handleSaveConfig  = async (id, values) => persist(integrations.map(i => i.id === id ? { ...i, config: { ...i.config, ...values } } : i))
  const handleToggle      = async (id) => persist(integrations.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i))
  const handleRemove      = async (id) => {
    const ok = await showConfirm({ title: 'Remove this integration?', message: 'The webhook URL will stop working.', confirmLabel: 'Remove' })
    if (!ok) return
    persist(integrations.filter(i => i.id !== id))
  }

  // ── API Access handlers ──────────────────────────────────────
  const handleGenerateKey = async () => {
    if (apiKey) {
      const ok = await showConfirm({ title: 'Regenerate API key?', message: 'The existing key will stop working immediately.', confirmLabel: 'Regenerate' })
      if (!ok) return
    }
    setKeyBusy(true)
    try {
      const newKey = await generateOrgApiKey(orgId, localSettings)
      setApiKey(newKey)
      setLocalSettings(s => ({ ...s, public_api_key: newKey }))
      setShowKey(true)
      toast({ type: 'success', title: 'API key generated' })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setKeyBusy(false) }
  }

  const clip = async (text, slot) => {
    try { await navigator.clipboard.writeText(text); setKeyCopied(slot); setTimeout(() => setKeyCopied(''), 1500) } catch {}
  }

  const codeExample =
`fetch('${origin}/api/public/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ${apiKey || 'hcrm_your_api_key'}',
  },
  body: JSON.stringify({
    first_name: 'Priya',
    last_name:  'Sharma',
    phone:      '9876543210',
    email:      'priya@example.com',
    source:     'Website',
  }),
})`

  // ── API Names handlers ───────────────────────────────────────
  const currentCustom = apiFieldsMap[entity] || []

  const persistApiFields = async (updatedForEntity) => {
    const updated = { ...apiFieldsMap, [entity]: updatedForEntity }
    setFieldBusy(true)
    try {
      await saveSettings({ api_fields: updated })
      setApiFieldsMap(updated)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setFieldBusy(false) }
  }

  const startAdd = () => { setFieldForm({ display: '', api_name: '', type: 'text', note: '' }); setAddingField(true); setEditingId(null) }
  const startEdit = (f) => { setFieldForm({ display: f.display, api_name: f.api_name, type: f.type, note: f.note || '' }); setEditingId(f.id); setAddingField(false) }
  const cancelField = () => { setAddingField(false); setEditingId(null) }

  const handleAddField = async () => {
    if (!fieldForm.display.trim() || !fieldForm.api_name.trim()) return
    const apiName = toApiName(fieldForm.api_name)
    const clash = [...(SYSTEM_FIELDS[entity] || []), ...currentCustom].some(f => f.api_name === apiName)
    if (clash) { toast({ type: 'error', title: 'API name already exists', message: `"${apiName}" is already used by another field.` }); return }
    await persistApiFields([...currentCustom, { id: crypto.randomUUID(), ...fieldForm, api_name: apiName }])
    setAddingField(false)
  }

  const handleEditField = async () => {
    if (!fieldForm.display.trim() || !fieldForm.api_name.trim()) return
    const apiName = toApiName(fieldForm.api_name)
    const clash = [...(SYSTEM_FIELDS[entity] || []), ...currentCustom].some(f => f.api_name === apiName && f.id !== editingId)
    if (clash) { toast({ type: 'error', title: 'API name already exists', message: `"${apiName}" is already used by another field.` }); return }
    await persistApiFields(currentCustom.map(f => f.id === editingId ? { ...f, ...fieldForm, api_name: apiName } : f))
    setEditingId(null)
  }

  const handleDeleteField = async (id) => {
    const ok = await showConfirm({ title: 'Delete custom field?', message: 'Existing data stored under this API name will remain in custom_data but won\'t be labelled.', confirmLabel: 'Delete' })
    if (!ok) return
    persistApiFields(currentCustom.filter(f => f.id !== id))
  }

  // ── Inline field form (add / edit) ───────────────────────────
  const FieldForm = ({ onSubmit, onCancel, submitLabel }) => (
    <div className="rounded-lg border border-(--color-border) p-3 space-y-2.5" style={{ background: 'var(--color-surface-2)' }}>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Display Name *</label>
          <input value={fieldForm.display} onChange={e => setFieldForm(f => ({ ...f, display: e.target.value, api_name: editingId ? f.api_name : toApiName(e.target.value) }))}
            placeholder="e.g. Disease Name"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>API Name *</label>
          <input value={fieldForm.api_name} onChange={e => setFieldForm(f => ({ ...f, api_name: toApiName(e.target.value) }))}
            placeholder="e.g. disease_name"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none font-mono"
            style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Type</label>
          <select value={fieldForm.type} onChange={e => setFieldForm(f => ({ ...f, type: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Notes / Description</label>
          <input value={fieldForm.note} onChange={e => setFieldForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Optional hint"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button size="sm" type="button" onClick={onSubmit} disabled={fieldBusy || !fieldForm.display.trim() || !fieldForm.api_name.trim()}>
          {fieldBusy ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* ── Tab navigation ──────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-600 transition-all"
            style={tab === t.id
              ? { background: 'var(--color-surface)', color: 'var(--color-brand)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: 'var(--color-text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Integrations ────────────────────────────────── */}
      {tab === 'integrations' && (
        <>
          <Card className="p-5">
            <SectionHead icon={Plug} title="Connected Integrations" description="Third-party services that capture leads into your CRM" />
            {integrations.length === 0 ? (
              <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
                <Plug size={26} className="mx-auto mb-2 opacity-25" />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No integrations connected yet.</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Pick one below to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {integrations.map(i => (
                  <IntegrationCard key={i.id} integration={i} onSave={handleSaveConfig} onToggle={handleToggle} onRemove={handleRemove} />
                ))}
              </div>
            )}
          </Card>

          {available.length > 0 && (
            <Card className="p-5">
              <SectionHead icon={Link2} title="Available Integrations" description="Connect a new lead source or third-party tool" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {available.map(provider => {
                  const Icon = provider.icon
                  return (
                    <div key={provider.type} className="flex items-center gap-3 p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: provider.color + '18' }}>
                        <Icon size={18} style={{ color: provider.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{provider.name}</p>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{provider.description}</p>
                      </div>
                      <Button size="sm" variant="secondary" type="button" disabled={busy} onClick={() => handleConnect(provider)} className="shrink-0">Connect</Button>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          <div className="flex gap-2.5 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' + '30' }}>
            <RefreshCw size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Copy the generated webhook URL into your external form or service. Incoming submissions will be created as new leads.
            </p>
          </div>
        </>
      )}

      {/* ── Tab: API Access ──────────────────────────────────── */}
      {tab === 'api-access' && (
        <Card className="p-5">
          <SectionHead icon={Key} title="API Access" description="Let your custom landing page submit leads directly into this CRM" />
          <div className="space-y-3">

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>API Key</label>
              <div className="flex items-center gap-2">
                <input readOnly
                  value={apiKey ? (showKey ? apiKey : apiKey.slice(0, 8) + '••••••••••••••••••••••••') : ''}
                  placeholder="No key generated yet"
                  className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: apiKey ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }} />
                {apiKey && (
                  <>
                    <button type="button" onClick={() => setShowKey(v => !v)}
                      className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}>
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button type="button" onClick={() => clip(apiKey, 'key')}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-(--color-border) text-xs font-600 transition-colors hover:bg-(--color-brand-50) shrink-0"
                      style={{ color: keyCopied === 'key' ? '#15803d' : 'var(--color-text-muted)' }}>
                      {keyCopied === 'key' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </>
                )}
                <Button size="sm" variant={apiKey ? 'secondary' : 'primary'} type="button" onClick={handleGenerateKey} disabled={keyBusy} className="shrink-0">
                  {keyBusy ? 'Generating…' : apiKey ? 'Regenerate' : 'Generate key'}
                </Button>
              </div>
            </div>

            {/* Endpoint */}
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Endpoint URL</label>
              <div className="flex items-center gap-2">
                <input readOnly value={`${origin}/api/public/leads`}
                  className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }} />
                <button type="button" onClick={() => clip(`${origin}/api/public/leads`, 'url')}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-(--color-border) text-xs font-600 transition-colors hover:bg-(--color-brand-50) shrink-0"
                  style={{ color: keyCopied === 'url' ? '#15803d' : 'var(--color-text-muted)' }}>
                  {keyCopied === 'url' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>

            {/* Code example */}
            <div className="rounded-lg border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
              <button type="button" onClick={() => setShowCode(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5">
                <span className="text-xs font-600 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  <Code2 size={13} /> Code Example
                  <span className="text-[10px] font-400" style={{ color: 'var(--color-text-muted)' }}>· fetch() for your landing page</span>
                </span>
                <ChevronDown size={15} style={{ color: 'var(--color-text-muted)', transform: showCode ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </button>
              {showCode && (
                <div className="border-t border-(--color-border) relative">
                  <button type="button" onClick={() => clip(codeExample, 'code')}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                    style={{ color: keyCopied === 'code' ? '#15803d' : 'var(--color-text-muted)', background: 'var(--color-surface)' }}>
                    {keyCopied === 'code' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                  <pre className="px-4 py-3 text-[11px] font-mono overflow-x-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)' }}>
                    {codeExample}
                  </pre>
                </div>
              )}
            </div>

            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Use <b>API Names</b> tab to see the accepted field names and add custom fields.
            </p>
          </div>
        </Card>
      )}

      {/* ── Tab: API Names ───────────────────────────────────── */}
      {tab === 'api-names' && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-(--color-border)">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                <Lock size={16} style={{ color: 'var(--color-brand)' }} />
              </div>
              <div>
                <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>API Names</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Field names to use when sending data via API. System fields are read-only; you can add custom fields below.</p>
              </div>
            </div>
            {!addingField && editingId === null && (
              <button type="button" onClick={startAdd}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
                style={{ color: 'var(--color-brand)' }}>
                <Plus size={13} /> Add field
              </button>
            )}
          </div>

          {/* Entity selector */}
          <div className="flex gap-1 mb-4 p-1 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
            {ENTITIES.map(e => (
              <button key={e.id} type="button" onClick={() => { setEntity(e.id); cancelField() }}
                className="flex-1 py-1.5 px-3 rounded-md text-xs font-600 transition-all"
                style={entity === e.id
                  ? { background: 'var(--color-surface)', color: 'var(--color-brand)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }
                  : { color: 'var(--color-text-muted)' }}>
                {e.label}
              </button>
            ))}
          </div>

          {/* Fields table */}
          <div className="rounded-lg border border-(--color-border) overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th className="px-3 py-2 text-left font-600" style={{ color: 'var(--color-text-muted)' }}>Display Name</th>
                  <th className="px-3 py-2 text-left font-600" style={{ color: 'var(--color-text-muted)' }}>API Name</th>
                  <th className="px-3 py-2 text-left font-600" style={{ color: 'var(--color-text-muted)' }}>Type</th>
                  <th className="px-3 py-2 text-left font-600" style={{ color: 'var(--color-text-muted)' }}>Notes</th>
                  <th className="px-3 py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {/* System fields */}
                {(SYSTEM_FIELDS[entity] || []).map((f, i) => (
                  <tr key={f.api_name} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                    <td className="px-3 py-2 font-500" style={{ color: 'var(--color-text-primary)' }}>{f.display}</td>
                    <td className="px-3 py-2 font-mono font-600" style={{ color: 'var(--color-brand)' }}>{f.api_name}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{f.type}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{f.note}</td>
                    <td className="px-3 py-2 text-center"><Lock size={11} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} /></td>
                  </tr>
                ))}

                {/* Custom fields */}
                {currentCustom.map((f, i) => (
                  editingId === f.id ? (
                    <tr key={f.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td colSpan={5} className="px-3 py-2">
                        <FieldForm onSubmit={handleEditField} onCancel={cancelField} submitLabel="Save" />
                      </td>
                    </tr>
                  ) : (
                    <tr key={f.id} style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-brand-50)' + '44' }}>
                      <td className="px-3 py-2 font-500" style={{ color: 'var(--color-text-primary)' }}>
                        <span className="text-[10px] font-700 mr-1.5 px-1.5 py-0.5 rounded" style={{ background: 'var(--color-brand)', color: '#fff' }}>custom</span>
                        {f.display}
                      </td>
                      <td className="px-3 py-2 font-mono font-600" style={{ color: 'var(--color-brand)' }}>{f.api_name}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{f.type}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{f.note}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => startEdit(f)}
                            className="p-1 rounded hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                            <Pencil size={12} />
                          </button>
                          <button type="button" onClick={() => handleDeleteField(f.id)}
                            className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {/* Add field form */}
          {addingField && (
            <div className="mt-3">
              <FieldForm onSubmit={handleAddField} onCancel={cancelField} submitLabel="Add field" />
            </div>
          )}

          {currentCustom.length === 0 && !addingField && (
            <p className="mt-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              No custom fields yet. Click <b>Add field</b> to define fields specific to your clinic.
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
