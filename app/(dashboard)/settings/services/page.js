'use client'
import { useState, useMemo } from 'react'
import { Plus, Search, ClipboardList, X, Edit2, Trash2, Clock } from 'lucide-react'
import { Button, Card, Input, Textarea } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { logAudit, AUDIT } from '@/lib/audit'

const EMPTY_FORM = { name: '', price: '', duration: '', description: '' }

// Format a minutes value as "45 min" / "1h 30m" / "2h"
function formatDuration(mins) {
  const m = Number(mins)
  if (!m || Number.isNaN(m)) return null
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

export default function ServicesSettingsPage() {
  const { org, orgId } = useOrg()

  const [services, setServices] = useState(() => org?.settings?.services || [])
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return services
    return services.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    )
  }, [services, search])

  const persist = async (next) => {
    await updateOrganization(orgId, { settings: { ...(org?.settings || {}), services: next } })
    setServices(next)
  }

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false) }

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (s) => {
    setForm({ name: s.name || '', price: s.price ?? '', duration: s.duration ?? '', description: s.description || '' })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !orgId) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        price: form.price === '' ? null : Number(form.price),
        duration: form.duration === '' ? null : Number(form.duration),
        description: form.description.trim() || null,
      }
      let next
      if (editingId) {
        next = services.map(s => s.id === editingId ? { ...s, ...payload } : s)
      } else {
        next = [...services, { id: crypto.randomUUID(), ...payload }]
      }
      await persist(next)
      logAudit({
        action: AUDIT.SETTINGS_CHANGE,
        description: `${editingId ? 'Updated' : 'Added'} service: ${payload.name}`,
        metadata: { name: payload.name, price: payload.price, duration: payload.duration },
      })
      resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const svc = services.find(s => s.id === id)
    if (!confirm(`Delete "${svc?.name || 'this service'}"? This cannot be undone.`)) return
    try {
      const next = services.filter(s => s.id !== id)
      await persist(next)
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `Deleted service: ${svc?.name || id}`, metadata: { name: svc?.name } })
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Services &amp; Pricing
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Manage the services and tests your clinic offers and their prices
          </p>
        </div>
        {!showForm && (
          <Button onClick={openAdd} className="shrink-0">
            <Plus size={16} /> Add Service
          </Button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card className="p-5 border-(--color-border)">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>
              {editingId ? 'Edit Service' : 'New Service'}
            </p>
            <button type="button" onClick={resetForm} className="p-1.5 rounded-lg hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <Input label="Service / Test name *" placeholder="e.g. Blood Test, X-Ray"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <Input label="Price (₹)" type="number" min="0" step="0.01" placeholder="500"
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <Input label="Duration (minutes)" type="number" min="0" step="1" placeholder="30"
                value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
            <Textarea label="Short description" placeholder="Brief note about what this service includes…"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
              <Button variant="secondary" type="button" size="sm" onClick={resetForm}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Service'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      {services.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-(--color-border) outline-none transition-all"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              placeholder="Search services or tests…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={13} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}
          </div>
          <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
            {filtered.length} of {services.length} service{services.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
            {services.length === 0
              ? 'No services added yet.'
              : 'No services match your search.'}
          </p>
          {services.length === 0 && !showForm && (
            <button onClick={openAdd} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-xs font-600 transition-colors hover:opacity-90"
              style={{ background: 'var(--color-brand)', color: 'white' }}>
              <Plus size={13} /> Add your first service
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th className="text-left px-5 py-2.5 text-[10px] font-700 uppercase tracking-widest border-b border-(--color-border)" style={{ color: 'var(--color-text-muted)' }}>Service / Test</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-700 uppercase tracking-widest border-b border-(--color-border) whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>Duration</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-700 uppercase tracking-widest border-b border-(--color-border) whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>Price</th>
                  <th className="w-20 border-b border-(--color-border)" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const dur = formatDuration(s.duration)
                  return (
                    <tr key={s.id} className="group transition-colors hover:bg-(--color-surface-2)"
                      style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                      <td className="px-5 py-3.5 align-top">
                        <p className="font-600" style={{ color: 'var(--color-text-primary)' }}>{s.name}</p>
                        {s.description && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{s.description}</p>}
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {dur ? (
                          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            <Clock size={12} style={{ color: 'var(--color-text-muted)' }} /> {dur}
                          </span>
                        ) : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        {s.price != null ? (
                          <span className="font-700" style={{ color: 'var(--color-text-primary)' }}>₹{Number(s.price).toLocaleString()}</span>
                        ) : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => openEdit(s)} title="Edit"
                            className="p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                            <Edit2 size={14} />
                          </button>
                          <button type="button" onClick={() => handleDelete(s.id)} title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
