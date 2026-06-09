/* Generates HealthCRM-Pitch-Deck.pptx (run: node scripts/gen-deck.js) */
const PptxGenJS = require('pptxgenjs')

const BRAND = '21297E'
const ACCENT = '3A43B5'
const LIGHT = 'EEF0FB'
const BG = 'FBFBFE'
const DARK = '13163A'
const MUTED = '565D82'
const WHITE = 'FFFFFF'
const GREEN = '10B981'
const FONT = 'Segoe UI'

const pptx = new PptxGenJS()
pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5
pptx.author = 'HealthCRM'
pptx.title = 'HealthCRM Pitch Deck'
const W = 13.33, H = 7.5

// ── helpers ──────────────────────────────────────────────
function eyebrow(slide, text) {
  slide.addText(text.toUpperCase(), { x: 0.7, y: 0.55, w: 8, h: 0.3, fontSize: 12, bold: true, color: ACCENT, charSpacing: 2, fontFace: FONT })
}
function heading(slide, text) {
  slide.addText(text, { x: 0.7, y: 0.85, w: 12, h: 0.9, fontSize: 30, bold: true, color: DARK, fontFace: FONT })
}
function pageNum(slide, n) {
  slide.addText(String(n), { x: W - 0.8, y: H - 0.5, w: 0.4, h: 0.3, fontSize: 10, color: MUTED, align: 'right', fontFace: FONT })
  slide.addText('HealthCRM', { x: 0.7, y: H - 0.5, w: 3, h: 0.3, fontSize: 10, color: MUTED, fontFace: FONT })
}
function base(n) {
  const s = pptx.addSlide()
  s.background = { color: BG }
  if (n) pageNum(s, n)
  return s
}
function bullets(slide, items, opts = {}) {
  const x = opts.x ?? 0.75, y = opts.y ?? 2.0, w = opts.w ?? 11.8
  slide.addText(
    items.map(t => ({ text: t, options: { bullet: { code: '2022', indent: 18 }, color: opts.color || MUTED, fontSize: opts.fontSize || 17, paraSpaceAfter: 10, fontFace: FONT } })),
    { x, y, w, h: opts.h ?? 4.5, valign: 'top' }
  )
}
// card grid
function cards(slide, list, { cols = 3, x0 = 0.7, y0 = 2.0, gx = 0.35, gy = 0.35, cw, ch = 1.55 } = {}) {
  cw = cw || (W - x0 * 2 - gx * (cols - 1)) / cols
  list.forEach((c, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const x = x0 + col * (cw + gx), y = y0 + row * (ch + gy)
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: WHITE }, line: { color: 'E2E5F0', width: 1 }, shadow: { type: 'outer', color: 'C9CCE6', blur: 6, offset: 2, angle: 90, opacity: 0.4 } })
    slide.addText(c.t, { x: x + 0.22, y: y + 0.18, w: cw - 0.44, h: 0.4, fontSize: 14.5, bold: true, color: BRAND, fontFace: FONT })
    slide.addText(c.d, { x: x + 0.22, y: y + 0.6, w: cw - 0.44, h: ch - 0.7, fontSize: 11.5, color: MUTED, fontFace: FONT, valign: 'top' })
  })
}

// ── 1. Cover ─────────────────────────────────────────────
;(() => {
  const s = pptx.addSlide()
  s.background = { color: BRAND }
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { type: 'solid', color: BRAND } })
  // accent stripe
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 5.0, w: W, h: 0.06, fill: { color: ACCENT } })
  s.addText('HealthCRM', { x: 0.9, y: 2.5, w: 11, h: 1.1, fontSize: 54, bold: true, color: WHITE, fontFace: FONT })
  s.addText('The all-in-one CRM built for clinics & healthcare practices', { x: 0.9, y: 3.65, w: 11, h: 0.6, fontSize: 20, color: 'C9CEF2', fontFace: FONT })
  s.addText('Capture leads → convert to patients → manage care → get paid — in one place.', { x: 0.9, y: 4.25, w: 11, h: 0.5, fontSize: 14, color: 'AAB2E8', fontFace: FONT })
  s.addText('Product Pitch  ·  2026  ·  Confidential', { x: 0.9, y: 6.4, w: 11, h: 0.4, fontSize: 12, color: 'AAB2E8', fontFace: FONT })
})()

// ── 2. Problem ───────────────────────────────────────────
;(() => {
  const s = base(2); eyebrow(s, 'The Problem'); heading(s, 'Clinics run on a patchwork of tools')
  bullets(s, [
    'Leads come from WhatsApp, calls, ads and forms — and slip through the cracks.',
    'No single, searchable view of a patient’s full journey and history.',
    'Follow-ups and appointment reminders are manual and easily missed.',
    'Generic CRMs aren’t built for clinical workflows (consultations, doctors, visits).',
    'Data is scattered across spreadsheets, paper, and disconnected apps.',
  ])
})()

// ── 3. Solution ──────────────────────────────────────────
;(() => {
  const s = base(3); eyebrow(s, 'The Solution'); heading(s, 'One platform, purpose-built for healthcare')
  s.addText('HealthCRM unifies the entire patient lifecycle — from first inquiry to final payment — with automation and integrations that fit how clinics actually work.',
    { x: 0.75, y: 1.95, w: 11.8, h: 0.9, fontSize: 16, color: MUTED, fontFace: FONT })
  cards(s, [
    { t: 'Capture', d: 'Auto-collect leads from forms, ads, WhatsApp & website.' },
    { t: 'Convert', d: 'Pipeline, tags, follow-ups — turn inquiries into patients.' },
    { t: 'Care', d: 'Patient records, appointments, consultations & history.' },
    { t: 'Bill', d: 'Invoices and payments tied to each patient.' },
    { t: 'Automate', d: 'Rules + reminders so nothing falls through.' },
    { t: 'Understand', d: 'Live reports on conversion, sources & revenue.' },
  ], { cols: 3, y0: 3.0, ch: 1.5 })
})()

// ── 4. Capabilities (built) ──────────────────────────────
;(() => {
  const s = base(4); eyebrow(s, 'Product'); heading(s, 'What’s already built')
  cards(s, [
    { t: 'Leads & Pipeline', d: 'Stages, priority, sources, tags, bulk actions, custom fields, Kanban & table views.' },
    { t: 'Patients', d: 'Profiles, medical history, auto patient IDs, linked lead↔patient timeline.' },
    { t: 'Appointments', d: 'Book, confirm, reschedule; auto-reminders; shared across lead & patient.' },
    { t: 'Follow-ups', d: 'Card view + Google-Sheets-style spreadsheet view; outcomes & next steps.' },
    { t: 'Consultations', d: 'Clinical visit records — diagnosis, treatment, visit details.' },
    { t: 'Custom Modules', d: 'No-code sections & fields on leads or patients.' },
    { t: 'Reports', d: 'Interactive charts: pipeline, sources, revenue, team, date & person filters.' },
    { t: 'Notifications', d: 'Real-time toasts + notification center across all devices.' },
    { t: 'Settings', d: 'Team, tags, modules, rules, theming, configurable patient IDs.' },
  ], { cols: 3, y0: 1.9, ch: 1.5 })
})()

// ── 5. Lead capture & integrations ───────────────────────
;(() => {
  const s = base(5); eyebrow(s, 'Integrations'); heading(s, 'Never lose a lead')
  s.addText('Submissions from anywhere become leads automatically, with smart field mapping.',
    { x: 0.75, y: 1.9, w: 11.8, h: 0.5, fontSize: 16, color: MUTED, fontFace: FONT })
  cards(s, [
    { t: 'Google Forms', d: 'Apps Script → instant lead capture.' },
    { t: 'WordPress', d: 'One plugin captures every form plugin (CF7, WPForms, Elementor…).' },
    { t: 'Meta Lead Ads', d: 'Facebook & Instagram lead-gen (planned).' },
    { t: 'Zapier + Webhook', d: 'Connect 6,000+ apps via inbound webhook.' },
    { t: 'Smart Field Mapping', d: 'Map any form field to the right lead field.' },
    { t: 'Public Docs', d: 'Self-serve setup guides at /docs.' },
  ], { cols: 3, y0: 2.6, ch: 1.5 })
})()

// ── 6. Automation & notifications ────────────────────────
;(() => {
  const s = base(6); eyebrow(s, 'Automation'); heading(s, 'Work happens automatically')
  bullets(s, [
    'Rules engine: when an event happens → check conditions → run an action (e.g., auto-advance stage, add a tag).',
    'Real-time notifications: every key event surfaces as a toast on every open device, org-wide.',
    'Notification center with unread badge, history, and 30-day auto-cleanup.',
    'Reminders for due/overdue follow-ups, tasks, and upcoming appointments.',
    'Auto-created follow-up tasks and appointment reminders.',
  ])
})()

// ── 7. How it works ──────────────────────────────────────
;(() => {
  const s = base(7); eyebrow(s, 'How it works'); heading(s, 'From inquiry to insight')
  const steps = ['Capture lead', 'Qualify & follow up', 'Convert to patient', 'Appointments & consults', 'Billing', 'Reports & insights']
  const n = steps.length, gap = 0.3
  const cw = (W - 1.4 - gap * (n - 1)) / n
  steps.forEach((t, i) => {
    const x = 0.7 + i * (cw + gap)
    s.addShape(pptx.ShapeType.roundRect, { x, y: 3.0, w: cw, h: 1.5, rectRadius: 0.08, fill: { color: i % 2 ? ACCENT : BRAND }, line: { type: 'none' } })
    s.addText(String(i + 1), { x, y: 3.15, w: cw, h: 0.5, fontSize: 22, bold: true, color: 'AAB2E8', align: 'center', fontFace: FONT })
    s.addText(t, { x: x + 0.1, y: 3.6, w: cw - 0.2, h: 0.8, fontSize: 12.5, bold: true, color: WHITE, align: 'center', valign: 'top', fontFace: FONT })
    if (i < n - 1) s.addText('→', { x: x + cw - 0.05, y: 3.5, w: gap + 0.1, h: 0.5, fontSize: 16, color: MUTED, align: 'center', fontFace: FONT })
  })
})()

// ── 8. Tech / why it scales ──────────────────────────────
;(() => {
  const s = base(8); eyebrow(s, 'Built right'); heading(s, 'Modern, configurable, multi-tenant')
  cards(s, [
    { t: 'Modern stack', d: 'Next.js 16, React 19, Tailwind — fast, responsive web app.' },
    { t: 'Supabase backend', d: 'Postgres, Auth (incl. Google + 2FA), and Realtime.' },
    { t: 'Multi-tenant', d: 'Org-scoped data; each clinic configures its own setup.' },
    { t: 'Configurable', d: 'Custom stages, fields, modules & branding per clinic.' },
    { t: 'Cloud-deployed', d: 'Continuous deploy on Vercel; accessible anywhere.' },
    { t: 'Extensible', d: 'Webhooks + integrations; docs for self-serve onboarding.' },
  ], { cols: 3, y0: 1.9, ch: 1.5 })
})()

// ── 9. Status ────────────────────────────────────────────
;(() => {
  const s = base(9); eyebrow(s, 'Where we are'); heading(s, 'A working MVP, in active development')
  s.addText([
    { text: 'Live & usable today\n', options: { bold: true, color: GREEN, fontSize: 16, fontFace: FONT, paraSpaceAfter: 6 } },
    { text: 'Leads, patients, appointments, follow-ups, consultations, custom modules, reports, integrations, automation rules, and real-time notifications are built and deployed.\n\n', options: { color: MUTED, fontSize: 14, fontFace: FONT, paraSpaceAfter: 10 } },
    { text: 'In progress\n', options: { bold: true, color: ACCENT, fontSize: 16, fontFace: FONT, paraSpaceAfter: 6 } },
    { text: 'End-to-end billing/payments, security hardening (access policies), and a few integrations (Meta, WhatsApp) are still being completed.', options: { color: MUTED, fontSize: 14, fontFace: FONT } },
  ], { x: 0.75, y: 2.0, w: 11.8, h: 4, valign: 'top' })
})()

// ── 10. Roadmap ──────────────────────────────────────────
;(() => {
  const s = base(10); eyebrow(s, 'Roadmap'); heading(s, 'Where we’re going')
  cards(s, [
    { t: 'Near term', d: 'Payments flow • Security/roles hardening • WhatsApp Business • patient-list parity.' },
    { t: 'Mid term', d: 'Patient portal • SMS/WhatsApp campaigns • advanced analytics & exports.' },
    { t: 'Longer term', d: 'Multi-branch • inventory • AI assist (smart follow-ups, summaries).' },
  ], { cols: 3, y0: 2.4, ch: 2.2 })
})()

// ── 11. Business model ───────────────────────────────────
;(() => {
  const s = base(11); eyebrow(s, 'Business model'); heading(s, 'Simple, recurring SaaS')
  cards(s, [
    { t: 'Subscription', d: 'Monthly/annual per clinic, tiered by seats & features.' },
    { t: 'Add-ons', d: 'Integrations, SMS/WhatsApp credits, extra storage.' },
    { t: 'Onboarding', d: 'Setup & data-migration services for new clinics.' },
  ], { cols: 3, y0: 2.4, ch: 2.0 })
  s.addText('Why now: clinics are digitizing fast and underserved by generic CRMs that don’t fit clinical workflows.',
    { x: 0.75, y: 5.1, w: 11.8, h: 0.6, fontSize: 14, italic: true, color: MUTED, fontFace: FONT })
})()

// ── 12. The ask / next steps ─────────────────────────────
;(() => {
  const s = pptx.addSlide(); s.background = { color: BRAND }
  s.addText('Let’s build this together', { x: 0.9, y: 2.4, w: 11.5, h: 1, fontSize: 40, bold: true, color: WHITE, fontFace: FONT })
  s.addText([
    { text: 'Looking for your input on priorities, a few pilot clinics to test with, and partnership to take it to market.', options: { color: 'C9CEF2', fontSize: 18, fontFace: FONT, paraSpaceAfter: 14 } },
  ], { x: 0.9, y: 3.6, w: 10.5, h: 1 })
  s.addText('HealthCRM  ·  diabetes.kinshealth@gmail.com', { x: 0.9, y: 6.3, w: 11, h: 0.4, fontSize: 13, color: 'AAB2E8', fontFace: FONT })
})()

pptx.writeFile({ fileName: 'HealthCRM-Pitch-Deck.pptx' }).then(f => console.log('WROTE', f))
