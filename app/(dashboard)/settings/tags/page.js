'use client'
import { useState, useEffect } from 'react'
import {
  Tags, TrendingUp, Plus, Trash2, X,
  Phone, Star, Clock, XCircle, Zap, UserCheck,
} from 'lucide-react'
import { Button, Card, Input, Spinner } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization, getTags, createTag, deleteTag } from '@/lib/supabase/queries'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'

const DEFAULT_LEAD_STAGES = [
  { name: 'New',        color: '#135BFB' },
  { name: 'Contacted',  color: '#0ea5e9' },
  { name: 'Interested', color: '#f59e0b' },
  { name: 'Follow-up',  color: '#8b5cf6' },
  { name: 'Converted',  color: '#10b981' },
  { name: 'Lost',       color: '#ef4444' },
]

const DEFAULT_PATIENT_STATUSES = [
  { name: 'Active', color: '#10b981' },
  { name: 'Inactive', color: '#ef4444' },
]

const STAGE_ICONS = {
  'New':        Zap,
  'Contacted':  Phone,
  'Interested': Star,
  'Follow-up':  Clock,
  'Converted':  UserCheck,
  'Lost':       XCircle,
}

const PRESET_COLORS = ['#135BFB', '#0f6e56', '#1d4ed8', '#7c3aed', '#b45309', '#be185d', '#ef4444', '#f59e0b', '#10b981']

export default function TagsPage() {
  const { org, orgId } = useOrg()

  // ── Tags ──
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', color: '#135BFB', page: 'patients' })
  const [saving, setSaving] = useState(false)

  // ── Stages ──
  const rawStages = org?.settings?.lead_stages || DEFAULT_LEAD_STAGES
  const [stages, setStages] = useState(() =>
    rawStages.map(s => typeof s === 'string' ? { name: s, color: '#135BFB' } : s)
  )
  const [newStage, setNewStage] = useState('')
  const [newStageColor, setNewStageColor] = useState('#135BFB')
  const [savingStages, setSavingStages] = useState(false)
  const [showStageForm, setShowStageForm] = useState(false)
  const rawPatientStatuses = org?.settings?.patient_statuses || DEFAULT_PATIENT_STATUSES
  const [patientStatuses, setPatientStatuses] = useState(() => rawPatientStatuses.map(s => typeof s === 'string' ? { name: s, color: '#135BFB' } : s))
  const [newPatientStatus, setNewPatientStatus] = useState('')
  const [newPatientStatusColor, setNewPatientStatusColor] = useState('#10b981')
  const [savingPatientStatuses, setSavingPatientStatuses] = useState(false)
  const [showPatientStatusForm, setShowPatientStatusForm] = useState(false)


  const persistStages = async (updated) => {
    setSavingStages(true)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), lead_stages: updated } })
      setStages(updated)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSavingStages(false) }
  }

  const handleAddStage = async (e) => {
    e.preventDefault()
    const trimmed = newStage.trim()
    if (!trimmed || stages.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return
    await persistStages([...stages, { name: trimmed, color: newStageColor }])
    setNewStage('')
    setNewStageColor('#135BFB')
    setShowStageForm(false)
  }

  const handleDeleteStage = async (stageName) => {
    const ok = await showConfirm({ title: `Remove "${stageName}" stage?`, message: 'Leads in this stage will keep it until manually changed.', confirmLabel: 'Remove' })
    if (!ok) return
    await persistStages(stages.filter(s => s.name !== stageName))
  }

  const persistPatientStatuses = async (updated) => {
    setSavingPatientStatuses(true)
    try { await updateOrganization(orgId, { settings: { ...(org?.settings || {}), patient_statuses: updated } }); setPatientStatuses(updated) }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSavingPatientStatuses(false) }
  }
  const handleAddPatientStatus = async (e) => {
    e.preventDefault(); const name = newPatientStatus.trim()
    if (!name || patientStatuses.some(s => s.name.toLowerCase() === name.toLowerCase())) return
    await persistPatientStatuses([...patientStatuses, { name, color: newPatientStatusColor }]); setNewPatientStatus(''); setNewPatientStatusColor('#10b981'); setShowPatientStatusForm(false)
  }
  const handleDeletePatientStatus = async (name) => {
    if (patientStatuses.length <= 1) return
    const ok = await showConfirm({ title: `Remove "${name}" status?`, message: 'Patients already using it will keep it until changed.', confirmLabel: 'Remove' })
    if (ok) await persistPatientStatuses(patientStatuses.filter(s => s.name !== name))
  }

  const loadTags = async () => {
    if (!orgId) return
    setLoading(true)
    try { setTags(await getTags(orgId) || []) } catch { setTags([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTags() }, [orgId])

  const resetForm = () => { setNewTag({ name: '', color: '#135BFB', page: 'patients' }); setShowForm(false) }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTag.name.trim() || !orgId) return
    setSaving(true)
    try {
      await createTag({ ...newTag, organization_id: orgId })
      await loadTags()
      resetForm()
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const ok = await showConfirm({ title: 'Delete this tag?', message: 'It will be removed from all patients.', confirmLabel: 'Delete' })
    if (!ok) return
    try {
      await deleteTag(id)
      setTags(prev => prev.filter(t => t.id !== id))
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  return (
    <div className="space-y-4">
      {/* ── Patient Tags ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Tags size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Tag Management</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Organize leads &amp; patients with custom tags for segmentation</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} className="shrink-0">
              <Plus size={15} /> New Tag
            </Button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="flex items-end gap-4 mb-4 p-4 rounded-xl border border-(--color-border) flex-wrap"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <div className="flex-1 min-w-40">
              <Input
                label="Tag Name *"
                placeholder="e.g. VIP Patient"
                value={newTag.name}
                onChange={e => setNewTag(t => ({ ...t, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>For Page</label>
              <div className="flex rounded-lg overflow-hidden border border-(--color-border)">
                {[{ value: 'patients', label: 'Patients' }, { value: 'leads', label: 'Leads' }].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewTag(t => ({ ...t, page: value }))}
                    className="px-4 py-2 text-xs font-600 transition-all"
                    style={newTag.page === value
                      ? { background: 'var(--color-brand)', color: 'white' }
                      : { color: 'var(--color-text-muted)', background: 'transparent' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTag(t => ({ ...t, color: c }))}
                      className="w-5 h-5 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: newTag.color === c ? 'white' : 'transparent',
                        outline: newTag.color === c ? `2px solid ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={newTag.color}
                  onChange={e => setNewTag(t => ({ ...t, color: e.target.value }))}
                  className="w-7 h-7 rounded border border-(--color-border) p-0.5 cursor-pointer"
                />
              </div>
            </div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-600 self-end mb-0.5"
              style={{ background: newTag.color + '15', borderColor: newTag.color + '50', color: newTag.color }}
            >
              <Tags size={13} style={{ color: newTag.color }} />
              {newTag.name || 'Preview'}
            </div>
            <div className="flex gap-2 self-end mb-0.5">
              <Button type="submit" size="sm" disabled={saving || !newTag.name.trim()}>
                {saving ? 'Creating...' : 'Create'}
              </Button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary btn-icon"
              >
                <X size={15} />
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={24} /></div>
        ) : tags.length === 0 ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <Tags size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No tags yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center gap-2.5 p-3 rounded-xl border group"
                style={{ background: tag.color + '0d', borderColor: tag.color + '40' }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: tag.color + '25' }}>
                  <Tags size={14} style={{ color: tag.color }} />
                </div>
                <span className="text-sm font-600 flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{tag.name}</span>
                <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full uppercase shrink-0" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  {tag.page === 'leads' ? 'Lead' : 'Patient'}
                </span>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}><UserCheck size={16} style={{ color: 'var(--color-brand)' }} /></div>
          <div className="flex-1 ml-3"><p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Patient Statuses</p><p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Create the statuses available on patient records</p></div>
          {!showPatientStatusForm && <Button size="sm" onClick={() => setShowPatientStatusForm(true)}><Plus size={15} /> New Status</Button>}
        </div>
        {showPatientStatusForm && <form onSubmit={handleAddPatientStatus} className="flex items-end gap-4 mb-4 p-4 rounded-xl border border-(--color-border) flex-wrap" style={{ background: 'var(--color-surface-2)' }}>
          <div className="flex-1 min-w-40"><Input label="Status Name *" placeholder="e.g. On Hold" value={newPatientStatus} onChange={e => setNewPatientStatus(e.target.value)} required /></div>
          <div className="space-y-1.5"><label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Color</label><div className="flex items-center gap-2"><div className="flex gap-1.5 flex-wrap">{PRESET_COLORS.map(c => <button key={c} type="button" onClick={() => setNewPatientStatusColor(c)} className="w-5 h-5 rounded-full border-2" style={{ background: c, borderColor: newPatientStatusColor === c ? 'white' : 'transparent', outline: newPatientStatusColor === c ? `2px solid ${c}` : 'none' }} />)}</div><input type="color" value={newPatientStatusColor} onChange={e => setNewPatientStatusColor(e.target.value)} className="w-7 h-7 rounded border border-(--color-border) p-0.5" /></div></div>
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-600 self-end mb-0.5" style={{ background: newPatientStatusColor + '15', borderColor: newPatientStatusColor + '50', color: newPatientStatusColor }}><UserCheck size={13} />{newPatientStatus || 'Preview'}</div>
          <div className="flex gap-2 self-end mb-0.5"><Button type="submit" size="sm" disabled={savingPatientStatuses || !newPatientStatus.trim()}>{savingPatientStatuses ? 'Creating...' : 'Create'}</Button><button type="button" onClick={() => { setNewPatientStatus(''); setNewPatientStatusColor('#10b981'); setShowPatientStatusForm(false) }} className="btn btn-secondary btn-icon"><X size={15} /></button></div>
        </form>}
        <div className="flex flex-wrap gap-2 mb-5">{patientStatuses.map(status => <div key={status.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border group" style={{ background: status.color + '12', borderColor: status.color + '40' }}><span className="w-2 h-2 rounded-full" style={{ background: status.color }} /><span className="text-xs font-600" style={{ color: status.color }}>{status.name}</span><button type="button" onClick={() => handleDeletePatientStatus(status.name)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-gray-400 hover:text-red-500"><X size={10} /></button></div>)}</div>
      </Card>

      {/* ── Lead Stages ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <TrendingUp size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Lead Stages</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Define the pipeline stages used across all leads</p>
            </div>
          </div>
          {!showStageForm && <Button size="sm" onClick={() => setShowStageForm(true)}><Plus size={15} /> New Stage</Button>}
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {stages.map((stage) => {
            const StageIcon = STAGE_ICONS[stage.name] || TrendingUp
            return (
              <div
                key={stage.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border group"
                style={{ background: stage.color + '12', borderColor: stage.color + '40' }}
              >
                <StageIcon size={12} style={{ color: stage.color }} />
                <span className="text-xs font-600" style={{ color: stage.color }}>{stage.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteStage(stage.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-gray-400 hover:text-red-500"
                >
                  <X size={10} />
                </button>
              </div>
            )
          })}
        </div>

        {showStageForm && <form onSubmit={handleAddStage} className="flex items-end gap-4 p-4 rounded-xl border border-(--color-border) flex-wrap" style={{ background: 'var(--color-surface-2)' }}>
          <div className="flex-1 min-w-40"><Input label="Stage Name *" placeholder="e.g. Negotiation" value={newStage} onChange={e => setNewStage(e.target.value)} required /></div>
          <div className="space-y-1.5"><label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Color</label><div className="flex items-center gap-2"><div className="flex gap-1.5 flex-wrap">{PRESET_COLORS.map(c => <button key={c} type="button" onClick={() => setNewStageColor(c)} className="w-5 h-5 rounded-full border-2" style={{ background: c, borderColor: newStageColor === c ? 'white' : 'transparent', outline: newStageColor === c ? `2px solid ${c}` : 'none' }} />)}</div><input type="color" value={newStageColor} onChange={e => setNewStageColor(e.target.value)} className="w-7 h-7 rounded border border-(--color-border) p-0.5" /></div></div>
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-600 self-end mb-0.5" style={{ background: newStageColor + '15', borderColor: newStageColor + '50', color: newStageColor }}>{(() => { const I = STAGE_ICONS[newStage.trim()] || TrendingUp; return <I size={13} /> })()}{newStage || 'Preview'}</div>
          <div className="flex gap-2 self-end mb-0.5"><Button type="submit" size="sm" disabled={savingStages || !newStage.trim()}>{savingStages ? 'Creating...' : 'Create'}</Button><button type="button" onClick={() => { setNewStage(''); setNewStageColor('#135BFB'); setShowStageForm(false) }} className="btn btn-secondary btn-icon"><X size={15} /></button></div>
        </form>}
      </Card>

    </div>
  )
}
