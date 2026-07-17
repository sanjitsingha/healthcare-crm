'use client'
import { useEffect, useState } from 'react'
import { Sparkles, CheckCircle2, ExternalLink, Trash2 } from 'lucide-react'
import { Button, Card, Input, Select, Textarea, Switch, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'

// Settings → Zeo AI. Configure the org's bring-your-own-key AI assistant.
export default function ZeoSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const [providers, setProviders] = useState([]) // [{ id, label, default_model, key_url }]
  const [form, setForm] = useState({
    provider: 'gemini',
    model: '',
    system_prompt: '',
    is_active: true,
    api_key: '', // only sent when the admin (re)enters it
  })
  const [hasKey, setHasKey] = useState(false)
  const [configured, setConfigured] = useState(false)

  const currentProvider = providers.find(p => p.id === form.provider)

  useEffect(() => {
    fetch('/api/ai/config')
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast({ type: 'error', title: 'Error', message: d.error }); return }
        setProviders(d.providers || [])
        setConfigured(!!d.configured)
        setHasKey(!!d.has_key)
        setForm(f => ({
          ...f,
          provider: d.provider || 'gemini',
          model: d.model || '',
          system_prompt: d.system_prompt || '',
          is_active: d.is_active ?? true,
        }))
      })
      .catch(() => toast({ type: 'error', title: 'Error', message: 'Failed to load Zeo settings' }))
      .finally(() => setLoading(false))
  }, [])

  const onProviderChange = (id) => {
    const p = providers.find(x => x.id === id)
    setForm(f => ({ ...f, provider: id, model: f.model || p?.default_model || '' }))
  }

  const buildBody = (extra = {}) => ({
    provider: form.provider,
    model: form.model.trim(),
    system_prompt: form.system_prompt.trim() || null,
    is_active: form.is_active,
    // Only send the key when the admin typed one; otherwise the stored key is kept.
    api_key: form.api_key.trim() || undefined,
    ...extra,
  })

  const handleTest = async () => {
    if (!form.api_key.trim() && !hasKey) {
      toast({ type: 'error', title: 'No key', message: 'Enter an API key to test.' })
      return
    }
    setTesting(true)
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildBody({ test: true })),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Test failed')
      toast({ type: 'success', title: 'Connection OK', message: 'Zeo reached the provider successfully.' })
    } catch (err) {
      toast({ type: 'error', title: 'Test failed', message: err.message })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!form.provider) { toast({ type: 'error', title: 'Pick a provider' }); return }
    setSaving(true)
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildBody()),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Save failed')
      setConfigured(true)
      setHasKey(!!d.has_key)
      setForm(f => ({ ...f, api_key: '' })) // clear the key field after save
      toast({ type: 'success', title: 'Saved', message: 'Zeo is configured.' })
    } catch (err) {
      toast({ type: 'error', title: 'Save failed', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const ok = await showConfirm({
      title: 'Remove Zeo configuration?',
      message: 'This deletes the provider key and disables Zeo for everyone in this workspace.',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    try {
      const res = await fetch('/api/ai/config', { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Delete failed')
      setConfigured(false)
      setHasKey(false)
      setForm({ provider: 'gemini', model: '', system_prompt: '', is_active: true, api_key: '' })
      toast({ type: 'success', title: 'Removed', message: 'Zeo configuration deleted.' })
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner /></div>
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-5 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
            <Sparkles size={16} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Zeo AI Assistant</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Bring your own AI key. Staff can then ask Zeo about your leads, patients, appointments and reports.
              Zeo can only read your data — it never changes anything.
            </p>
          </div>
          {configured && (
            <span className="inline-flex items-center gap-1 text-[10px] font-600 px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={10} /> Configured
            </span>
          )}
        </div>

        <Select
          label="AI Provider"
          value={form.provider}
          onChange={e => onProviderChange(e.target.value)}
          options={providers.map(p => ({ value: p.id, label: p.label }))}
        />

        <div>
          <Input
            label="Model"
            placeholder={currentProvider?.default_model || 'model id'}
            value={form.model}
            onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Leave blank to use the default ({currentProvider?.default_model}). Model IDs change often — you can type any the provider supports.
          </p>
        </div>

        <div>
          <Input
            label="API Key"
            type="password"
            placeholder={hasKey ? '•••••••••• (key saved — leave blank to keep)' : 'Paste your provider API key'}
            value={form.api_key}
            onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
          />
          {currentProvider?.key_url && (
            <a href={currentProvider.key_url} target="_blank" rel="noreferrer"
              className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: 'var(--color-brand)' }}>
              Get a free {currentProvider.label} key <ExternalLink size={10} />
            </a>
          )}
        </div>

        <Textarea
          label="System prompt (optional)"
          rows={4}
          placeholder="Describe your clinic, tone, and any rules Zeo should follow. E.g. 'You are the assistant for Kins Health. Be concise and professional.'"
          value={form.system_prompt}
          onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
        />

        <div className="flex items-center justify-between p-3 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
          <div>
            <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>Zeo enabled</p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Master switch. When off, the assistant is unavailable to staff.</p>
          </div>
          <Switch checked={form.is_active} onChange={() => setForm(f => ({ ...f, is_active: !f.is_active }))} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-(--color-border)">
          <div>
            {configured && (
              <button type="button" onClick={handleDelete}
                className="inline-flex items-center gap-1.5 text-xs font-500 text-red-500 hover:text-red-600">
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={handleTest} disabled={testing || saving}>
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
            <Button size="sm" type="button" onClick={handleSave} disabled={saving || testing}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Card>

      <p className="text-[11px] px-1" style={{ color: 'var(--color-text-muted)' }}>
        Your key is encrypted at rest and never shown again. Grant staff access to Zeo when you invite them under Settings → Users.
      </p>
    </div>
  )
}
