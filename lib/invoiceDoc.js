import { format } from 'date-fns'

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

// Build a standalone, printable HTML document for an invoice.
export function buildInvoiceHTML(inv, org, { autoPrint = false } = {}) {
  const orgName = org?.name || 'Clinic'
  const orgAddr = [org?.address, org?.city, org?.state, org?.pincode].filter(Boolean).join(', ')
  const patient = `${inv.patients?.first_name || ''} ${inv.patients?.last_name || ''}`.trim()
  const items = inv.invoice_items || []
  const subtotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0) || Number(inv.subtotal) || Number(inv.amount) || 0
  const discount = Number(inv.discount) || 0
  const tax = Number(inv.tax) || 0
  const total = Number(inv.total) || 0
  const paid = Number(inv.paid_amount) || 0
  const balance = total - paid
  const isPaid = balance <= 0 && total > 0

  const itemRows = items.length
    ? items.map(i => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${i.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${rupee(i.unit_price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${rupee(i.total)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:12px;color:#9ca3af;text-align:center">No items</td></tr>`

  const watermark = isPaid
    ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-40deg);font-size:96px;font-weight:900;color:rgba(16,185,129,0.08);pointer-events:none;letter-spacing:8px;white-space:nowrap">PAID</div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${inv.invoice_number}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:800px;margin:auto}@media print{body{padding:20px}}</style>
  </head><body>
  ${watermark}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #e5e7eb;margin-bottom:28px">
    <div>
      <div style="font-size:22px;font-weight:800;color:#111">${orgName}</div>
      ${orgAddr ? `<div style="margin-top:4px;font-size:12px;color:#6b7280">${orgAddr}</div>` : ''}
      ${org?.phone ? `<div style="font-size:12px;color:#6b7280">${org.phone}${org?.email ? ' · ' + org.email : ''}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:30px;font-weight:900;letter-spacing:3px;color:#6366f1">INVOICE</div>
      <div style="font-size:13px;color:#374151;margin-top:2px">${inv.invoice_number}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:28px">
    <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Bill To</div><div style="font-weight:600">${patient || '—'}</div></div>
    ${inv.doctor_name ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Doctor</div><div style="font-weight:600">${inv.doctor_name}</div></div>` : '<div></div>'}
    <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Invoice Date</div><div style="font-weight:600">${format(new Date(inv.created_at || Date.now()), 'dd MMM yyyy')}</div></div>
    ${inv.due_date ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:4px">Due Date</div><div style="font-weight:600">${format(new Date(inv.due_date), 'dd MMM yyyy')}</div></div>` : '<div></div>'}
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <thead><tr style="background:#f9fafb">
      <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb">Description</th>
      <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;width:70px">Qty</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;width:110px">Rate</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;width:120px">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end">
    <div style="width:260px">
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#374151"><span>Subtotal</span><span>${rupee(subtotal)}</span></div>
      ${discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#374151"><span>Discount</span><span style="color:#10b981">-${rupee(discount)}</span></div>` : ''}
      ${tax > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#374151"><span>Tax</span><span>${rupee(tax)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:10px 0 5px;font-size:16px;font-weight:800;border-top:2px solid #e5e7eb;margin-top:6px"><span>Total</span><span>${rupee(total)}</span></div>
      ${paid > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#10b981"><span>Amount Paid</span><span>-${rupee(paid)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:8px 12px;margin-top:6px;border-radius:8px;font-size:14px;font-weight:700;background:${isPaid ? '#f0fdf4' : '#fff7ed'};color:${isPaid ? '#059669' : '#b45309'}"><span>Balance Due</span><span>${isPaid ? rupee(0) : rupee(balance)}</span></div>
    </div>
  </div>
  ${inv.notes ? `<div style="margin-top:24px;padding:12px 16px;background:#f9fafb;border-radius:8px;font-size:12px;color:#374151"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">Thank you for choosing ${orgName}. Please retain this invoice for your records.</div>
  ${autoPrint ? '<script>window.onload=()=>{window.print()}</script>' : ''}
  </body></html>`
}

// Open the invoice in a new tab (optionally auto-trigger the print dialog).
export function openInvoice(inv, org, { print = false } = {}) {
  const html = buildInvoiceHTML(inv, org, { autoPrint: print })
  const w = window.open('', '_blank', 'width=860,height=960')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

// Download the invoice as a self-contained .html file.
export function downloadInvoice(inv, org) {
  const html = buildInvoiceHTML(inv, org)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${inv.invoice_number || 'invoice'}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
