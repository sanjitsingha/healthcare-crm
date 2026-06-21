'use client'
import { useState } from 'react'
import { Key, Plus, Trash2, Eye, EyeOff, Check, Copy, Code2, ChevronDown } from 'lucide-react'
import { Button, Card, Switch } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import SectionHead from '@/components/crm/SectionHead'

const ENTITY_STYLE = {
  leads:         { bg: '#ede9fe', color: '#7c3aed' },
  patients:      { bg: '#dbeafe', color: '#1d4ed8' },
  consultations: { bg: '#dcfce7', color: '#15803d' },
}

export default function ApiAccessPanel() {
  const { org, orgId } = useOrg()
  const [localSettings, setLocalSettings] = useState(() => org?.settings || {})
  const [apiKeys, setApiKeys] = useState(() => localSettings.api_keys || [])
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ name: '', entity: 'leads', expiry_mode: 'never', expires_at: '' })
  const [keyBusy, setKeyBusy] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState(new Set())
  const [copiedSlot, setCopiedSlot] = useState('')
  const [showCode, setShowCode] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const persistKeys = async (updated) => {
    const merged = { ...localSettings, api_keys: updated }
    await updateOrganization(orgId, { settings: merged })
    setLocalSettings(merged)
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
      await persistKeys([...apiKeys, entry])
      setRevealedKeys(s => new Set([...s, entry.id]))
      setCreatingKey(false)
      setNewKeyForm({ name: '', entity: 'leads', expiry_mode: 'never', expires_at: '' })
      toast({ type: 'success', title: 'API key created — copy it now' })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setKeyBusy(false) }
  }

  const handleToggleKey = async (id) => persistKeys(apiKeys.map(k => k.id === id ? { ...k, active: !k.active } : k))

  const handleDeleteKey = async (id) => {
    const ok = await showConfirm({ title: 'Delete this API key?', message: 'Any integrations using it will stop working immediately.', confirmLabel: 'Delete' })
    if (!ok) return
    persistKeys(apiKeys.filter(k => k.id !== id))
  }

  const clip = async (text, slot) => {
    try { await navigator.clipboard.writeText(text); setCopiedSlot(slot); setTimeout(() => setCopiedSlot(''), 1500) } catch {}
  }
  const toggleReveal = (id) => setRevealedKeys(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

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

  return (
    <>
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

        {creatingKey && (
          <div className="mt-2 rounded-xl border border-(--color-border) p-4 space-y-3" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>New API key</p>
            <div className="space-y-1">
              <label className="block text-[10px] font-600" style={{ color: 'var(--color-text-muted)' }}>Key Name *</label>
              <input value={newKeyForm.name} onChange={e => setNewKeyForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Facebook Landing Page"
                className="w-full px-3 py-2 text-xs rounded-lg border border-(--color-border) outline-none"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
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

      {apiKeys.length === 0 && !creatingKey && (
        <div className="py-10 text-center rounded-xl border border-dashed border-(--color-border)">
          <Key size={26} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No API keys yet.</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Click <b>New API key</b> to get started.</p>
        </div>
      )}

      {apiKeys.map(k => {
        const isRevealed = revealedKeys.has(k.id)
        const isExpired = k.expires_at && new Date(k.expires_at) < new Date()
        const expiryLabel = k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Until deleted'
        const es = ENTITY_STYLE[k.entity] || ENTITY_STYLE.leads
        const maskedKey = k.key.slice(0, 9) + '•'.repeat(24)
        const code = codeExample(k)
        return (
          <Card key={k.id} className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{k.name}</p>
                <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: es.bg, color: es.color }}>
                  {k.entity.charAt(0).toUpperCase() + k.entity.slice(1)}
                </span>
                {isExpired && <span className="text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#dc2626' }}>Expired</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-600" style={{ color: k.active && !isExpired ? '#15803d' : 'var(--color-text-muted)' }}>
                  {k.active && !isExpired ? 'Active' : 'Inactive'}
                </span>
                <Switch checked={k.active && !isExpired} onChange={() => handleToggleKey(k.id)} />
                <button type="button" onClick={() => handleDeleteKey(k.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input readOnly value={isRevealed ? k.key : maskedKey}
                className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }} />
              <button type="button" onClick={() => toggleReveal(k.id)}
                className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button type="button" onClick={() => clip(k.key, k.id)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-(--color-border) text-xs font-600 transition-colors hover:bg-(--color-brand-50) shrink-0"
                style={{ color: copiedSlot === k.id ? '#15803d' : 'var(--color-text-muted)' }}>
                {copiedSlot === k.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>

            <div className="flex items-center gap-4 text-[11px] flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
              <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
              <span>·</span>
              <span>Expires: <b style={{ color: isExpired ? '#dc2626' : 'var(--color-text-secondary)' }}>{expiryLabel}</b></span>
              <span>·</span>
              <span>Endpoint: <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{origin}/api/public/leads</span></span>
            </div>

            <div className="rounded-lg border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
              <button type="button" onClick={() => setShowCode(v => v === k.id ? false : k.id)}
                className="w-full flex items-center justify-between px-3 py-2.5">
                <span className="text-xs font-600 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}><Code2 size={13} /> Code Example</span>
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
  )
}
