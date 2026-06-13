'use client'
import { useState } from 'react'
import { Stethoscope, Plus, Trash2, X, Edit2, Clock, IndianRupee } from 'lucide-react'
import { Button, Card, Input, Textarea, Avatar, Select } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { logAudit, AUDIT } from '@/lib/audit'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const defaultSchedule = () => DAYS.reduce((acc, d) => ({ ...acc, [d]: { enabled: false, start: '09:00', end: '17:00' } }), {})
const makeEmptyForm = () => ({ name: '', department: '', qualification: '', description: '', fee: '', schedule: defaultSchedule() })

// "14:00" → "2:00 PM"
function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h < 12 ? 'AM' : 'PM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

export default function DoctorsPage() {
  const { org, orgId } = useOrg()
  const [doctors,  setDoctors]  = useState(() => org?.settings?.doctors || [])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form,     setForm]     = useState(makeEmptyForm)
  const [saving,   setSaving]   = useState(false)

  // Department options come from the configured departments (Settings → Departments).
  // Keep the doctor's current value selectable even if it predates the list.
  const deptNames = (org?.settings?.departments || []).map(d => d.name).filter(Boolean)
  const deptOptions = form.department && !deptNames.includes(form.department)
    ? [...deptNames, form.department]
    : deptNames

  const resetForm = () => { setForm(makeEmptyForm()); setEditingId(null); setShowForm(false) }
  const openAdd = () => { setForm(makeEmptyForm()); setEditingId(null); setShowForm(true) }
  const openEdit = (d) => {
    // Merge stored schedule over defaults so every day is present in the form
    const schedule = { ...defaultSchedule(), ...(d.schedule && typeof d.schedule === 'object' ? d.schedule : {}) }
    setForm({
      name: d.name || '', department: d.department || '', qualification: d.qualification || '',
      description: d.description || '', fee: d.fee ?? '', schedule,
    })
    setEditingId(d.id); setShowForm(true)
  }

  const setDay = (day, patch) =>
    setForm(f => ({ ...f, schedule: { ...f.schedule, [day]: { ...f.schedule[day], ...patch } } }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !orgId) return
    setSaving(true)
    // Only keep days that are enabled
    const schedule = DAYS.reduce((acc, d) => {
      if (form.schedule[d]?.enabled) acc[d] = { enabled: true, start: form.schedule[d].start, end: form.schedule[d].end }
      return acc
    }, {})
    const payload = {
      name:          form.name.trim(),
      department:    form.department.trim(),
      qualification: form.qualification.trim(),
      description:   form.description.trim(),
      fee:           form.fee === '' ? null : Number(form.fee),
      schedule,
    }
    const updated = editingId
      ? doctors.map(d => d.id === editingId ? { ...d, ...payload } : d)
      : [...doctors, { id: crypto.randomUUID(), ...payload }]
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), doctors: updated } })
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `${editingId ? 'Updated' : 'Added'} doctor: ${payload.name}`, metadata: { name: payload.name, department: payload.department, fee: payload.fee } })
      setDoctors(updated); resetForm()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this doctor?')) return
    const doc = doctors.find(d => d.id === id)
    const updated = doctors.filter(d => d.id !== id)
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), doctors: updated } })
      logAudit({ action: AUDIT.SETTINGS_CHANGE, description: `Doctor removed: ${doc?.name || id}`, metadata: { name: doc?.name } })
      setDoctors(updated)
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
              <Stethoscope size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Doctors</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Medical staff with department, timing, and consultation fees</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={openAdd}>
              <Plus size={15} /> Add Doctor
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Full Name *" placeholder="Dr. Priya Sharma" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              {deptNames.length > 0 ? (
                <Select label="Department" value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  options={[{ value: '', label: '— Select —' }, ...deptOptions.map(n => ({ value: n, label: n }))]} />
              ) : (
                <Input label="Department" placeholder="Add departments in Settings → Departments" value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              )}
              <Input label="Qualification" placeholder="MBBS, MD" value={form.qualification}
                onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} />
            </div>

            <div className="max-w-50">
              <Input label="Consultation Fee (₹)" type="number" min="0" step="0.01" placeholder="500" value={form.fee}
                onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
            </div>

            {/* Weekly timing */}
            <div className="space-y-1.5">
              <label className="block text-xs font-500" style={{ color: 'var(--color-text-secondary)' }}>Timing &amp; Availability</label>
              <div className="rounded-xl border border-(--color-border) overflow-hidden">
                {DAYS.map((day, i) => {
                  const row = form.schedule[day]
                  return (
                    <div key={day} className="flex items-center gap-3 px-3 py-2"
                      style={{ background: 'var(--color-surface)', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
                      <label className="flex items-center gap-2 w-20 shrink-0 cursor-pointer">
                        <input type="checkbox" checked={row.enabled} onChange={e => setDay(day, { enabled: e.target.checked })}
                          className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: 'var(--color-brand)' }} />
                        <span className="text-xs font-600" style={{ color: row.enabled ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{day}</span>
                      </label>
                      <input type="time" value={row.start} disabled={!row.enabled}
                        onChange={e => setDay(day, { start: e.target.value })}
                        className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>–</span>
                      <input type="time" value={row.end} disabled={!row.enabled}
                        onChange={e => setDay(day, { end: e.target.value })}
                        className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            <Textarea label="Description" placeholder="Brief note about the doctor, specialities, experience…" rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

            <div className="flex justify-end gap-2 pt-1 border-t border-(--color-border)">
              <Button variant="secondary" size="sm" type="button" onClick={resetForm}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Doctor'}
              </Button>
            </div>
          </form>
        )}

        {doctors.length === 0 && !showForm ? (
          <div className="py-12 text-center border border-dashed rounded-xl border-(--color-border)">
            <Stethoscope size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No doctors added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {doctors.map(d => {
              const days = d.schedule && typeof d.schedule === 'object' ? DAYS.filter(day => d.schedule[day]?.enabled) : []
              return (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-(--color-border) group" style={{ background: 'var(--color-surface-2)' }}>
                  <Avatar name={d.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{d.name}</p>
                      {d.department && (
                        <span className="text-[10px] font-600 px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>
                          {d.department}
                        </span>
                      )}
                    </div>
                    {d.qualification && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{d.qualification}</p>}

                    {d.fee != null && (
                      <p className="inline-flex items-center gap-0.5 text-[11px] font-600 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        <IndianRupee size={11} style={{ color: 'var(--color-text-muted)' }} />{Number(d.fee).toLocaleString()} <span className="font-400" style={{ color: 'var(--color-text-muted)' }}>· consultation</span>
                      </p>
                    )}

                    {days.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {days.map(day => (
                          <span key={day} className="inline-flex items-center gap-1 text-[10px] font-600 px-1.5 py-0.5 rounded-md" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                            <Clock size={10} style={{ color: 'var(--color-text-muted)' }} />
                            {day} {fmtTime(d.schedule[day].start)}–{fmtTime(d.schedule[day].end)}
                          </span>
                        ))}
                      </div>
                    ) : d.timing ? (
                      <span className="inline-flex items-center gap-1 text-[11px] mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        <Clock size={11} style={{ color: 'var(--color-text-muted)' }} /> {d.timing}
                      </span>
                    ) : null}

                    {d.description && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{d.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(d)} title="Edit" className="p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(d.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
