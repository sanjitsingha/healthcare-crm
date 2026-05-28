'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, User, Phone, Calendar, MoreHorizontal, Download, Filter } from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Select, Spinner, Avatar } from '@/components/ui'
import { getPatients, createPatient } from '@/lib/supabase/queries'
import Link from 'next/link'
import { format } from 'date-fns'

function CreatePatientModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    gender: 'Male', date_of_birth: '', address: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim()) return
    setSaving(true)
    try {
      const patient = await createPatient({
        ...form,
        organization_id: '00000000-0000-0000-0000-000000000000'
      })
      onCreated(patient)
      setForm({ first_name: '', last_name: '', email: '', phone: '', gender: 'Male', date_of_birth: '', address: '' })
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register New Patient" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
          <Input label="Last Name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Email Address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone Number *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Gender" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
            options={['Male','Female','Other'].map(s => ({ value: s, label: s }))} />
          <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
        </div>
        <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Registering...' : 'Register Patient'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    getPatients({ search })
      .then(data => { if (active) setPatients(data || []) })
      .catch(() => { if (active) setPatients([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [search])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Patients</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Manage your patient records and medical history</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Patient
        </Button>
      </div>

      <Card className="p-3 border-[var(--color-border)]">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all"
              placeholder="Search patients by name, phone or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm"><Filter size={14} /> Filters</Button>
            <Button variant="secondary" size="sm"><Download size={14} /> Export</Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(p => (
            <Link key={p.id} href={`/patients/${p.id}`}>
              <Card className="p-5 hover:border-[var(--color-brand-light)] transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${p.first_name} ${p.last_name || ''}`} size="lg" />
                    <div className="min-w-0">
                      <h3 className="font-700 text-sm truncate group-hover:text-[var(--color-brand)] transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                        {p.first_name} {p.last_name || ''}
                      </h3>
                      <p className="text-[10px] uppercase font-600 tracking-tight" style={{ color: 'var(--color-text-muted)' }}>{p.gender} · {p.date_of_birth ? format(new Date(p.date_of_birth), 'd MMM yyyy') : 'Age N/A'}</p>
                    </div>
                  </div>
                  <Badge>{p.status}</Badge>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <Phone size={12} className="text-[var(--color-text-muted)]" />
                    <span>{p.phone || 'No phone'}</span>
                  </div>
                  {p.email && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <User size={12} className="text-[var(--color-text-muted)]" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <Calendar size={12} className="text-[var(--color-text-muted)]" />
                    <span>Registered: {format(new Date(p.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button className="text-[10px] font-700 text-[var(--color-brand)] uppercase tracking-widest hover:underline">View Profile</button>
                </div>
              </Card>
            </Link>
          ))}
          {patients.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed rounded-xl">
              <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>No patients found.</p>
            </div>
          )}
        </div>
      )}

      <CreatePatientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { loadPatients(); setCreateOpen(false) }}
      />
    </div>
  )
}
