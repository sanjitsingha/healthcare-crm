'use client'
import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Card } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import SectionHead from '@/components/crm/SectionHead'

const ENTITIES = [
  { id: 'leads',         label: 'Lead Page' },
  { id: 'patients',      label: 'Patient Page' },
  { id: 'consultations', label: 'Consultation Page' },
]

const SYSTEM_FIELDS = {
  leads: [
    { api_name: 'first_name',    display: 'First Name',        type: 'text',     note: '* One of first_name / phone / email required' },
    { api_name: 'last_name',     display: 'Last Name',         type: 'text',     note: '' },
    { api_name: 'name',          display: 'Full Name (alias)', type: 'text',     note: 'Auto-split into first_name + last_name' },
    { api_name: 'phone',         display: 'Phone',             type: 'text',     note: '* One of first_name / phone / email required' },
    { api_name: 'email',         display: 'Email',             type: 'email',    note: '* One of first_name / phone / email required' },
    { api_name: 'gender',        display: 'Gender',            type: 'text',     note: 'Male / Female / Other' },
    { api_name: 'date_of_birth', display: 'Date of Birth',     type: 'date',     note: 'YYYY-MM-DD' },
    { api_name: 'address',       display: 'Address',           type: 'text',     note: '' },
    { api_name: 'source',        display: 'Source',            type: 'text',     note: 'e.g. Website, Instagram' },
    { api_name: 'stage',         display: 'Stage',             type: 'text',     note: 'New / Contacted / Interested / Follow-up / Converted / Lost' },
    { api_name: 'priority',      display: 'Priority',          type: 'text',     note: 'Low / Medium / High / Urgent' },
    { api_name: 'notes',         display: 'Notes / Message',   type: 'text',     note: 'Alias for description' },
    { api_name: 'description',   display: 'Description',       type: 'text',     note: '' },
  ],
  patients: [
    { api_name: 'first_name',    display: 'First Name',        type: 'text',     note: '' },
    { api_name: 'last_name',     display: 'Last Name',         type: 'text',     note: '' },
    { api_name: 'phone',         display: 'Phone',             type: 'text',     note: '' },
    { api_name: 'email',         display: 'Email',             type: 'email',    note: '' },
    { api_name: 'gender',        display: 'Gender',            type: 'text',     note: 'Male / Female / Other' },
    { api_name: 'date_of_birth', display: 'Date of Birth',     type: 'date',     note: 'YYYY-MM-DD (month only: YYYY-MM-01)' },
    { api_name: 'address',       display: 'Address',           type: 'text',     note: '' },
    { api_name: 'blood_group',   display: 'Blood Group',       type: 'text',     note: 'A+ / A- / B+ / B- / O+ / O- / AB+ / AB-' },
    { api_name: 'marital_status',display: 'Marital Status',    type: 'text',     note: 'Single / Married / Widowed / Divorced' },
    { api_name: 'age',           display: 'Age',               type: 'number',   note: '' },
    { api_name: 'city',          display: 'City',              type: 'text',     note: '' },
    { api_name: 'state',         display: 'State',             type: 'text',     note: '' },
    { api_name: 'zip_code',      display: 'ZIP / Pincode',     type: 'text',     note: '' },
    { api_name: 'occupation',    display: 'Occupation',        type: 'text',     note: '' },
    { api_name: 'alt_phone',     display: 'Alternate Phone',   type: 'text',     note: '' },
    { api_name: 'whatsapp_phone',display: 'WhatsApp Number',   type: 'text',     note: '' },
  ],
  consultations: [
    { api_name: 'scheduled_at',            display: 'Date & Time',     type: 'datetime', note: 'ISO 8601 — e.g. 2026-06-21T10:30:00' },
    { api_name: 'doctor_id',               display: 'Doctor (ID)',     type: 'uuid',     note: 'UUID of the doctor record' },
    { api_name: 'consultation_fee',        display: 'Consultation Fee',type: 'number',   note: '' },
    { api_name: 'consultation_fee_status', display: 'Fee Status',      type: 'text',     note: 'pending / paid' },
    { api_name: 'payment_mode',            display: 'Payment Mode',    type: 'text',     note: 'cash / online' },
    { api_name: 'registration_fee',        display: 'Registration Fee',type: 'number',   note: '' },
    { api_name: 'registration_fee_status', display: 'Reg Fee Status',  type: 'text',     note: 'pending / paid' },
    { api_name: 'notes',                   display: 'Notes',           type: 'text',     note: '' },
    { api_name: 'status',                  display: 'Status',          type: 'text',     note: 'scheduled / completed / cancelled' },
  ],
}

function toApiName(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export default function ApiNamesPanel() {
  const { org } = useOrg()
  const settings = org?.settings || {}
  const [entity, setEntity] = useState('leads')

  const systemRows = SYSTEM_FIELDS[entity] || []

  // Auto-derive custom-module fields for the selected page (live from settings.modules).
  const used = new Set(systemRows.map(f => f.api_name))
  const moduleRows = []
  for (const m of (settings.modules || []).filter(mod => mod.page === entity)) {
    for (const f of (m.fields || [])) {
      let base = toApiName(f.label || '') || 'field'
      let name = base, n = 2
      while (used.has(name)) name = `${base}_${n++}`
      used.add(name)
      moduleRows.push({
        key: `${m.id}:${f.id}`,
        display: f.label || '(unnamed)',
        api_name: name,
        type: f.type || 'text',
        note: `Module: ${m.name}${m.active === false ? ' · inactive' : ''}`,
      })
    }
  }

  // Custom fields (settings.api_fields) — shared across all pages.
  const allCustom = Object.values(settings.api_fields || {})
    .flat()
    .filter((f, i, arr) => arr.findIndex(x => x.api_name === f.api_name) === i)

  const counts = [
    `${systemRows.length} system`,
    moduleRows.length ? `${moduleRows.length} module` : null,
    allCustom.length ? `${allCustom.length} custom` : null,
  ].filter(Boolean).join(' · ')

  const sectionRow = (label) => (
    <tr>
      <td colSpan={4} className="px-3 py-1.5" style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
        <span className="text-[10px] font-700 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </td>
    </tr>
  )
  const fieldRow = (f, tint) => (
    <tr key={f.key || f.api_name} style={{ borderTop: '1px solid var(--color-border)', background: tint || 'transparent' }}>
      <td className="px-3 py-2.5 font-500" style={{ color: 'var(--color-text-primary)' }}>{f.display}</td>
      <td className="px-3 py-2.5 font-mono font-600" style={{ color: 'var(--color-brand)' }}>{f.api_name}</td>
      <td className="px-3 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{f.type}</td>
      <td className="px-3 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{f.note || 'Stored in custom_data'}</td>
    </tr>
  )

  return (
    <Card className="p-5">
      <SectionHead icon={Lock} title="API Names"
        description="Field names for the public API. System fields are fixed; custom-module and custom fields are generated automatically and update as you add them." />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="text-xs font-600 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Select page</label>
        <select value={entity} onChange={e => setEntity(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', minWidth: 200 }}>
          {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{counts} field{used.size !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded-lg border border-(--color-border) overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr style={{ background: 'var(--color-surface-2)' }}>
              <th className="px-3 py-2.5 text-left font-600 w-48" style={{ color: 'var(--color-text-muted)' }}>Display Name</th>
              <th className="px-3 py-2.5 text-left font-600 w-44" style={{ color: 'var(--color-text-muted)' }}>API Name</th>
              <th className="px-3 py-2.5 text-left font-600 w-24" style={{ color: 'var(--color-text-muted)' }}>Type</th>
              <th className="px-3 py-2.5 text-left font-600" style={{ color: 'var(--color-text-muted)' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {systemRows.map((f, i) => (
              <tr key={f.api_name} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                <td className="px-3 py-2.5 font-500" style={{ color: 'var(--color-text-primary)' }}>{f.display}</td>
                <td className="px-3 py-2.5 font-mono font-600" style={{ color: 'var(--color-brand)' }}>{f.api_name}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{f.type}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{f.note}</td>
              </tr>
            ))}
            {moduleRows.length > 0 && sectionRow(`Custom module fields — ${entity}`)}
            {moduleRows.map(f => fieldRow(f, '#fef3c755'))}
            {allCustom.length > 0 && sectionRow('Custom fields — available on all pages')}
            {allCustom.map(f => fieldRow(f, 'var(--color-brand-50)33'))}
          </tbody>
        </table>
      </div>

      {moduleRows.length === 0 && allCustom.length === 0 && (
        <p className="mt-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Only system fields so far. Custom modules (Settings → Modules) and custom fields appear here automatically with generated API names.
        </p>
      )}
      {moduleRows.length > 0 && (
        <p className="mt-3 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          Module fields are stored under <code className="font-mono">custom_data.&lt;module&gt;.&lt;field&gt;</code>.
        </p>
      )}
    </Card>
  )
}
