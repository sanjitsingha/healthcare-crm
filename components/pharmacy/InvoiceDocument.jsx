'use client'
import { format, differenceInYears } from 'date-fns'

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

// ── Data-layout library ────────────────────────────────────────
// Each entry controls ONLY how the data block is arranged:
//   invoice id + date/time · patient details · item table · totals · signatory.
// The header/footer come from the uploaded letterhead background.
export const INVOICE_LAYOUTS = [
  { id: 'classic', name: 'Classic', desc: 'Meta top-right, patient block left, full table with disc & tax.' },
  { id: 'compact', name: 'Compact', desc: 'Tight meta row, lean table — item, qty, rate, amount.' },
  { id: 'modern',  name: 'Modern',  desc: 'Accent meta bar and table header, bold totals box.' },
]

export const DEFAULT_MARGINS = { top: 45, bottom: 35, side: 18 }

// Default template config (used when an org hasn't designed one yet).
export const defaultInvoiceTemplate = () => ({
  layout: 'classic',
  letterheadUrl: '',
  margins: { ...DEFAULT_MARGINS },
  active: false,
})

// Dummy sale used by the template designer preview.
export const DUMMY_SALE = {
  sale_code: 'INV-0042',
  created_at: new Date().toISOString(),
  customer_name: 'Ramesh Kumar',
  customer_phone: '+91 98765 43210',
  payment_status: 'due',
  payment_mode: 'cash',
  amount_paid: 300,
  subtotal: 540,
  discount_total: 40,
  tax_total: 25,
  total: 525,
  patients: {
    patient_code: 'PT-00123',
    first_name: 'Ramesh',
    last_name: 'Kumar',
    gender: 'Male',
    date_of_birth: '1990-04-12',
    address: '12 MG Road, Park Street, Kolkata 700016',
    phone: '+91 98765 43210',
  },
  pharmacy_sale_items: [
    { name: 'Paracetamol 500mg', item_code: 'MED-0001', quantity: 2, unit_price: 30, discount_percent: 5, tax_percent: 5, line_total: 59.85 },
    { name: 'Amoxicillin 250mg', item_code: 'MED-0014', quantity: 1, unit_price: 120, discount_percent: 0, tax_percent: 12, line_total: 134.4 },
    { name: 'Cough Syrup 100ml', item_code: 'MED-0027', quantity: 3, unit_price: 95, discount_percent: 10, tax_percent: 0, line_total: 256.5 },
  ],
}

const FONT = 'Arial, Helvetica, sans-serif'
const LABEL = { fontSize: '9.5px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }

const thStyle = (align, extra) => ({
  textAlign: align, fontSize: '10px', color: '#777',
  textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 4px',
  borderBottom: '1px solid #d1d5db', ...extra,
})
const tdStyle = (align) => ({
  textAlign: align, padding: '7px 4px', color: '#333', fontSize: '12px',
  borderBottom: '1px solid #f0f1f3', verticalAlign: 'top', lineHeight: 1.45,
})

function TotalRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: color || '#555', padding: '3px 0' }}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}

// ── Shared content pieces ──────────────────────────────────────
function Meta({ sale, accent, band }) {
  return (
    <div style={band
      ? { background: accent, color: '#fff', padding: '5mm 6mm', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
      : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ ...LABEL, color: band ? 'rgba(255,255,255,0.85)' : '#888' }}>Invoice</p>
        <p style={{ fontSize: '16px', marginTop: '2px', color: band ? '#fff' : '#111' }}>{sale.sale_code || '—'}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ ...LABEL, color: band ? 'rgba(255,255,255,0.85)' : '#888' }}>Date &amp; time</p>
        <p style={{ fontSize: '12.5px', marginTop: '2px', color: band ? '#fff' : '#333' }}>{format(new Date(sale.created_at), 'dd MMM yyyy, h:mm a')}</p>
      </div>
    </div>
  )
}

// Practo-style patient details + payment summary.
function PatientBlock({ sale }) {
  const p = sale.patients
  const name = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : (sale.customer_name || 'Walk-in customer')
  const age = p?.date_of_birth ? differenceInYears(new Date(), new Date(p.date_of_birth)) : null
  const ageSex = [age != null ? `${age} yrs` : null, p?.gender].filter(Boolean).join(' · ')
  const phone = p?.phone || sale.customer_phone

  const rows = [
    ['Name', name],
    ['Patient ID', p?.patient_code],
    ['Age / Sex', ageSex],
    ['Phone', phone],
    ['Address', p?.address],
  ].filter(([, v]) => v)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10mm', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ ...LABEL, marginBottom: '4px' }}>Patient details</p>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td style={{ fontSize: '11px', color: '#999', padding: '2px 14px 2px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{k}</td>
                <td style={{ fontSize: '12px', color: '#222', padding: '2px 0', lineHeight: 1.4 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ ...LABEL, marginBottom: '4px' }}>Payment</p>
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '11px',
          ...(sale.payment_status === 'paid' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fef3c7', color: '#b45309' }),
        }}>{sale.payment_status === 'paid' ? 'Paid' : 'Due'}</span>
        {sale.payment_mode && <p style={{ fontSize: '12px', color: '#555', marginTop: '4px', textTransform: 'capitalize' }}>{sale.payment_mode}</p>}
      </div>
    </div>
  )
}

function Totals({ sale, balanceDue, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '75mm' }}>
        <TotalRow label="Subtotal" value={money(sale.subtotal)} />
        {Number(sale.discount_total) > 0 && <TotalRow label="Discount" value={`− ${money(sale.discount_total)}`} />}
        {Number(sale.tax_total) > 0 && <TotalRow label="Tax" value={`+ ${money(sale.tax_total)}`} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${accent}`, paddingTop: '6px', marginTop: '4px', fontSize: '16px', color: accent }}>
          <span>Total</span><span>{money(sale.total)}</span>
        </div>
        {sale.payment_status === 'due' && (
          <>
            <TotalRow label="Paid so far" value={money(sale.amount_paid)} color="#b45309" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#b91c1c' }}>
              <span>Balance due</span><span>{money(balanceDue)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Signature() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12mm' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '45mm', borderTop: '1px solid #999', marginBottom: '3px' }} />
        <p style={{ fontSize: '10.5px', color: '#888' }}>Authorised Signatory</p>
      </div>
    </div>
  )
}

// ── Item tables (per layout) ───────────────────────────────────
function ClassicTable({ items }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle('left')}>Item</th><th style={thStyle('right')}>Qty</th><th style={thStyle('right')}>Price</th>
          <th style={thStyle('right')}>Disc</th><th style={thStyle('right')}>Tax</th><th style={thStyle('right')}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i, idx) => (
          <tr key={idx}>
            <td style={tdStyle('left')}>{i.name}{i.item_code && <span style={{ color: '#aaa', fontSize: '10.5px' }}> ({i.item_code})</span>}</td>
            <td style={tdStyle('right')}>{i.quantity}</td>
            <td style={tdStyle('right')}>{money(i.unit_price)}</td>
            <td style={tdStyle('right')}>{Number(i.discount_percent) > 0 ? `${i.discount_percent}%` : '—'}</td>
            <td style={tdStyle('right')}>{Number(i.tax_percent) > 0 ? `${i.tax_percent}%` : '—'}</td>
            <td style={tdStyle('right')}>{money(i.line_total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CompactTable({ items }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...thStyle('left'), width: '8mm' }}>#</th><th style={thStyle('left')}>Item</th>
          <th style={thStyle('right')}>Qty</th><th style={thStyle('right')}>Rate</th><th style={thStyle('right')}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i, idx) => (
          <tr key={idx}>
            <td style={{ ...tdStyle('left'), color: '#bbb' }}>{idx + 1}</td>
            <td style={tdStyle('left')}>{i.name}</td>
            <td style={tdStyle('right')}>{i.quantity}</td>
            <td style={tdStyle('right')}>{money(i.unit_price)}</td>
            <td style={tdStyle('right')}>{money(i.line_total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ModernTable({ items, accent }) {
  const h = (align) => thStyle(align, { color: accent, border: 'none', padding: '8px 6px' })
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: `${accent}14` }}>
          <th style={h('left')}>Item</th><th style={h('right')}>Qty</th><th style={h('right')}>Price</th>
          <th style={h('right')}>Disc</th><th style={h('right')}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i, idx) => (
          <tr key={idx}>
            <td style={tdStyle('left')}>{i.name}{i.item_code && <span style={{ color: '#aaa', fontSize: '10.5px' }}> ({i.item_code})</span>}</td>
            <td style={tdStyle('right')}>{i.quantity}</td>
            <td style={tdStyle('right')}>{money(i.unit_price)}</td>
            <td style={tdStyle('right')}>{Number(i.discount_percent) > 0 ? `${i.discount_percent}%` : '—'}</td>
            <td style={tdStyle('right')}>{money(i.line_total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Document ───────────────────────────────────────────────────
// Renders the data block from a sale + template config. The caller wraps
// this inside the A4 sheet; here we apply the mm margins that position the
// block between the printed header & footer.
export default function InvoiceDocument({ sale, template, accent = '#2563eb' }) {
  const t = template || defaultInvoiceTemplate()
  const layout = t.layout || 'classic'
  const m = t.margins || DEFAULT_MARGINS
  const band = layout === 'modern'

  const items = sale.pharmacy_sale_items || []
  const balanceDue = Math.max(0, (Number(sale.total) || 0) - (Number(sale.amount_paid) || 0))

  return (
    <div style={{
      position: 'absolute',
      top: `${m.top}mm`, bottom: `${m.bottom}mm`, left: `${m.side}mm`, right: `${m.side}mm`,
      display: 'flex', flexDirection: 'column', gap: '7mm', fontFamily: FONT,
    }}>
      <Meta sale={sale} accent={accent} band={band} />
      <PatientBlock sale={sale} />
      {layout === 'classic' && <ClassicTable items={items} />}
      {layout === 'compact' && <CompactTable items={items} />}
      {layout === 'modern' && <ModernTable items={items} accent={accent} />}
      <Totals sale={sale} balanceDue={balanceDue} accent={band ? accent : '#111'} />
      <Signature />
    </div>
  )
}

// The A4 sheet wrapper (background letterhead + relative positioning context).
// Shared by the live invoice page and the designer preview so they match exactly.
export function InvoiceSheet({ template, children, idAttr }) {
  const letterhead = template?.letterheadUrl
  return (
    <div id={idAttr} style={{
      position: 'relative', width: '210mm', height: '297mm', background: '#fff', color: '#111',
      fontFamily: FONT, overflow: 'hidden',
      ...(letterhead ? {
        backgroundImage: `url(${letterhead})`, backgroundSize: '210mm 297mm',
        backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      } : {}),
      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
    }}>
      {children}
    </div>
  )
}
