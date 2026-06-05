'use client'
import { useState } from 'react'
import {
  Plug, FileText, Globe, Webhook, Zap, MessageCircle, Megaphone,
  Check, X, Copy, Trash2, ToggleLeft, ToggleRight, Link2, RefreshCw,
} from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'

// ── Provider catalog ───────────────────────────────────────────
// Each provider defines the config fields it needs.
// field.kind: 'generated' = read-only auto webhook URL (copyable),
//             'text' / 'secret' = user-entered.
const PROVIDERS = [
  {
    type: 'google_forms',
    name: 'Google Forms',
    description: 'Capture leads from Google Form submissions via Apps Script.',
    icon: FileText,
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
    icon: Megaphone,
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
    icon: Zap,
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
  const [showGuide, setShowGuide] = useState(false)

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
          <button type="button" onClick={() => onToggle(integration.id)} title={integration.enabled ? 'Pause' : 'Activate'}
            style={{ color: integration.enabled ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>
            {integration.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          </button>
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

        {integration.type === 'google_forms' && (() => {
          const url = integration.config?.webhook_url || 'YOUR_WEBHOOK_URL'
          const secret = integration.config?.secret
          const postUrl = secret ? `${url}?secret=${encodeURIComponent(secret)}` : url
          const script = `function onFormSubmit(e) {
  var url = "${postUrl}";
  var fields = {};
  var answers = e.response.getItemResponses();
  for (var i = 0; i < answers.length; i++) {
    fields[answers[i].getItem().getTitle()] = answers[i].getResponse();
  }
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true
  });
}`
          return (
            <div className="rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
              <button type="button" onClick={() => setShowGuide(g => !g)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-600"
                style={{ color: 'var(--color-text-primary)' }}>
                <span className="flex items-center gap-1.5"><FileText size={13} /> Setup guide (Apps Script)</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{showGuide ? 'Hide' : 'Show'}</span>
              </button>
              {showGuide && (
                <div className="px-3 pb-3 space-y-2.5 border-t border-(--color-border) pt-2.5">
                  <ol className="text-xs space-y-1.5 list-decimal pl-4" style={{ color: 'var(--color-text-secondary)' }}>
                    <li>Open your Google Form → <b>⋮ menu</b> → <b>Apps Script</b>.</li>
                    <li>Delete any sample code, paste the script below, and <b>Save</b>.</li>
                    <li>Click the <b>clock</b> icon (Triggers) → <b>Add Trigger</b>.</li>
                    <li>Choose function <b>onFormSubmit</b>, event source <b>From form</b>, event type <b>On form submit</b> → <b>Save</b> (authorize when prompted).</li>
                    <li>Submit a test response — a new lead appears in your CRM.</li>
                  </ol>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    Tip: name your form questions <b>Name</b>, <b>Phone</b>, <b>Email</b> so they map automatically. Anything else is saved on the lead too.
                  </p>
                  <div className="relative">
                    <pre className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto whitespace-pre"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>{script}</pre>
                    <button type="button" onClick={() => copy(script, 'script')}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md border border-(--color-border) text-[11px] font-600"
                      style={{ background: 'var(--color-surface)', color: copied === 'script' ? '#15803d' : 'var(--color-text-muted)' }}>
                      {copied === 'script' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        <div className="flex justify-end gap-2 pt-1">
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
