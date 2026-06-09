'use client'
import { useState } from 'react'
import {
  Plug, Globe, Webhook, MessageCircle, BookOpen,
  Check, X, Copy, Trash2, Link2, RefreshCw, ChevronDown,
} from 'lucide-react'
import { Button, Card, Input, Switch } from '@/components/ui'
import { GoogleFormsLogo, MetaLogo, ZapierLogo } from '@/components/crm/BrandLogos'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization, getOrganization } from '@/lib/supabase/queries'

// ── Provider catalog ───────────────────────────────────────────
// Each provider defines the config fields it needs.
// field.kind: 'generated' = read-only auto webhook URL (copyable),
//             'text' / 'secret' = user-entered.
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

// Per-provider docs section anchors on /docs.
const DOCS_ANCHOR = {
  google_forms:  'google-forms',
  wordpress:     'wordpress',
  meta_lead_ads: 'integrations',
  zapier:        'integrations',
  webhook:       'integrations',
  whatsapp:      'integrations',
}

// Lead fields a form question can be mapped to (used by the field-mapping editor).
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

// Combobox: type freely, or pick from detected form fields in a styled dropdown.
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
            <button
              key={o}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(o); setOpen(false) }}
              className="block w-full text-left px-2.5 py-1.5 text-xs hover:bg-(--color-brand-50)"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function genToken() {
  return (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '')
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
  const [editing, setEditing] = useState(false)
  const [values,  setValues]  = useState({ ...integration.config })
  const [saving,  setSaving]  = useState(false)
  const [copied,  setCopied]  = useState('')
  const { orgId } = useOrg()
  const [mapRows, setMapRows] = useState(() => integration.config?.field_map || [])
  const [savingMap, setSavingMap] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [liveDetected, setLiveDetected] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const detected = liveDetected ?? (integration.config?.detected_fields || [])

  const addMapRow    = () => setMapRows(r => [...r, { form_field: '', lead_field: '' }])
  const setMapRow    = (i, p) => setMapRows(r => r.map((x, idx) => idx === i ? { ...x, ...p } : x))
  const removeMapRow = (i) => setMapRows(r => r.filter((_, idx) => idx !== i))
  const saveMap = async () => {
    setSavingMap(true)
    try { await onSave(integration.id, { field_map: mapRows.filter(r => r.form_field && r.lead_field) }) }
    catch (err) { alert(err.message) }
    finally { setSavingMap(false) }
  }
  // Pull the latest detected form fields from the DB (no full page reload).
  const refreshFields = async () => {
    setRefreshing(true)
    try {
      const o = await getOrganization(orgId)
      const integ = (o?.settings?.integrations || []).find(i => i.id === integration.id)
      setLiveDetected(integ?.config?.detected_fields || [])
    } catch (err) { alert(err.message) }
    finally { setRefreshing(false) }
  }

  if (!provider) return null
  const Icon = provider.icon

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch {}
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(integration.id, values); setEditing(false) }
    catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: provider.color + '18' }}>
          <Icon size={18} style={{ color: provider.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{provider.name}</p>
            <span
              className="text-[10px] font-700 px-2 py-0.5 rounded-full"
              style={integration.enabled
                ? { background: '#dcfce7', color: '#15803d' }
                : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            >
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

      {/* Config */}
      <div className="border-t border-(--color-border) p-4 space-y-3" style={{ background: 'var(--color-surface-2)' }}>
        {provider.fields.map(field => {
          const val = (editing ? values[field.key] : integration.config?.[field.key]) || ''

          if (field.kind === 'generated') {
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>{field.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={val}
                    className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
                  />
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
            <Input
              key={field.key}
              label={field.label}
              type={field.kind === 'secret' ? 'password' : 'text'}
              placeholder={field.placeholder}
              value={values[field.key] || ''}
              onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
            />
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
                        <FieldCombobox
                          value={row.form_field}
                          onChange={v => setMapRow(i, { form_field: v })}
                          options={detected}
                          placeholder="Form question"
                        />
                        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>→</span>
                        <select
                          value={row.lead_field}
                          onChange={e => setMapRow(i, { lead_field: e.target.value })}
                          className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
                        >
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
                    No fields detected yet. Submit the form once (or use the plugin’s “Send test lead”), then click <b>Refresh fields</b>.
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
  const [integrations, setIntegrations] = useState(() => org?.settings?.integrations || [])
  const [busy, setBusy] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const persist = async (updated) => {
    setBusy(true)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), integrations: updated } })
      setIntegrations(updated)
    } catch (err) { alert(err.message) }
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
    const integration = {
      id: crypto.randomUUID(),
      type: provider.type,
      token,
      enabled: true,
      config,
      created_at: new Date().toISOString(),
    }
    await persist([...integrations, integration])
  }

  const handleSaveConfig = async (id, values) => {
    await persist(integrations.map(i => i.id === id ? { ...i, config: { ...i.config, ...values } } : i))
  }

  const handleToggle = async (id) => {
    await persist(integrations.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i))
  }

  const handleRemove = async (id) => {
    if (!confirm('Remove this integration? The webhook URL will stop working.')) return
    await persist(integrations.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Connected */}
      <Card className="p-5">
        <SectionHead
          icon={Plug}
          title="Connected Integrations"
          description="Third-party services that capture leads into your CRM"
        />

        {integrations.length === 0 ? (
          <div className="py-10 text-center border border-dashed rounded-xl border-(--color-border)">
            <Plug size={26} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No integrations connected yet.</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Pick one below to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map(i => (
              <IntegrationCard
                key={i.id}
                integration={i}
                onSave={handleSaveConfig}
                onToggle={handleToggle}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Available */}
      {available.length > 0 && (
        <Card className="p-5">
          <SectionHead
            icon={Link2}
            title="Available Integrations"
            description="Connect a new lead source or third-party tool"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {available.map(provider => {
              const Icon = provider.icon
              return (
                <div
                  key={provider.type}
                  className="flex items-center gap-3 p-4 rounded-xl border border-(--color-border)"
                  style={{ background: 'var(--color-surface)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: provider.color + '18' }}>
                    <Icon size={18} style={{ color: provider.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{provider.name}</p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{provider.description}</p>
                  </div>
                  <Button size="sm" variant="secondary" type="button" disabled={busy} onClick={() => handleConnect(provider)} className="shrink-0">
                    Connect
                  </Button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Note */}
      <div className="flex gap-2.5 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' + '30' }}>
        <RefreshCw size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Copy the generated webhook URL into your external form or service. Incoming submissions will be created as new leads.
          <span className="font-600"> The receiving endpoint is being set up</span> — configuration is saved and ready to connect.
        </p>
      </div>
    </div>
  )
}
