'use client'
import { useState } from 'react'
import {
  Plug, Globe, Webhook, MessageCircle, BookOpen,
  Check, Copy, Trash2, Link2, RefreshCw, ChevronDown,
  Settings2, Eye, EyeOff,
} from 'lucide-react'
import { Button, Card, Input, Switch } from '@/components/ui'
import { GoogleFormsLogo, MetaLogo, ZapierLogo } from '@/components/crm/BrandLogos'
import SectionHead from '@/components/crm/SectionHead'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization, getOrganization } from '@/lib/supabase/queries'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'

// ── Provider catalog ───────────────────────────────────────────
const PROVIDERS = [
  {
    type: 'google_forms', name: 'Google Forms',
    description: 'Capture leads from Google Form submissions via Apps Script.',
    icon: GoogleFormsLogo, color: '#7c3aed',
    fields: [
      { key: 'webhook_url', label: 'Inbound Webhook URL', kind: 'generated' },
      { key: 'secret',      label: 'Shared Secret',        kind: 'secret', placeholder: 'Optional verification token' },
    ],
  },
  {
    type: 'wordpress', name: 'WordPress Forms',
    description: 'Contact Form 7, WPForms, or Elementor — forward entries to the CRM.',
    icon: Globe, color: '#0ea5e9',
    fields: [
      { key: 'webhook_url', label: 'Inbound Webhook URL', kind: 'generated' },
      { key: 'site_url',    label: 'WordPress Site URL',   kind: 'text', placeholder: 'https://yourclinic.com' },
      { key: 'secret',      label: 'Shared Secret',        kind: 'secret', placeholder: 'Optional verification token' },
    ],
  },
  {
    type: 'meta_lead_ads', name: 'Meta Lead Ads',
    description: 'Facebook & Instagram lead-gen forms push leads in real time.',
    icon: MetaLogo, color: '#1d4ed8',
    fields: [
      { key: 'page_access_token', label: 'Page Access Token', kind: 'secret', placeholder: 'EAAB...' },
      { key: 'form_id',           label: 'Lead Form ID',      kind: 'text', placeholder: '1234567890' },
      { key: 'verify_token',      label: 'Verify Token',      kind: 'text', placeholder: 'A token you choose' },
    ],
  },
  {
    type: 'webhook', name: 'Generic Webhook',
    description: 'Any service that can POST JSON — get a URL to send leads to.',
    icon: Webhook, color: '#10b981',
    fields: [
      { key: 'webhook_url', label: 'Inbound Webhook URL', kind: 'generated' },
      { key: 'secret',      label: 'Shared Secret',        kind: 'secret', placeholder: 'Optional verification token' },
    ],
  },
  {
    type: 'zapier', name: 'Zapier',
    description: 'Connect 6,000+ apps. Use the webhook URL as a Zap action.',
    icon: ZapierLogo, color: '#f59e0b',
    fields: [
      { key: 'webhook_url', label: 'Inbound Webhook URL', kind: 'generated' },
      { key: 'api_key',     label: 'API Key',              kind: 'secret', placeholder: 'Optional' },
    ],
  },
  {
    type: 'whatsapp', name: 'WhatsApp Business',
    description: 'Capture inbound WhatsApp enquiries as leads.',
    icon: MessageCircle, color: '#15803d',
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', kind: 'text', placeholder: '1234567890' },
      { key: 'access_token',    label: 'Access Token',     kind: 'secret', placeholder: 'EAAB...' },
    ],
  },
]

const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map(p => [p.type, p]))

const DOCS_ANCHOR = {
  google_forms: 'google-forms', wordpress: 'wordpress', meta_lead_ads: 'integrations',
  zapier: 'integrations', webhook: 'integrations', whatsapp: 'integrations',
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

const TABS = [
  { id: 'integrations', label: 'Configuration', icon: Settings2 },
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
    fields: [{ key: 'api_key', label: 'API Key (Base64 secret)', secret: true }],
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

const genToken = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '')

// ── Field combobox (webhook field mapping) ─────────────────────
function FieldCombobox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const q = (value || '').toLowerCase()
  const filtered = (options || []).filter(o => o.toLowerCase().includes(q))
  const list = filtered.length ? filtered : (options || [])
  return (
    <div className="relative flex-1 min-w-0">
      <input value={value} placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full px-2 py-1.5 pr-7 text-xs rounded-lg border border-(--color-border) outline-none"
        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
      {open && list.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-(--color-border) shadow-lg" style={{ background: 'var(--color-surface)' }}>
          {list.map(o => (
            <button key={o} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(o); setOpen(false) }}
              className="block w-full text-left px-2.5 py-1.5 text-xs hover:bg-(--color-brand-50)" style={{ color: 'var(--color-text-primary)' }}>
              {o}
            </button>
          ))}
        </div>
      )}
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
              style={integration.enabled ? { background: '#dcfce7', color: '#15803d' } : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              {integration.enabled ? 'Active' : 'Paused'}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{provider.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Switch checked={integration.enabled} onChange={() => onToggle(integration.id)} title={integration.enabled ? 'Pause' : 'Activate'} />
          <button type="button" onClick={() => onRemove(integration.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
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
                  <input readOnly value={val} className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
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
            <button type="button" onClick={() => setMapOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2.5">
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
                        <FieldCombobox value={row.form_field} onChange={v => setMapRow(i, { form_field: v })} options={detected} placeholder="Form question" />
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
  const [localSettings, setLocalSettings] = useState(() => org?.settings || {})
  const [tab, setTab] = useState('integrations')

  // Integrations
  const [integrations, setIntegrations] = useState(() => localSettings.integrations || [])
  const [busy, setBusy] = useState(false)

  // WhatsApp
  const [wa, setWa]           = useState(() => localSettings.whatsapp || { provider: 'wati', enabled: false })
  const [waBusy, setWaBusy]   = useState(false)
  const [waReveal, setWaReveal] = useState(false)
  const [test, setTest]       = useState({ to: '', template: '', params: '', text: '' })
  const [testBusy, setTestBusy] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const saveSettings = async (patch) => {
    const updated = { ...localSettings, ...patch }
    await updateOrganization(orgId, { settings: updated })
    setLocalSettings(updated)
    return updated
  }

  // ── Integrations handlers ────────────────────────────────────
  const persist = async (updated) => {
    setBusy(true)
    try { await saveSettings({ integrations: updated }); setIntegrations(updated) }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setBusy(false) }
  }
  const connectedTypes = new Set(integrations.map(i => i.type))
  const available = PROVIDERS.filter(p => !connectedTypes.has(p.type))
  const handleConnect = async (provider) => {
    const token = genToken()
    const config = {}
    provider.fields.forEach(f => { config[f.key] = f.kind === 'generated' ? `${origin}/api/webhooks/${provider.type}/${token}` : '' })
    await persist([...integrations, { id: crypto.randomUUID(), type: provider.type, token, enabled: true, config, created_at: new Date().toISOString() }])
  }
  const handleSaveConfig = async (id, values) => persist(integrations.map(i => i.id === id ? { ...i, config: { ...i.config, ...values } } : i))
  const handleToggle     = async (id) => persist(integrations.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i))
  const handleRemove     = async (id) => {
    const ok = await showConfirm({ title: 'Remove this integration?', message: 'The webhook URL will stop working.', confirmLabel: 'Remove' })
    if (!ok) return
    persist(integrations.filter(i => i.id !== id))
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
      await saveSettings({ whatsapp: wa })
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, to: test.to.trim(), templateName: test.template.trim() || undefined, params: test.params, text: test.text.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({ ok: false, error: 'Unreadable response' }))
      setTestResult(data)
      if (data.ok) toast({ type: 'success', title: 'Test message sent' })
    } catch (err) { setTestResult({ ok: false, error: err.message }) }
    finally { setTestBusy(false) }
  }

  return (
    <div className="flex -m-6 -mb-16 h-screen">
      {/* Left sub-menu */}
      <aside className="w-52 shrink-0 border-r border-(--color-border) h-full flex flex-col p-4" style={{ background: 'var(--color-surface)' }}>
        <div className="mb-6">
          <h2 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Integrations</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Connect &amp; configure</p>
        </div>
        <nav className="space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all hover:bg-(--color-brand-50)"
              style={tab === id ? { background: 'var(--color-brand)', color: 'white' } : { color: 'var(--color-text-secondary)' }}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto p-6 pb-16 space-y-4">

        {/* Configuration tab */}
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

        {/* WhatsApp tab */}
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
                <span className="inline-flex items-center gap-1.5 text-[10px] font-800 px-2 py-1 rounded-full tracking-wider shrink-0" style={{ background: status.bg, color: status.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
                  {status.label}
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={wa.provider || 'wati'} onChange={(e) => setWa((w) => ({ ...w, provider: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-lg border text-xs font-600 outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                    {Object.entries(WA_PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button type="button" onClick={() => setWaReveal((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-(--color-border) text-[11px] font-600 hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                    {waReveal ? <EyeOff size={12} /> : <Eye size={12} />}{waReveal ? 'Hide' : 'Reveal'} secrets
                  </button>
                  <div className="flex-1" />
                  <label className="inline-flex items-center gap-2 text-[11px] font-600" style={{ color: 'var(--color-text-muted)' }}>
                    Enabled
                    <Switch checked={!!wa.enabled} onChange={() => setWa((w) => ({ ...w, enabled: !w.enabled }))} />
                  </label>
                  <Button size="sm" onClick={handleSaveWa} disabled={waBusy}>{waBusy ? 'Saving…' : 'Save'}</Button>
                </div>

                <div className="rounded-lg border border-(--color-border) divide-y divide-(--color-border) overflow-hidden">
                  {(waDef.fields || []).map((f) => (
                    <div key={f.key} className="flex items-stretch" style={{ background: 'var(--color-surface)' }}>
                      <div className="w-40 shrink-0 flex items-center gap-1 px-3 py-2 border-r border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                        <code className="text-[11px] font-700" style={{ color: 'var(--color-brand)' }}>{f.key}</code>
                        {(WA_REQUIRED[wa.provider] || []).includes(f.key) && <span style={{ color: '#dc2626' }}>*</span>}
                      </div>
                      {f.textarea ? (
                        <textarea value={wa[f.key] || ''} onChange={(e) => setWaField(f.key, e.target.value)} placeholder={f.placeholder} rows={2}
                          className="flex-1 px-3 py-2 text-[11px] font-mono outline-none resize-y bg-transparent" style={{ color: 'var(--color-text-primary)' }} />
                      ) : (
                        <input type={f.secret && !waReveal ? 'password' : 'text'} value={wa[f.key] || ''}
                          onChange={(e) => setWaField(f.key, e.target.value)} placeholder={f.placeholder}
                          className="flex-1 px-3 py-2 text-[11px] font-mono outline-none bg-transparent" style={{ color: 'var(--color-text-primary)' }} />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] -mt-1" style={{ color: 'var(--color-text-muted)' }}>{waDef.hint}</p>

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

                <div className="pt-3 border-t border-(--color-border)">
                  <p className="text-[10px] font-700 uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Test send</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input value={test.to} onChange={(e) => setTest((t) => ({ ...t, to: e.target.value }))} placeholder="+9198xxxxxxxx"
                      className="w-40 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                    <input value={test.template} onChange={(e) => setTest((t) => ({ ...t, template: e.target.value }))} placeholder="template_name"
                      className="flex-1 min-w-32 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                    <input value={test.params} onChange={(e) => setTest((t) => ({ ...t, params: e.target.value }))} placeholder="var1, var2"
                      className="flex-1 min-w-28 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono outline-none" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
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
