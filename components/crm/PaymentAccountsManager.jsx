'use client'
import { useState } from 'react'
import {
  Landmark, Plus, Trash2, Pencil, Eye, EyeOff, X, ShieldCheck, Upload, Star,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { toast } from '@/lib/toast'
import { showConfirm } from '@/lib/confirm'
import { logAudit, AUDIT } from '@/lib/audit'
import { PaymentAccountPicker, PaymentDetailsCard, maskAccount } from '@/components/crm/PaymentInfo'

// Manage clinic payment/bank accounts (org.settings.payment_accounts).
// Self-contained: gating, audit, masking, QR upload, show/print. Mountable
// anywhere (e.g. a Billing "Setup" modal).

const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2)
const blank = () => ({
  id: uid(), label: '', account_holder: '', bank_name: '', account_number: '',
  ifsc: '', branch: '', upi_id: '', qr: '', notes: '', is_default: false,
})

function Field({ label, value, onChange, placeholder, mono, type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-600 mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-2.5 py-2 text-sm rounded-lg border outline-none focus:border-(--color-brand) ${mono ? 'font-mono' : ''}`}
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
    </label>
  )
}

export default function PaymentAccountsManager() {
  const { org, orgId, hasPermission, isReadOnly } = useOrg()
  const allowed = hasPermission('settings.organization')

  const [accounts, setAccounts] = useState(() => org?.settings?.payment_accounts || [])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [revealed, setRevealed] = useState({})
  const [showId, setShowId] = useState(null)

  if (!allowed) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <ShieldCheck size={28} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Access restricted</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Payment accounts can only be managed by organization administrators.
        </p>
      </div>
    )
  }

  const persist = (next) => updateOrganization(orgId, { settings: { ...(org?.settings || {}), payment_accounts: next } })
  const orgName = org?.settings?.name || org?.name || ''
  const showAcct = accounts.find(a => a.id === showId)

  const onQr = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { toast({ type: 'error', title: 'Image too large', message: 'Keep the QR image under 500 KB.' }); return }
    const r = new FileReader()
    r.onload = () => setForm(f => ({ ...f, qr: r.result }))
    r.readAsDataURL(file)
  }

  const save = async () => {
    if (!form.label.trim()) { toast({ type: 'error', title: 'Name required', message: 'Give this account a name.' }); return }
    setSaving(true)
    const exists = accounts.some(a => a.id === form.id)
    let next = exists ? accounts.map(a => (a.id === form.id ? form : a)) : [...accounts, { ...form, created_at: new Date().toISOString() }]
    if (form.is_default) next = next.map(a => ({ ...a, is_default: a.id === form.id }))
    try {
      await persist(next)
      await logAudit({
        action: AUDIT.SETTINGS_CHANGE, entityType: 'organization', entityId: orgId,
        description: `Payment account "${form.label}" ${exists ? 'updated' : 'added'}`,
        metadata: { account_id: form.id, action: exists ? 'update' : 'create' },
      })
      setAccounts(next); setForm(null)
      toast({ type: 'success', title: 'Saved', message: 'Payment account saved.' })
    } catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) }
    finally { setSaving(false) }
  }

  const remove = async (a) => {
    const ok = await showConfirm({ title: `Delete "${a.label}"?`, message: 'This payment account will be permanently removed.', confirmLabel: 'Delete', variant: 'danger' })
    if (!ok) return
    const next = accounts.filter(x => x.id !== a.id)
    try {
      await persist(next)
      await logAudit({ action: AUDIT.SETTINGS_CHANGE, entityType: 'organization', entityId: orgId, description: `Payment account "${a.label}" deleted`, metadata: { account_id: a.id, action: 'delete' } })
      setAccounts(next)
      if (showId === a.id) setShowId(null)
      toast({ type: 'success', title: 'Deleted' })
    } catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        {!form && (
          <Button size="sm" onClick={() => setForm(blank())} disabled={isReadOnly}>
            <Plus size={14} /> Add account
          </Button>
        )}
      </div>

      {/* Security notice */}
      <div className="flex gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}>
        <ShieldCheck size={15} className="shrink-0 mt-0.5" />
        <p>These details appear on patient invoices. Only admins can edit them, account numbers are masked in this list, and every change is recorded in <b>Settings → Logs</b>. Verify the account number carefully before saving.</p>
      </div>

      {/* Show / Print */}
      {accounts.length > 0 && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Show / print:</span>
            <PaymentAccountPicker accounts={accounts} value={showId} onChange={setShowId} />
          </div>
          {showAcct && <PaymentDetailsCard account={showAcct} orgName={orgName} onPrint />}
        </div>
      )}

      {/* Editor */}
      {form && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--color-brand)', background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{accounts.some(a => a.id === form.id) ? 'Edit account' : 'New account'}</p>
            <button type="button" onClick={() => setForm(null)} className="p-1 rounded-md hover:bg-(--color-surface-2)" style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
          </div>
          <Field label="Name / label *" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. Main Clinic Account" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Account holder" value={form.account_holder} onChange={v => setForm(f => ({ ...f, account_holder: v }))} placeholder="Name as per bank" />
            <Field label="Bank name" value={form.bank_name} onChange={v => setForm(f => ({ ...f, bank_name: v }))} placeholder="e.g. HDFC Bank" />
            <Field label="Account number" mono value={form.account_number} onChange={v => setForm(f => ({ ...f, account_number: v }))} placeholder="000000000000" />
            <Field label="IFSC" mono value={form.ifsc} onChange={v => setForm(f => ({ ...f, ifsc: v.toUpperCase() }))} placeholder="HDFC0000001" />
            <Field label="Branch" value={form.branch} onChange={v => setForm(f => ({ ...f, branch: v }))} placeholder="Branch name" />
            <Field label="UPI ID" mono value={form.upi_id} onChange={v => setForm(f => ({ ...f, upi_id: v }))} placeholder="name@bank" />
          </div>

          <div>
            <span className="block text-[11px] font-600 mb-1" style={{ color: 'var(--color-text-muted)' }}>Payment QR code</span>
            <div className="flex items-center gap-3">
              {form.qr
                ? <img src={form.qr} alt="QR" className="w-20 h-20 object-contain rounded-lg border" style={{ borderColor: 'var(--color-border)' }} />
                : <div className="w-20 h-20 rounded-lg border flex items-center justify-center" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}><Landmark size={20} /></div>}
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-1.5 text-xs font-700 px-2.5 py-1.5 rounded-lg border cursor-pointer hover:bg-(--color-surface-2)" style={{ borderColor: 'var(--color-border)', color: 'var(--color-brand)' }}>
                  <Upload size={12} /> Upload QR
                  <input type="file" accept="image/*" className="hidden" onChange={onQr} />
                </label>
                {form.qr && <button type="button" onClick={() => setForm(f => ({ ...f, qr: '' }))} className="block text-[11px]" style={{ color: '#dc2626' }}>Remove QR</button>}
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>PNG/JPG, under 500 KB</p>
              </div>
            </div>
          </div>

          <Field label="Notes (optional)" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="e.g. Use this for online payments only" />

          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={!!form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
            Set as default account
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setForm(null)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || isReadOnly}>{saving ? 'Saving…' : 'Save account'}</Button>
          </div>
        </div>
      )}

      {/* List */}
      {accounts.length === 0 && !form ? (
        <div className="rounded-xl border border-dashed py-12 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <Landmark size={26} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>No payment accounts yet</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Add your bank / UPI details to print them on invoices.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {accounts.map(a => {
            const reveal = revealed[a.id]
            return (
              <div key={a.id} className="rounded-xl border p-4 flex items-start justify-between gap-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-700 truncate" style={{ color: 'var(--color-text-primary)' }}>{a.label}</p>
                    {a.is_default && <span className="inline-flex items-center gap-1 text-[10px] font-700 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}><Star size={9} /> Default</span>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {a.bank_name || 'Bank'}{a.account_number ? ` · ${reveal ? a.account_number : maskAccount(a.account_number)}` : ''}
                  </p>
                  {a.upi_id && <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{a.upi_id}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.account_number && (
                    <button type="button" onClick={() => setRevealed(r => ({ ...r, [a.id]: !r[a.id] }))} title={reveal ? 'Hide' : 'Reveal'}
                      className="p-1.5 rounded-lg hover:bg-(--color-surface-2)" style={{ color: 'var(--color-text-muted)' }}>
                      {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                  <button type="button" onClick={() => setForm({ ...blank(), ...a })} disabled={isReadOnly} title="Edit"
                    className="p-1.5 rounded-lg hover:bg-(--color-surface-2) disabled:opacity-40" style={{ color: 'var(--color-text-muted)' }}>
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => remove(a)} disabled={isReadOnly} title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40" style={{ color: '#dc2626' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
