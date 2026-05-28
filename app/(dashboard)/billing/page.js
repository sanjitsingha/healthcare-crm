'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Download, Filter, Search, DollarSign, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Button, Badge, Card, Modal, Input, Select, Spinner } from '@/components/ui'
import { getInvoices, createInvoice, getPatients, getAppointments } from '@/lib/supabase/queries'
import { format } from 'date-fns'
import clsx from 'clsx'

function CreateInvoiceModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    patient_id: '', appointment_id: '', amount: '',
    tax: 0, due_date: '', invoice_number: `INV-${Date.now().toString().slice(-6)}`
  })
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([getPatients(), getAppointments()]).then(([p, a]) => {
        setPatients(p || [])
        setAppointments(a || [])
      })
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return
    setSaving(true)
    const amount = parseFloat(form.amount)
    const tax = parseFloat(form.tax) || 0
    try {
      const inv = await createInvoice({
        ...form,
        organization_id: '00000000-0000-0000-0000-000000000000',
        amount,
        tax,
        total: amount + tax,
        status: 'Draft'
      })
      onCreated(inv)
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Invoice" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Invoice Number" value={form.invoice_number} readOnly />
          <Select label="Select Patient *" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} required
            options={[{ value: '', label: 'Select patient...' }, ...patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name || ''}` }))]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          <Input label="Tax (₹)" type="number" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          <Select label="Linked Appointment" value={form.appointment_id} onChange={e => setForm(f => ({ ...f, appointment_id: e.target.value }))}
            options={[{ value: '', label: 'Select appointment...' }, ...appointments.map(a => ({ value: a.id, label: `${format(new Date(a.scheduled_at), 'MMM d')} - ${a.patients?.first_name}` }))]} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Generating...' : 'Generate Invoice'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvoices()
      setInvoices(data || [])
    } catch { setInvoices([]) }
    setLoading(false)
  }, [])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  const stats = {
    total: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
    paid: invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.total || 0), 0),
    pending: invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + (i.total || 0), 0),
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Billing & Finance</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Manage invoices, payments and financial reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm"><Download size={14} /> Reports</Button>
          <Button onClick={() => setCreateOpen(true)} className="shadow-lg shadow-[var(--color-brand)]/20">
            <Plus size={16} /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Finance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-[var(--color-brand)] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand)]"><DollarSign size={20} /></div>
            <div>
              <p className="text-xs font-700 text-gray-400 uppercase tracking-wider">Total Billed</p>
              <p className="text-2xl font-900 text-[var(--color-text-primary)]">₹{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle size={20} /></div>
            <div>
              <p className="text-xs font-700 text-gray-400 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-900 text-[var(--color-text-primary)]">₹{stats.paid.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-l-amber-500 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><Clock size={20} /></div>
            <div>
              <p className="text-xs font-700 text-gray-400 uppercase tracking-wider">Outstanding</p>
              <p className="text-2xl font-900 text-[var(--color-text-primary)]">₹{stats.pending.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-3 border-[var(--color-border)] bg-white/50">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all"
              placeholder="Search invoices by number or patient name..."
            />
          </div>
          <Button variant="secondary" size="sm"><Filter size={14} /> Filter</Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : (
        <Card className="p-0 overflow-hidden border-[var(--color-border)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-[var(--color-border)]">
                  {['Invoice #', 'Patient', 'Date', 'Due Date', 'Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-[11px] font-700 uppercase tracking-widest text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-700 text-[var(--color-text-primary)]">{inv.invoice_number}</td>
                    <td className="px-6 py-4">
                      <p className="font-600 text-[var(--color-text-primary)]">{inv.patients?.first_name} {inv.patients?.last_name || ''}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)]">{format(new Date(inv.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)]">
                      {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 font-800 text-[var(--color-text-primary)]">₹{inv.total?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <Badge className={clsx(
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        inv.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                      )}>{inv.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all text-gray-400">
                          <Download size={14} />
                        </button>
                        <button className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-100 transition-all text-gray-400">
                          <FileText size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoices.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-sm font-600 text-[var(--color-text-muted)]">No invoices generated yet.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCreateOpen(true)}>Create your first invoice</Button>
            </div>
          )}
        </Card>
      )}

      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { loadInvoices(); setCreateOpen(false) }}
      />
    </div>
  )
}
