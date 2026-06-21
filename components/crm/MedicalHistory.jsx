'use client'
import { useState, useRef } from 'react'
import { History, Save, Upload, FileText, Download, Trash2 } from 'lucide-react'
import { Button, Card, Textarea } from '@/components/ui'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import { format } from 'date-fns'
import clsx from 'clsx'

// Free-text clinical sections (tabbed). Each stores { text, documents:[] } under
// record.custom_data.medical[key]. Shared by the Patient and Consultation pages,
// both bound to the SAME patient record, so edits stay in sync everywhere.
export const MEDICAL_SECTIONS = [
  { key: 'history',      label: 'Medical History',           placeholder: 'Past & chronic illnesses, family history, ongoing conditions…' },
  { key: 'medication',   label: 'Current Medication',        placeholder: 'Drug name, dosage, frequency, since when…' },
  { key: 'allergies',    label: 'Allergies',                 placeholder: 'Drug / food / environmental allergies and their reactions…' },
  { key: 'surgeries',    label: 'Surgery / Hospitalization', placeholder: 'Past surgeries & hospital admissions with dates…' },
  { key: 'lifestyle',    label: 'Lifestyle Habits',          placeholder: 'Smoking, alcohol, diet, exercise, sleep, occupational hazards…' },
  { key: 'immunization', label: 'Immunizations',             placeholder: 'Vaccinations received and dates…' },
  { key: 'notes',        label: 'Additional Notes',          placeholder: 'Any other relevant medical information…' },
]

const MAX_DOC_BYTES = 100 * 1024
const fmtSize = b => b >= 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`

// props:
//   record    — the patient/lead row ({ id, custom_data })
//   onPersist — async (nextCustomData) => void; parent saves to DB + updates state
//   onActivity- optional (message) => void; logged after a text save
//   disabled  — optional; render a placeholder instead (e.g. no patient linked)
export default function MedicalHistory({ record, onPersist, onActivity, disabled, disabledNote }) {
  const [medTab, setMedTab] = useState('history')
  const [medText, setMedText] = useState({})
  const [medSaving, setMedSaving] = useState(false)
  const [medDocBusy, setMedDocBusy] = useState(false)
  const fileRef = useRef(null)

  const medicalOf = () => record?.custom_data?.medical || {}
  const saveMedical = (medical) => onPersist({ ...(record?.custom_data || {}), medical })

  const handleSaveText = async (key) => {
    setMedSaving(true)
    try {
      const medical = { ...medicalOf() }
      const cur = medical[key] || {}
      medical[key] = { ...cur, text: medText[key] !== undefined ? medText[key] : (cur.text || '') }
      await saveMedical(medical)
      onActivity?.(`Medical info updated: ${MEDICAL_SECTIONS.find(s => s.key === key)?.label || key}`)
      toast({ type: 'success', title: 'Saved' })
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
    finally { setMedSaving(false) }
  }

  const handleDocPick = (e, key) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    const isImage = file.type.startsWith('image/'); const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) { toast({ type: 'error', title: 'Unsupported file', message: 'Only JPG/PNG images or PDF files are allowed.' }); return }
    if (file.size > MAX_DOC_BYTES) { toast({ type: 'error', title: 'File too large', message: 'File must be under 100 KB.' }); return }
    setMedDocBusy(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const doc = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
          name: file.name, type: file.type, size: file.size, data: reader.result, uploaded_at: new Date().toISOString(),
        }
        const medical = { ...medicalOf() }
        const cur = medical[key] || {}
        medical[key] = { ...cur, documents: [...(cur.documents || []), doc] }
        await saveMedical(medical)
        toast({ type: 'task', title: 'Document uploaded', message: file.name })
      } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
      finally { setMedDocBusy(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteDoc = async (key, docId) => {
    const ok = await showConfirm({ title: 'Delete this document?', confirmLabel: 'Delete' })
    if (!ok) return
    try {
      const medical = { ...medicalOf() }
      const cur = medical[key] || {}
      medical[key] = { ...cur, documents: (cur.documents || []).filter(d => d.id !== docId) }
      await saveMedical(medical)
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.message }) }
  }

  if (disabled) {
    return (
      <Card className="border-(--color-border) overflow-hidden">
        <div className="px-5 py-3.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-xs font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}><History size={13} /> Medical History</p>
        </div>
        <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {disabledNote || 'Convert this lead to a patient to record medical history.'}
        </div>
      </Card>
    )
  }

  const sec = MEDICAL_SECTIONS.find(s => s.key === medTab)
  const saved = medicalOf()[medTab] || {}
  const text = medText[medTab] !== undefined ? medText[medTab] : (saved.text || '')
  const dirty = medText[medTab] !== undefined && medText[medTab] !== (saved.text || '')
  const docs = saved.documents || []

  return (
    <Card className="border-(--color-border) overflow-hidden">
      <div className="px-5 py-3.5 border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
        <p className="text-xs font-700 uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}><History size={13} /> Medical History</p>
      </div>

      {/* Section sub-tabs */}
      <div className="flex overflow-x-auto border-b border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
        {MEDICAL_SECTIONS.map(s => {
          const d = medicalOf()[s.key]
          const filled = !!(d?.text?.trim()) || (d?.documents?.length > 0)
          return (
            <button key={s.key} onClick={() => setMedTab(s.key)}
              className={clsx('whitespace-nowrap flex items-center gap-1.5 px-4 py-3 text-xs font-600 border-b-2', medTab === s.key ? 'border-(--color-brand) bg-(--color-surface)' : 'border-transparent')}
              style={medTab === s.key ? { color: 'var(--color-brand)' } : { color: 'var(--color-text-muted)' }}>
              {s.label}
              {filled && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--color-brand)' }} />}
            </button>
          )
        })}
      </div>

      {/* Active section — 80% text / 20% documents */}
      <div className="p-5">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-full md:w-4/5 space-y-3">
            <Textarea label={sec.label} placeholder={sec.placeholder} rows={10}
              value={text} onChange={e => setMedText(t => ({ ...t, [medTab]: e.target.value }))} />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => handleSaveText(medTab)} disabled={medSaving || !dirty}>
                {medSaving ? 'Saving…' : <><Save size={13} /> Save</>}
              </Button>
            </div>
          </div>

          <div className="w-full md:w-1/5 md:border-l md:border-(--color-border) md:pl-4">
            <div className="flex items-center justify-between gap-1 mb-1">
              <p className="text-[10px] font-700 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Docs</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={e => handleDocPick(e, medTab)} />
              <button type="button" disabled={medDocBusy} onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-600 px-2 py-1 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-brand)' }}>
                <Upload size={12} /> {medDocBusy ? '…' : 'Add'}
              </button>
            </div>
            <p className="text-[9px] mb-2" style={{ color: 'var(--color-text-muted)' }}>PDF / JPG · under 100 KB</p>
            {docs.length === 0 ? (
              <p className="text-[11px] py-4 text-center rounded-lg border border-dashed border-(--color-border)" style={{ color: 'var(--color-text-muted)' }}>No files</p>
            ) : (
              <div className="space-y-2">
                {docs.map(d => (
                  <div key={d.id} className="p-2 rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
                    <div className="flex items-center gap-1.5">
                      {d.type?.startsWith('image/')
                        ? <img src={d.data} alt="" className="w-7 h-7 object-cover rounded border border-(--color-border) shrink-0" />
                        : <div className="w-7 h-7 rounded flex items-center justify-center border border-(--color-border) shrink-0" style={{ background: 'var(--color-surface)' }}><FileText size={13} style={{ color: 'var(--color-brand)' }} /></div>}
                      <p className="flex-1 min-w-0 text-[11px] font-600 truncate" style={{ color: 'var(--color-text-primary)' }} title={d.name}>{d.name}</p>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{fmtSize(d.size)}</span>
                      <div className="flex items-center gap-0.5">
                        <a href={d.data} download={d.name} className="p-1 rounded hover:bg-(--color-surface) transition-colors" style={{ color: 'var(--color-text-muted)' }} title="Download"><Download size={12} /></a>
                        <button type="button" onClick={() => handleDeleteDoc(medTab, d.id)} className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: 'var(--color-text-muted)' }} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
