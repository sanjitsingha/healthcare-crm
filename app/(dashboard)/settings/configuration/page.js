'use client'
import { useState } from 'react'
import {
  Plug, Globe, Webhook, MessageCircle, BookOpen,
  Check, Copy, Trash2, Link2, RefreshCw, ChevronDown,
  Key, Eye, EyeOff, Code2, Lock, Plus,
  Settings2, Tag,
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

// ── Sub-menu items ─────────────────────────────────────────────
const TABS = [
  { id: 'integrations', label: 'Configuration', icon: Settings2 },
  { id: 'api-access',   label: 'API Access',    icon: Key },
  { id: 'api-names',    label: 'API Names',     icon: Tag },
  { id: 'messaging',    label: 'WhatsApp',      icon: MessageCircle },
]

// ── WhatsApp provider catalog (outbound) ───────────────────────
const WA_PROVIDERS = {
  wati: {
    label: 'WATI',
    hint: 'Find your API endpoint + access token in WATI → Settings → API Docs / Integrations.',
    fields: [
      { key: 'endpoint', label: 'API Endpoint', placeholder: 'https://live-server-xxxxx.wati.io' },
      { key: 'access_token', label: 'Access Token', secret: true },
    ],
  },
  interakt: {
    label: 'Interakt',
    hint: 'Interakt → Settings → Developer Settings → copy the Base64 Secret Key.',
    fields: [
      { key: 'api_key', label: 'API Key (Base64 secret)', secret: true },
    ],
  },
  msg91: {
    label: 'MSG91',
    hint: 'MSG91 → WhatsApp → your integrated number; Auth Key is under Settings → API.',
    fields: [
      { key: 'authkey', label: 'Auth Key', secret: true },
      { key: 'integrated_number', label: 'WhatsApp Number', placeholder: '15558xxxxxxx' },
    ],
  },
  custom: {
    label: 'Generic / Custom REST',
    hint: 'Any provider with a POST endpoint. Use {{to}}, {{text}}, {{template}}, {{params}} in the body template.',
    fields: [
      { key: 'url', label: 'POST URL', placeholder: 'https://api.yourprovider.com/messages' },
      { key: 'auth_header', label: 'Auth Header Name', placeholder: 'Authorization' },
      { key: 'auth_value', label: 'Auth Header Value', secret: true, placeholder: 'Bearer xxxxx' },
      { key: 'body_template', label: 'JSON Body Template', textarea: true, placeholder: '{"to":"{{to}}","template":"{{template}}","text":"{{text}}"}' },
    ],
  },
}

// WhatsApp status + technical request-preview helpers.
const WA_REQUIRED = { wati: ['endpoint', 'access_token'], interakt: ['api_key'], msg91: ['authkey', 'integrated_number'], custom: ['url'] }
function waReadyOf(wa) {
  const need = WA_REQUIRED[wa?.provider] || []
  return need.length > 0 && need.every((k) => String(wa?.[k] || '').trim())
}
function waEndpoint(wa) {
  switch (wa?.provider) {
    case 'wati':     return wa.endpoint ? `${String(wa.endpoint).replace(/\/+$/, '')}/api/v1/sendTemplateMessage` : '<endpoint>/api/v1/sendTemplateMessage'
    case 'interakt': return 'https://api.interakt.ai/v1/public/message/'
    case 'msg91':    return 'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/'
    case 'custom':   return wa.url || '<your endpoint>'
    default:         return '—'
  }
}
function waAuthLine(wa) {
  const mask = (s) => (s ? '••••' + String(s).slice(-4) : '••••••••')
  switch (wa?.provider) {
    case 'wati':     return `Authorization: Bearer ${mask(wa.access_token)}`
    case 'interakt': return `Authorization: Basic ${mask(wa.api_key)}`
    case 'msg91':    return `authkey: ${mask(wa.authkey)}`
    case 'custom':   return `${wa.auth_header || 'Authorization'}: ${mask(wa.auth_value)}`
    default:         return ''
  }
}

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
  const [apiKeys, setApiKeys]       = useState(() => localSettings.api_keys || [])
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ name: '', entity: 'leads', expiry_mode: 'never', expires_at: '' })
  const [keyBusy, setKeyBusy]       = useState(false)
  const [revealedKeys, setRevealedKeys] = useState(new Set())
  const [copiedSlot, setCopiedSlot]   = useState('')
  const [showCode, setShowCode]       = useState(false)

  // ── API Names state ──────────────────────────────────────────
  const [entity, setEntity]           = useState('leads')
  const [apiFieldsMap, setApiFieldsMap] = useState(() => localSettings.api_fields || {})
  const [addingField, setAddingField] = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [fieldForm, setFieldForm]     = useState({ display: '', api_name: '', type: 'text', note: '' })
  const [fieldBusy, setFieldBusy]     = useState(false)

  // ── WhatsApp messaging state ─────────────────────────────────
  const [wa, setWa]           = useState(() => localSettings.whatsapp || { provider: 'wati', enabled: false })
  const [waBusy, setWaBusy]   = useState(false)
  const [waReveal, setWaReveal] = useState(false)
  const [test, setTest]       = useState({ to: '', template: '', params: '', text: '' })
  const [testBusy, setTestBusy] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // ── Save helper — always merges into latest localSettings ────
  const saveSettings = async (patch) => {
    const updated = { ...localSettings, ...patch }
    await updateOrganization(orgId, { settings: updated })
    setLocalSettings(updated)
    return updated
  }

  // ── WhatsApp handlers ────────────────────────────────────────
  const setWaField = (key, val) => setWa((w) => ({ ...w, [key]: val }))

  const handleSaveWa = async () => {
    setWaBusy(true)
    try { await saveSettings({ whatsapp: wa }); toast({ type: 'success', title: 'WhatsApp settings saved' }) }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setWaBusy(false) }
  }

  const handleSendTest = async () => {
    if (!test.to.trim()) { toast({ type: 'error', title: 'Enter a recipient number' }); return }
    setTestBusy(true); setTestResult(null)
    try {
      await saveSettings({ whatsapp: wa }) // ensure latest creds are persisted before the test
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          to: test.to.trim(),
          templateName: test.template.trim() || undefined,
          params: test.params,
          text: test.text.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({ ok: false, error: 'Unreadable response' }))
      setTestResult(data)
      if (data.ok) toast({ type: 'success', title: 'Test message sent' })
    } catch (err) {
      setTestResult({ ok: false, error: err.message })
    } finally {
      setTestBusy(false)
    }
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
  const persistKeys = async (updated) => {
    await saveSettings({ api_keys: updated })
    setApiKeys(updated)
  }

  const handleCreateKey = async () => {
    if (!newKeyForm.name.trim()) { toast({ type: 'error', title: 'Enter a name for this key' }); return }
    setKeyBusy(true)
    try {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      const raw = 'hcrm_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
      const entry = {
        id: crypto.randomUUID(),
        name: newKeyForm.name.trim(),
        key: raw,
        entity: newKeyForm.entity,
        expires_at: newKeyForm.expiry_mode === 'never' ? null : newKeyForm.expires_at || null,
        active: true,
        created_at: new Date().toISOString(),
      }
      const updated = [...apiKeys, entry]
      await persistKeys(updated)
      setRevealedKeys(s => new Set([...s, entry.id]))
      setCreatingKey(false)
      setNewKeyForm({ name: '', entity: 'leads', expiry_mode: 'never', expires_at: '' })
      toast({ type: 'success', title: 'API key created — copy it now' })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setKeyBusy(false) }
  }

  const handleToggleKey = async (id) => {
    await persistKeys(apiKeys.map(k => k.id === id ? { ...k, active: !k.active } : k))
  }

  const handleDeleteKey = async (id) => {
    const ok = await showConfirm({ title: 'Delete this API key?', message: 'Any integrations using it will stop working immediately.', confirmLabel: 'Delete' })
    if (!ok) return
    persistKeys(apiKeys.filter(k => k.id !== id))
  }

  const clip = async (text, slot) => {
    try { await navigator.clipboard.writeText(text); setCopiedSlot(slot); setTimeout(() => setCopiedSlot(''), 1500) } catch {}
  }

  const toggleReveal = (id) => setRevealedKeys(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const codeExample = (k) =>
`fetch('${origin}/api/public/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ${k?.key || 'hcrm_your_api_key'}',
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
    <div className="flex -m-6 -mb-16 h-screen">
      {/* ── Left sub-menu — mirrors settings sidenav ─────────── */}
      <aside className="w-52 shrink-0 border-r border-(--color-border) h-full flex flex-col p-4"
        style={{ background: 'var(--color-surface)' }}>
        <div className="mb-6">
          <h2 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Integrations</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Connect &amp; configure</p>
        </div>
        <nav className="space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all hover:bg-(--color-brand-50)"
              style={tab === id
                ? { background: 'var(--color-brand)', color: 'white' }
                : { color: 'var(--color-text-secondary)' }}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Content area ────────────────────────────────────── */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto p-6 pb-16 space-y-4">

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
        <>
          {/* ── Header ─────────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <SectionHead icon={Key} title="API Access" description="Create named API keys for your landing pages and custom integrations" />
              {!creatingKey && (
                <button type="button" onClick={() => setCreatingKey(true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 border border-(--color-border) hover:bg-(--color-brand-50) transition-colors"
                  style={{ color: 'var(--color-brand)' }}>
                  <Plus size={13} /> New API key
                </button>
              )}
            </div>

            {/* ── Create-key form ──────────────────────────────── */}
            {creatingKey && (
              <div className="mt-2 rounded-xl border border-(--color-border) p-4 space-y-3" style={{ background: 'var(--color-surface-2)' }}>
                <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>New API key</p>

                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Key Name *</label>
                  <input value={newKeyForm.name} onChange={e => setNewKeyForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Facebook Landing Page"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-(--color-border) outline-none"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Entity */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>For which page?</label>
                    <select value={newKeyForm.entity} onChange={e => setNewKeyForm(f => ({ ...f, entity: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      <option value="leads">Leads</option>
                      <option value="patients">Patients</option>
                      <option value="consultations">Consultations</option>
                    </select>
                  </div>

                  {/* Expiry */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Expiry</label>
                    <select value={newKeyForm.expiry_mode} onChange={e => setNewKeyForm(f => ({ ...f, expiry_mode: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                      <option value="never">Until deleted</option>
                      <option value="date">Custom date</option>
                    </select>
                  </div>
                </div>

                {newKeyForm.expiry_mode === 'date' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Expiry Date</label>
                    <input type="date" value={newKeyForm.expires_at} onChange={e => setNewKeyForm(f => ({ ...f, expires_at: e.target.value }))}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="secondary" size="sm" type="button" onClick={() => { setCreatingKey(false); setNewKeyForm({ name: '', entity: 'leads', expiry_mode: 'never', expires_at: '' }) }}>Cancel</Button>
                  <Button size="sm" type="button" onClick={handleCreateKey} disabled={keyBusy || !newKeyForm.name.trim()}>
                    {keyBusy ? 'Generating…' : 'Generate & save'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* ── Key cards ───────────────────────────────────────── */}
          {apiKeys.length === 0 && !creatingKey && (
            <div className="py-10 text-center rounded-xl border border-dashed border-(--color-border)">
              <Key size={26} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No API keys yet.</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Click <b>New API key</b> to get started.</p>
            </div>
          )}

          {apiKeys.map(k => {
            const isRevealed   = revealedKeys.has(k.id)
            const isExpired    = k.expires_at && new Date(k.expires_at) < new Date()
            const expiryLabel  = k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Until deleted'
            const ENTITY_STYLE = {
              leads:         { bg: '#ede9fe', color: '#7c3aed' },
              patients:      { bg: '#dbeafe', color: '#1d4ed8' },
              consultations: { bg: '#dcfce7', color: '#15803d' },
            }
            const es = ENTITY_STYLE[k.entity] || ENTITY_STYLE.leads
            const maskedKey = k.key.slice(0, 9) + '•'.repeat(24)
            const code = codeExample(k)

            return (
              <Card key={k.id} className="p-5 space-y-3">
                {/* Row 1 — name + badges + toggle */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{k.name}</p>
                    <span className="text-[10px] font-700 px-2 py-0.5 rounded-full"
                      style={{ background: es.bg, color: es.color }}>
                      {k.entity.charAt(0).toUpperCase() + k.entity.slice(1)}
                    </span>
                    {isExpired && (
                      <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#dc2626' }}>Expired</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-600" style={{ color: k.active && !isExpired ? '#15803d' : 'var(--color-text-muted)' }}>
                      {k.active && !isExpired ? 'Active' : 'Inactive'}
                    </span>
                    <Switch checked={k.active && !isExpired} onChange={() => handleToggleKey(k.id)} />
                    <button type="button" onClick={() => handleDeleteKey(k.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Row 2 — key value */}
                <div className="flex items-center gap-2">
                  <input readOnly value={isRevealed ? k.key : maskedKey}
                    className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }} />
                  <button type="button" onClick={() => toggleReveal(k.id)}
                    className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button type="button" onClick={() => clip(k.key, k.id)}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-(--color-border) text-xs font-600 transition-colors hover:bg-(--color-brand-50) shrink-0"
                    style={{ color: copiedSlot === k.id ? '#15803d' : 'var(--color-text-muted)' }}>
                    {copiedSlot === k.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>

                {/* Row 3 — meta */}
                <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>Expires: <b style={{ color: isExpired ? '#dc2626' : 'var(--color-text-secondary)' }}>{expiryLabel}</b></span>
                  <span>·</span>
                  <span>Endpoint: <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{origin}/api/public/leads</span></span>
                </div>

                {/* Code example (collapsible per key) */}
                <div className="rounded-lg border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                  <button type="button" onClick={() => setShowCode(v => v === k.id ? false : k.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-600 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                      <Code2 size={13} /> Code Example
                    </span>
                    <ChevronDown size={15} style={{ color: 'var(--color-text-muted)', transform: showCode === k.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                  </button>
                  {showCode === k.id && (
                    <div className="border-t border-(--color-border) relative">
                      <button type="button" onClick={() => clip(code, `code-${k.id}`)}
                        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                        style={{ color: copiedSlot === `code-${k.id}` ? '#15803d' : 'var(--color-text-muted)', background: 'var(--color-surface)' }}>
                        {copiedSlot === `code-${k.id}` ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                      </button>
                      <pre className="px-4 py-3 text-[11px] font-mono overflow-x-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)' }}>
                        {code}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </>
      )}

      {/* ── Tab: API Names ───────────────────────────────────── */}
      {tab === 'api-names' && (() => {
        // Merge all custom fields from all entities — deduplicated by api_name
        const allCustom = Object.values(apiFieldsMap)
          .flat()
          .filter((f, i, arr) => arr.findIndex(x => x.api_name === f.api_name) === i)

        const systemRows = SYSTEM_FIELDS[entity] || []

        return (
          <Card className="p-5">
            <SectionHead icon={Lock} title="API Names"
              description="Use these field names when sending data via the public API. Custom fields are shared across all pages." />

            {/* Dropdown entity selector */}
            <div className="flex items-center gap-3 mb-4">
              <label className="text-xs font-600 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Select page</label>
              <select value={entity} onChange={e => setEntity(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', minWidth: 200 }}>
                {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {systemRows.length} system field{systemRows.length !== 1 ? 's' : ''}
                {allCustom.length > 0 && ` · ${allCustom.length} custom field${allCustom.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Fields table */}
            <div className="rounded-lg border border-(--color-border) overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <th className="px-3 py-2.5 text-left font-600 w-48" style={{ color: 'var(--color-text-muted)' }}>Display Name</th>
                    <th className="px-3 py-2.5 text-left font-600 w-44" style={{ color: 'var(--color-text-muted)' }}>API Name</th>
                    <th className="px-3 py-2.5 text-left font-600 w-24" style={{ color: 'var(--color-text-muted)' }}>Type</th>
                    <th className="px-3 py-2.5 text-left font-600" style={{ color: 'var(--color-text-muted)' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {systemRows.map((f, i) => (
                    <tr key={f.api_name} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                      <td className="px-3 py-2.5 font-500" style={{ color: 'var(--color-text-primary)' }}>{f.display}</td>
                      <td className="px-3 py-2.5 font-mono font-600" style={{ color: 'var(--color-brand)' }}>{f.api_name}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{f.type}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{f.note}</td>
                    </tr>
                  ))}

                  {allCustom.length > 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-1.5" style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                        <span className="text-[10px] font-700 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Custom fields — available on all pages</span>
                      </td>
                    </tr>
                  )}

                  {allCustom.map(f => (
                    <tr key={f.api_name} style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-brand-50)' + '33' }}>
                      <td className="px-3 py-2.5 font-500" style={{ color: 'var(--color-text-primary)' }}>{f.display}</td>
                      <td className="px-3 py-2.5 font-mono font-600" style={{ color: 'var(--color-brand)' }}>{f.api_name}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{f.type}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{f.note || 'Stored in custom_data'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {allCustom.length === 0 && (
              <p className="mt-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                No custom fields yet. Custom fields added anywhere in the CRM will appear here automatically.
              </p>
            )}
          </Card>
        )
      })()}

      {/* ── Tab: WhatsApp ────────────────────────────────────── */}
      {tab === 'messaging' && (() => {
        const waDef = WA_PROVIDERS[wa.provider] || WA_PROVIDERS.wati
        const waReady = waReadyOf(wa)
        const status = wa.enabled && waReady
          ? { label: 'CONNECTED', dot: '#22c55e', color: '#15803d', bg: '#dcfce7' }
          : waReady
            ? { label: 'READY · DISABLED', dot: '#f59e0b', color: '#b45309', bg: '#fef3c7' }
            : { label: 'NOT CONFIGURED', dot: '#94a3b8', color: '#64748b', bg: 'var(--color-surface-2)' }
        return (
          <Card className="p-0 overflow-hidden">
            {/* Console header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#dcfce7' }}>
                  <MessageCircle size={15} style={{ color: '#15803d' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-700 leading-tight" style={{ color: 'var(--color-text-primary)' }}>WhatsApp Gateway</p>
                  <p className="text-[11px] font-mono leading-tight truncate" style={{ color: 'var(--color-text-muted)' }}>provider: {wa.provider || 'wati'}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-800 px-2 py-1 rounded-full tracking-wider shrink-0"
                style={{ background: status.bg, color: status.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
                {status.label}
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Controls row: provider + reveal + enable + save */}
              <div className="flex items-center gap-2 flex-wrap">
                <select value={wa.provider || 'wati'} onChange={(e) => setWa((w) => ({ ...w, provider: e.target.value }))}
                  className="px-2.5 py-1.5 rounded-lg border text-xs font-600 outline-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                  {Object.entries(WA_PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button type="button" onClick={() => setWaReveal((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-(--color-border) text-[11px] font-600 hover:bg-(--color-surface-2) transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}>
                  {waReveal ? <EyeOff size={12} /> : <Eye size={12} />}{waReveal ? 'Hide' : 'Reveal'} secrets
                </button>
                <div className="flex-1" />
                <label className="inline-flex items-center gap-2 text-[11px] font-600" style={{ color: 'var(--color-text-muted)' }}>
                  Enabled
                  <Switch checked={!!wa.enabled} onChange={() => setWa((w) => ({ ...w, enabled: !w.enabled }))} />
                </label>
                <Button size="sm" onClick={handleSaveWa} disabled={waBusy}>{waBusy ? 'Saving…' : 'Save'}</Button>
              </div>

              {/* Credentials — env-style key/value rows */}
              <div className="rounded-lg border border-(--color-border) divide-y divide-(--color-border) overflow-hidden">
                {(waDef.fields || []).map((f) => (
                  <div key={f.key} className="flex items-stretch" style={{ background: 'var(--color-surface)' }}>
                    <div className="w-40 shrink-0 flex items-center gap-1 px-3 py-2 border-r border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                      <code className="text-[11px] font-700" style={{ color: 'var(--color-brand)' }}>{f.key}</code>
                      {(WA_REQUIRED[wa.provider] || []).includes(f.key) && <span style={{ color: '#dc2626' }}>*</span>}
                    </div>
                    {f.textarea ? (
                      <textarea value={wa[f.key] || ''} onChange={(e) => setWaField(f.key, e.target.value)} placeholder={f.placeholder} rows={2}
                        className="flex-1 px-3 py-2 text-[11px] font-mono outline-none resize-y bg-transparent"
                        style={{ color: 'var(--color-text-primary)' }} />
                    ) : (
                      <input type={f.secret && !waReveal ? 'password' : 'text'} value={wa[f.key] || ''}
                        onChange={(e) => setWaField(f.key, e.target.value)} placeholder={f.placeholder}
                        className="flex-1 px-3 py-2 text-[11px] font-mono outline-none bg-transparent"
                        style={{ color: 'var(--color-text-primary)' }} />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] -mt-1" style={{ color: 'var(--color-text-muted)' }}>{waDef.hint}</p>

              {/* Request preview — terminal block */}
              <div className="rounded-lg overflow-hidden border border-(--color-border) text-[11px]" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: '#1e293b' }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
                  <span className="ml-2 text-[10px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>outbound request</span>
                </div>
                <div className="px-3 py-2.5 space-y-1 overflow-x-auto" style={{ background: '#0f172a' }}>
                  <div style={{ color: '#e2e8f0' }}><span style={{ color: '#38bdf8' }}>POST</span> {waEndpoint(wa)}</div>
                  <div style={{ color: '#94a3b8' }}>{waAuthLine(wa)}</div>
                  <div style={{ color: '#64748b' }}>Content-Type: application/json</div>
                </div>
              </div>

              {/* Compact inline test */}
              <div className="pt-3 border-t border-(--color-border)">
                <p className="text-[10px] font-700 uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Test send</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input value={test.to} onChange={(e) => setTest((t) => ({ ...t, to: e.target.value }))} placeholder="+9198xxxxxxxx"
                    className="w-40 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  <input value={test.template} onChange={(e) => setTest((t) => ({ ...t, template: e.target.value }))} placeholder="template_name"
                    className="flex-1 min-w-32 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  <input value={test.params} onChange={(e) => setTest((t) => ({ ...t, params: e.target.value }))} placeholder="var1, var2"
                    className="flex-1 min-w-28 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                  <Button size="sm" onClick={handleSendTest} disabled={testBusy}>{testBusy ? '…' : 'Send'}</Button>
                </div>

                {testResult && (
                  <div className="mt-2 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1 font-700 px-1.5 py-0.5 rounded"
                      style={{ background: testResult.ok ? '#dcfce7' : '#fee2e2', color: testResult.ok ? '#15803d' : '#b91c1c' }}>
                      {testResult.ok ? '✓ 200' : `✗ ${testResult.status || 'ERR'}`}
                    </span>
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>response</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all px-2.5 py-2 rounded-lg" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                        {JSON.stringify(testResult.response ?? testResult.error ?? testResult, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })()}
      </div>
    </div>
  )
}
