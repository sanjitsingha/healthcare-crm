'use client'
import { useState, useMemo } from 'react'
import { Plus, Search, ClipboardList, X, Edit2, Trash2, Clock, Package, GripVertical, ArrowRight } from 'lucide-react'
import { Button, Card, Input, Textarea } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { logAudit, AUDIT } from '@/lib/audit'
import clsx from 'clsx'

const EMPTY_SERVICE = { name: '', price: '', duration: '', description: '' }
const EMPTY_PACKAGE = { name: '', description: '', items: [], customPriceEnabled: false, price: '' }

// Format a minutes value as "45 min" / "1h 30m" / "2h"
function formatDuration(mins) {
  const m = Number(mins)
  if (!m || Number.isNaN(m)) return null
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

// Resolve a package's items + pricing against the current service list
function packagePricing(pkg, services) {
  const items = (pkg.items || []).map(id => services.find(s => s.id === id)).filter(Boolean)
  const autoTotal = items.reduce((sum, s) => sum + (s.price != null ? Number(s.price) : 0), 0)
  const custom = pkg.customPriceEnabled && pkg.price != null && pkg.price !== '' ? Number(pkg.price) : null
  const finalPrice = custom != null ? custom : autoTotal
  const discountPct = custom != null && autoTotal > 0 ? Math.round(((autoTotal - custom) / autoTotal) * 100) : 0
  return { items, autoTotal, finalPrice, discountPct }
}

// Small on/off switch
function Switch({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0"
      style={{ background: checked ? 'var(--color-brand)' : 'var(--color-border)' }}>
      <span className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  )
}

export default function ServicesSettingsPage() {
  const { org, orgId } = useOrg()

  const [tab, setTab] = useState('services') // 'services' | 'packages'
  const [services, setServices] = useState(() => org?.settings?.services || [])
  const [packages, setPackages] = useState(() => org?.settings?.packages || [])

  // Persist helpers — always write both keys so they stay consistent
  const persistServices = async (next) => {
    await updateOrganization(orgId, { settings: { ...(org?.settings || {}), services: next, packages } })
    setServices(next)
  }
  const persistPackages = async (next) => {
    await updateOrganization(orgId, { settings: { ...(org?.settings || {}), services, packages: next } })
    setPackages(next)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          Services &amp; Pricing
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage the services, tests, and packages your clinic offers
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-(--color-border)">
        {[
          { id: 'services', label: 'Services', icon: ClipboardList, count: services.length },
          { id: 'packages', label: 'Packages', icon: Package, count: packages.length },
        ].map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-600 border-b-2 transition-all -mb-px"
            style={tab === t.id
              ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }
              : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}>
            <t.icon size={15} />
            {t.label}
            {t.count > 0 && (
              <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full"
                style={tab === t.id ? { background: 'var(--color-brand-50)', color: 'var(--color-brand)' } : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'services'
        ? <ServicesTab services={services} persistServices={persistServices} />
        : <PackagesTab services={services} packages={packages} persistPackages={persistPackages} onGoToServices={() => setTab('services')} />}
    </div>
  )
}

// ── Services tab ────────────────────────────────────────────────
function ServicesTab({ services, persistServices }) {
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]         = useState(EMPTY_SERVICE)
  const [saving, setSaving]     = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return services
    return services.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    )
  }, [services, search])

  const resetForm = () => { setForm(EMPTY_SERVICE); setEditingId(null); setShowForm(false) }
  const openAdd = () => { setForm(EMPTY_SERVICE); setEditingId(null); setShowForm(true) }
  const openEdit = (s) => {
    setForm({ name: s.name || '', price: s.price ?? '', duration: s.duration ?? '', description: s.description || '' })
    setEditingId(s.id); setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        price: form.price === '' ? null : Number(form.price),
        duration: form.duration === '' ? null : Number(form.duration),
        description: form.description.trim() || null,
      }
      const next = editingId
        ? services.map(s => s.id === editingId ? { ...s, ...payload } : s)
        : [...services, { id: crypto.randomUUID(), ...payload }]
      await persistServices(next)
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `${editingId ? 'Updated' : 'Added'} service: ${payload.name}`, metadata: { name: payload.name, price: payload.price, duration: payload.duration } })
      resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const svc = services.find(s => s.id === id)
    if (!confirm(`Delete "${svc?.name || 'this service'}"? This cannot be undone.`)) return
    try {
      await persistServices(services.filter(s => s.id !== id))
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `Deleted service: ${svc?.name || id}`, metadata: { name: svc?.name } })
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="flex justify-end">
          <Button onClick={openAdd}><Plus size={16} /> Add Service</Button>
        </div>
      )}

      {showForm && (
        <Card className="p-5 border-(--color-border)">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{editingId ? 'Edit Service' : 'New Service'}</p>
            <button type="button" onClick={resetForm} className="p-1.5 rounded-lg hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Service / Test name *" placeholder="e.g. Blood Test, X-Ray" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <Input label="Price (₹)" type="number" min="0" step="0.01" placeholder="500" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <Input label="Duration (minutes)" type="number" min="0" step="1" placeholder="30" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
            <Textarea label="Short description" placeholder="Brief note about what this service includes…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
              <Button variant="secondary" type="button" size="sm" onClick={resetForm}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Service'}</Button>
            </div>
          </form>
        </Card>
      )}

      {services.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-(--color-border) outline-none" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} placeholder="Search services or tests…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={13} style={{ color: 'var(--color-text-muted)' }} /></button>}
          </div>
          <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} of {services.length} service{services.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>{services.length === 0 ? 'No services added yet.' : 'No services match your search.'}</p>
          {services.length === 0 && !showForm && (
            <button onClick={openAdd} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-xs font-600 transition-colors hover:opacity-90" style={{ background: 'var(--color-brand)', color: 'white' }}><Plus size={13} /> Add your first service</button>
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
                    <tr key={s.id} className="group transition-colors hover:bg-(--color-surface-2)" style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                      <td className="px-5 py-3.5 align-top">
                        <p className="font-600" style={{ color: 'var(--color-text-primary)' }}>{s.name}</p>
                        {s.description && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{s.description}</p>}
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {dur ? <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}><Clock size={12} style={{ color: 'var(--color-text-muted)' }} /> {dur}</span> : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        {s.price != null ? <span className="font-700" style={{ color: 'var(--color-text-primary)' }}>₹{Number(s.price).toLocaleString()}</span> : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => openEdit(s)} title="Edit" className="p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}><Edit2 size={14} /></button>
                          <button type="button" onClick={() => handleDelete(s.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}><Trash2 size={14} /></button>
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

// ── Packages tab ────────────────────────────────────────────────
function PackagesTab({ services, packages, persistPackages, onGoToServices }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_PACKAGE)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const resetForm = () => { setForm(EMPTY_PACKAGE); setEditingId(null); setShowForm(false); setDragOver(false) }
  const openAdd = () => { setForm(EMPTY_PACKAGE); setEditingId(null); setShowForm(true) }
  const openEdit = (p) => {
    setForm({ name: p.name || '', description: p.description || '', items: [...(p.items || [])], customPriceEnabled: !!p.customPriceEnabled, price: p.price ?? '' })
    setEditingId(p.id); setShowForm(true)
  }

  const addItem = (sid) => setForm(f => f.items.includes(sid) ? f : { ...f, items: [...f.items, sid] })
  const removeItem = (sid) => setForm(f => ({ ...f, items: f.items.filter(x => x !== sid) }))

  const onDrop = (e) => {
    e.preventDefault()
    const sid = e.dataTransfer.getData('text/plain')
    if (sid) addItem(sid)
    setDragOver(false)
  }

  // Live pricing for the form
  const draft = useMemo(() => packagePricing(
    { items: form.items, customPriceEnabled: form.customPriceEnabled, price: form.price },
    services
  ), [form, services])

  const available = services.filter(s => !form.items.includes(s.id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || form.items.length === 0) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        items: form.items,
        customPriceEnabled: form.customPriceEnabled,
        price: form.customPriceEnabled && form.price !== '' ? Number(form.price) : null,
      }
      const next = editingId
        ? packages.map(p => p.id === editingId ? { ...p, ...payload } : p)
        : [...packages, { id: crypto.randomUUID(), ...payload }]
      await persistPackages(next)
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `${editingId ? 'Updated' : 'Added'} package: ${payload.name}`, metadata: { name: payload.name, items: payload.items.length, price: payload.price } })
      resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const pkg = packages.find(p => p.id === id)
    if (!confirm(`Delete package "${pkg?.name || 'this package'}"? This cannot be undone.`)) return
    try {
      await persistPackages(packages.filter(p => p.id !== id))
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `Deleted package: ${pkg?.name || id}`, metadata: { name: pkg?.name } })
    } catch (err) { alert(err.message) }
  }

  // No services at all → can't build a package
  if (services.length === 0 && !showForm) {
    return (
      <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
        <Package size={32} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>Add some services first, then bundle them into packages.</p>
        <button onClick={onGoToServices} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-xs font-600 transition-colors hover:opacity-90" style={{ background: 'var(--color-brand)', color: 'white' }}>
          Go to Services <ArrowRight size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="flex justify-end">
          <Button onClick={openAdd}><Plus size={16} /> Add Package</Button>
        </div>
      )}

      {/* Add / Edit package form */}
      {showForm && (
        <Card className="p-5 border-(--color-border)">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{editingId ? 'Edit Package' : 'New Package'}</p>
            <button type="button" onClick={resetForm} className="p-1.5 rounded-lg hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Package name *" placeholder="e.g. Full Body Checkup" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <Input label="Short description" placeholder="Brief note about this package…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Item picker — drag & drop (or click) */}
            <div>
              <label className="block text-xs font-500 mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Items (drag a service into the package, or click to add)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* Available services */}
                <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                  <p className="px-3 py-2 text-[10px] font-700 uppercase tracking-wider border-b border-(--color-border)" style={{ color: 'var(--color-text-muted)' }}>Available services</p>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
                    {available.length === 0 ? (
                      <p className="px-2 py-4 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>All services added.</p>
                    ) : available.map(s => (
                      <div key={s.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData('text/plain', s.id)}
                        onClick={() => addItem(s.id)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-(--color-border) cursor-grab active:cursor-grabbing transition-colors hover:bg-(--color-brand-50)"
                        style={{ background: 'var(--color-surface)' }}>
                        <GripVertical size={13} style={{ color: 'var(--color-text-muted)' }} className="shrink-0" />
                        <span className="flex-1 text-xs font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
                        <span className="text-xs font-600 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{s.price != null ? `₹${Number(s.price).toLocaleString()}` : '—'}</span>
                        <Plus size={13} style={{ color: 'var(--color-brand)' }} className="shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected items (drop zone) */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className="rounded-xl border-2 overflow-hidden transition-colors"
                  style={{ borderStyle: dragOver ? 'dashed' : 'solid', borderColor: dragOver ? 'var(--color-brand)' : 'var(--color-border)', background: dragOver ? 'var(--color-brand-50)' : 'var(--color-surface)' }}>
                  <p className="px-3 py-2 text-[10px] font-700 uppercase tracking-wider border-b border-(--color-border)" style={{ color: 'var(--color-text-muted)' }}>
                    Package items {form.items.length > 0 && `(${form.items.length})`}
                  </p>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
                    {form.items.length === 0 ? (
                      <p className="px-2 py-8 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>Drop services here, or click one on the left.</p>
                    ) : form.items.map(id => {
                      const s = services.find(x => x.id === id)
                      if (!s) return null
                      return (
                        <div key={id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                          <span className="flex-1 text-xs font-500 truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
                          <span className="text-xs font-600 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{s.price != null ? `₹${Number(s.price).toLocaleString()}` : '—'}</span>
                          <button type="button" onClick={() => removeItem(id)} className="p-0.5 rounded hover:bg-red-50 shrink-0" style={{ color: '#b91c1c' }}><X size={13} /></button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-xl border border-(--color-border) p-4 space-y-3" style={{ background: 'var(--color-surface-2)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Items total (auto)</span>
                <span className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>₹{draft.autoTotal.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-(--color-border)">
                <div>
                  <p className="text-xs font-600" style={{ color: 'var(--color-text-primary)' }}>Custom / discounted price</p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Override the total with a fixed package price</p>
                </div>
                <Switch checked={form.customPriceEnabled} onChange={v => setForm(f => ({ ...f, customPriceEnabled: v }))} />
              </div>

              {form.customPriceEnabled && (
                <div className="flex items-end gap-3 pt-1">
                  <div className="flex-1 max-w-50">
                    <Input label="Package price (₹)" type="number" min="0" step="0.01" placeholder={String(draft.autoTotal)} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  {form.price !== '' && draft.autoTotal > 0 && (
                    <div className="pb-2">
                      {draft.discountPct > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-700 px-2.5 py-1 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
                          {draft.discountPct}% off · save ₹{(draft.autoTotal - Number(form.price)).toLocaleString()}
                        </span>
                      ) : draft.discountPct < 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-700 px-2.5 py-1 rounded-full" style={{ background: '#fef3c7', color: '#b45309' }}>
                          {Math.abs(draft.discountPct)}% markup
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No discount</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-(--color-border)">
                <span className="text-xs font-700 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Package price</span>
                <span className="text-base font-800" style={{ color: 'var(--color-brand)' }}>₹{draft.finalPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
              <Button variant="secondary" type="button" size="sm" onClick={resetForm}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !form.name.trim() || form.items.length === 0}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Package'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Package list */}
      {packages.length === 0 ? (
        !showForm && (
          <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
            <Package size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No packages yet.</p>
            <button onClick={openAdd} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-xs font-600 transition-colors hover:opacity-90" style={{ background: 'var(--color-brand)', color: 'white' }}><Plus size={13} /> Create your first package</button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {packages.map(p => {
            const { items, autoTotal, finalPrice, discountPct } = packagePricing(p, services)
            const discounted = p.customPriceEnabled && p.price != null && p.price !== '' && discountPct > 0
            return (
              <Card key={p.id} className="p-4 border-(--color-border) group">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-700 truncate" style={{ color: 'var(--color-text-primary)' }}>{p.name}</p>
                    {p.description && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button type="button" onClick={() => openEdit(p)} title="Edit" className="p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}><Edit2 size={14} /></button>
                    <button type="button" onClick={() => handleDelete(p.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#b91c1c' }}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {items.length === 0 ? (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No items</span>
                  ) : items.map(s => (
                    <span key={s.id} className="text-[11px] font-600 px-2 py-0.5 rounded-md" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>{s.name}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-(--color-border)">
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-2">
                    {discounted && (
                      <>
                        <span className="text-xs line-through" style={{ color: 'var(--color-text-muted)' }}>₹{autoTotal.toLocaleString()}</span>
                        <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>{discountPct}% off</span>
                      </>
                    )}
                    <span className="text-base font-800" style={{ color: 'var(--color-brand)' }}>₹{finalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
