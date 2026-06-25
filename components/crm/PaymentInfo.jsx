'use client'
import { useState } from 'react'
import { ChevronDown, Check, Landmark, Printer } from 'lucide-react'

// Shared helpers + UI for clinic payment/bank accounts (stored in
// org.settings.payment_accounts). Reusable on invoices/receipts: pick an
// account from the dropdown, then show or print its details + QR.

export const maskAccount = (num) => {
  const s = String(num || '').replace(/\s+/g, '')
  if (!s) return ''
  return s.length <= 4 ? s : `${'•'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

// Open a clean print window for a single account (avoids printing the app chrome).
export function printPaymentAccount(acct, orgName = '') {
  if (!acct) return
  const row = (label, val) => val ? `<tr><td class="l">${esc(label)}</td><td class="v">${esc(val)}</td></tr>` : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(acct.label || 'Payment details')}</title>
  <style>
    *{box-sizing:border-box} body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#13163a;margin:0;padding:32px}
    .card{max-width:460px;margin:0 auto;border:1px solid #e6e8f2;border-radius:14px;padding:24px}
    h1{font-size:18px;margin:0 0 2px} .sub{color:#787da0;font-size:12px;margin:0 0 18px}
    table{width:100%;border-collapse:collapse;font-size:13px} td{padding:6px 0;vertical-align:top}
    td.l{color:#787da0;width:140px} td.v{font-weight:600;font-family:ui-monospace,monospace}
    .qr{margin-top:18px;text-align:center} .qr img{width:180px;height:180px;object-fit:contain;border:1px solid #e6e8f2;border-radius:10px;padding:6px}
    .note{margin-top:14px;font-size:12px;color:#3c4163;white-space:pre-wrap}
  </style></head><body>
  <div class="card">
    ${orgName ? `<p class="sub">${esc(orgName)}</p>` : ''}
    <h1>${esc(acct.label || 'Payment details')}</h1>
    <p class="sub">Bank / payment details</p>
    <table>
      ${row('Account holder', acct.account_holder)}
      ${row('Bank', acct.bank_name)}
      ${row('Account number', acct.account_number)}
      ${row('IFSC', acct.ifsc)}
      ${row('Branch', acct.branch)}
      ${row('UPI ID', acct.upi_id)}
    </table>
    ${acct.qr ? `<div class="qr"><img src="${esc(acct.qr)}" alt="QR"/></div>` : ''}
    ${acct.notes ? `<div class="note">${esc(acct.notes)}</div>` : ''}
  </div>
  <script>window.onload=function(){window.print()}</script>
  </body></html>`
  const w = window.open('', '_blank', 'width=560,height=720')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

// Dropdown to choose one of the configured accounts.
export function PaymentAccountPicker({ accounts = [], value, onChange, placeholder = 'Select payment account…' }) {
  const [open, setOpen] = useState(false)
  const sel = accounts.find(a => a.id === value)
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="relative z-20 inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-600 transition-colors hover:bg-(--color-surface-2)"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
        <Landmark size={14} style={{ color: 'var(--color-brand)' }} />
        {sel ? sel.label : placeholder}
        <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl overflow-hidden z-20 max-h-72 overflow-y-auto"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }}>
          {accounts.length === 0 && (
            <p className="px-3.5 py-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No payment accounts yet.</p>
          )}
          {accounts.map(a => (
            <button key={a.id} type="button" onClick={() => { onChange?.(a.id); setOpen(false) }}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-(--color-surface-2) transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}>
              <span className="min-w-0">
                <span className="block truncate" style={{ color: 'var(--color-text-primary)' }}>{a.label}</span>
                <span className="block text-[11px] truncate font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  {a.bank_name || a.upi_id || maskAccount(a.account_number)}
                </span>
              </span>
              {value === a.id && <Check size={14} className="shrink-0" style={{ color: 'var(--color-brand)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Read-only details block for showing on screen / inside an invoice.
export function PaymentDetailsCard({ account, orgName, onPrint }) {
  if (!account) return null
  const Row = ({ label, value }) => value ? (
    <div className="flex gap-3 py-1 text-sm">
      <span className="w-32 shrink-0" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="font-600 font-mono break-all" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  ) : null
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{account.label}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Bank / payment details</p>
        </div>
        {onPrint && (
          <button type="button" onClick={() => printPaymentAccount(account, orgName)}
            className="inline-flex items-center gap-1.5 text-xs font-700 px-2.5 py-1.5 rounded-lg border hover:bg-(--color-surface-2) transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-brand)' }}>
            <Printer size={12} /> Print
          </button>
        )}
      </div>
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Row label="Account holder" value={account.account_holder} />
          <Row label="Bank" value={account.bank_name} />
          <Row label="Account number" value={account.account_number} />
          <Row label="IFSC" value={account.ifsc} />
          <Row label="Branch" value={account.branch} />
          <Row label="UPI ID" value={account.upi_id} />
        </div>
        {account.qr && (
          <img src={account.qr} alt="Payment QR"
            className="w-28 h-28 object-contain rounded-lg border shrink-0" style={{ borderColor: 'var(--color-border)' }} />
        )}
      </div>
      {account.notes && <p className="text-xs mt-2 whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{account.notes}</p>}
    </div>
  )
}
