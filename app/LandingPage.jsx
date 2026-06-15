'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  ArrowRight, Check, Star, Shield, Lock,
  TrendingUp, Users, Calendar, CreditCard, Workflow, Stethoscope, Settings,
  Plug, KeyRound, Database, RefreshCw, FileText, ChevronDown,
  ImageIcon, Kanban, UserRound, GitBranch, Mail, GripVertical, Hand,
} from 'lucide-react'
import { B, RGB, R } from '@/components/marketing/tokens'
import { FlowraMark, MarketingStyles, MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'

// ── Live drag-and-drop lead pipeline (hero) ───────────────────
const STAGES = [
  { id: 'new',       label: 'New',       color: '#0284c7' },
  { id: 'contacted', label: 'Contacted', color: '#7c3aed' },
  { id: 'followup',  label: 'Follow-up', color: '#d97706' },
  { id: 'converted', label: 'Converted', color: '#059669' },
]
const PRI = { Urgent: '#dc2626', High: '#ea580c', Medium: '#0284c7', Low: '#64748b' }
const INITIAL_LEADS = [
  { id: 'l1', name: 'Ramesh Kumar', stage: 'new',       pri: 'High',   meta: 'Cardiology consult',  c: '#6366f1' },
  { id: 'l2', name: 'Neha Gupta',   stage: 'new',       pri: 'Medium', meta: 'Dental implant',      c: '#0ea5e9' },
  { id: 'l3', name: 'Deepa Nair',   stage: 'contacted', pri: 'Urgent', meta: 'Dermatology',         c: '#8b5cf6' },
  { id: 'l4', name: 'Arjun Reddy',  stage: 'contacted', pri: 'Low',    meta: 'Physiotherapy',       c: '#14b8a6' },
  { id: 'l5', name: 'Vikram Singh', stage: 'followup',  pri: 'High',   meta: 'Knee replacement',    c: '#f59e0b' },
  { id: 'l6', name: 'Sara Khan',    stage: 'converted', pri: 'Low',    meta: 'Eye check-up',        c: '#10b981' },
]

function LeadCard({ lead, dragging, onDragStart, onDragEnd, onAdvance }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAdvance}
      title="Drag to another stage — or tap to advance"
      style={{
        background: '#fff', border: `1px solid ${B.line}`, borderRadius: R.ctl,
        padding: '10px 11px', cursor: 'grab', userSelect: 'none',
        opacity: dragging ? 0.4 : 1, boxShadow: dragging ? 'none' : '0 1px 2px rgba(20,22,31,.04)',
        transition: 'box-shadow .15s, border-color .15s',
      }}
      onMouseEnter={e => { if (!dragging) e.currentTarget.style.borderColor = '#d3d7e4' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = B.line }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: R.tag, background: lead.c + '1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, color: lead.c, flexShrink: 0 }}>{lead.name[0]}</div>
        <span style={{ fontSize: 12, fontWeight: 600, color: B.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</span>
        <GripVertical size={13} style={{ color: B.faint, flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: R.tag, background: PRI[lead.pri] + '16', color: PRI[lead.pri] }}>{lead.pri}</span>
        <span style={{ fontSize: 10, color: B.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.meta}</span>
      </div>
    </div>
  )
}

function HeroPipeline() {
  const [leads, setLeads] = useState(INITIAL_LEADS)
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const draggedRef = useRef(false)

  const move = (id, stage) => setLeads(prev => prev.map(l => (l.id === id ? { ...l, stage } : l)))
  const advance = (id) => setLeads(prev => prev.map(l => {
    if (l.id !== id) return l
    const idx = STAGES.findIndex(s => s.id === l.stage)
    return { ...l, stage: STAGES[(idx + 1) % STAGES.length].id }
  }))

  const handleAdvance = (id) => {
    if (draggedRef.current) { draggedRef.current = false; return }
    advance(id)
  }

  return (
    <div style={{ position: 'relative', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ position: 'relative', zIndex: 1, borderRadius: R.card, overflow: 'hidden', border: `1px solid ${B.line}`, boxShadow: '0 20px 50px rgba(20,22,31,0.10), 0 3px 10px rgba(20,22,31,0.05)' }}>
        {/* browser chrome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fbfbfe', borderBottom: `1px solid ${B.line}` }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#e2645a', '#e6b94e', '#5cbf6a'].map(c => (
              <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.8 }} />
            ))}
          </div>
          <div style={{ flex: 1, maxWidth: 340, margin: '0 auto' }}>
            <div style={{ padding: '4px 12px', borderRadius: R.tag, background: B.tint, border: `1px solid ${B.line}`, fontSize: 11, color: B.faint, textAlign: 'center' }}>
              app.flowra.in/leads/pipeline
            </div>
          </div>
        </div>

        {/* board */}
        <div style={{ background: B.tint, padding: '14px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: B.ink, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Kanban size={15} style={{ color: B.brand }} /> Lead Pipeline
            </span>
            <span style={{ fontSize: 11, color: B.muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Hand size={12} /> Drag a card — or tap it
            </span>
          </div>

          <div className="lp-board-scroll" style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(150px,1fr))`, gap: 10, alignItems: 'start' }}>
            {STAGES.map(s => {
              const colLeads = leads.filter(l => l.stage === s.id)
              const over = overCol === s.id
              return (
                <div key={s.id}
                  onDragOver={e => { e.preventDefault(); if (overCol !== s.id) setOverCol(s.id) }}
                  onDrop={e => { e.preventDefault(); if (dragId) move(dragId, s.id); setOverCol(null) }}
                  style={{
                    borderRadius: R.ctl, padding: 8, minHeight: 232,
                    background: over ? B.brandTint : 'rgba(255,255,255,0.5)',
                    border: `1px ${over ? 'dashed' : 'solid'} ${over ? B.brand : B.line}`,
                    transition: 'background .12s, border-color .12s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px 10px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: B.ink }}>{s.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: B.faint, marginLeft: 'auto' }}>{colLeads.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {colLeads.map(l => (
                      <LeadCard key={l.id} lead={l} dragging={dragId === l.id}
                        onDragStart={() => { setDragId(l.id); draggedRef.current = true }}
                        onDragEnd={() => { setDragId(null); setOverCol(null); setTimeout(() => { draggedRef.current = false }, 60) }}
                        onAdvance={() => handleAdvance(l.id)} />
                    ))}
                    {colLeads.length === 0 && (
                      <div style={{ border: `1px dashed ${B.line}`, borderRadius: R.tag, padding: '14px 8px', textAlign: 'center', fontSize: 10, color: B.faint }}>
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Decorative patient-lead chips drifting around the hero board.
function FloatingLead({ name, meta, c, style, anim }) {
  return (
    <div className="lp-floater" style={{ position: 'absolute', zIndex: 0, animation: anim, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${B.line}`, borderRadius: R.ctl, padding: '8px 12px 8px 9px', boxShadow: '0 12px 30px rgba(20,22,31,0.10)' }}>
        <div style={{ width: 22, height: 22, borderRadius: R.tag, background: c + '1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, color: c }}>{name[0]}</div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: B.ink, lineHeight: 1.2 }}>{name}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: B.brand, marginTop: 1 }}>{meta}</div>
        </div>
      </div>
    </div>
  )
}

// Animated connectors: a line grows from each floating lead into the CRM,
// converging just above the board — leads flowing into the platform.
function LeadConnectors() {
  const lines = [
    { d: 'M -45 -7 Q 235 -64 520 -20',  ox: -45,   oy: -7,  delay: '0s' },
    { d: 'M -45 85 Q 230 44 520 -20',   ox: -45,   oy: 85,  delay: '.6s' },
    { d: 'M 1085 -7 Q 805 -64 520 -20', ox: 1085,  oy: -7,  delay: '1.1s' },
    { d: 'M 1085 85 Q 810 44 520 -20',  ox: 1085,  oy: 85,  delay: '1.7s' },
  ]
  return (
    <svg className="lp-connectors" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', zIndex: 0, pointerEvents: 'none' }}>
      {lines.map((l, i) => (
        <g key={i}>
          <path d={l.d} fill="none" stroke={B.brand} strokeOpacity="0.13" strokeWidth="1.25" strokeLinecap="round" />
          <path d={l.d} fill="none" stroke={B.brand} strokeWidth="1.8" strokeLinecap="round" pathLength="1" strokeDasharray="1" style={{ animation: `lp-draw 3.6s ease-in-out ${l.delay} infinite` }} />
          <circle cx={l.ox} cy={l.oy} r="3" fill={B.brand} fillOpacity="0.5" />
        </g>
      ))}
      {/* CRM intake node */}
      <circle cx="520" cy="-20" r="4.5" fill={B.brand} />
      <circle cx="520" cy="-20" r="4.5" fill="none" stroke={B.brand} strokeWidth="1.4" style={{ animation: 'lp-ping 2.6s ease-out infinite', transformBox: 'fill-box', transformOrigin: 'center' }} />
    </svg>
  )
}

function Placeholder({ label, icon: Icon = ImageIcon, height = 340 }) {
  return (
    <div style={{ position: 'relative', height, borderRadius: R.card, overflow: 'hidden', border: `1px solid ${B.line}`, background: B.tint }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(33,41,126,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(33,41,126,.045) 1px, transparent 1px)`,
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: R.ctl, display: 'flex', alignItems: 'center', justifyContent: 'center', background: B.surface, border: `1px solid ${B.line}` }}>
          <Icon size={22} style={{ color: B.brand }} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: B.faint }}>{label}</span>
      </div>
    </div>
  )
}

// ── Content ───────────────────────────────────────────────────
const FEATURES = [
  { icon: TrendingUp,  title: 'Lead pipeline',         desc: 'Custom stages, priority scoring, and one-click contact logging — every inquiry tracked from first call to conversion.' },
  { icon: Plug,        title: 'Automatic capture',     desc: 'Pull leads from Google Forms, Meta Ads, WhatsApp, WordPress, and webhooks straight into your pipeline. Zero manual entry.' },
  { icon: Workflow,    title: 'Automation rules',      desc: 'Trigger stage changes, tasks, and notifications on the events you choose. Set it once and let the follow-up loop run itself.' },
  { icon: Users,       title: 'Patient records',       desc: 'Complete profiles with history, insurance, and custom fields — searchable, filterable, and linked to the full timeline.' },
  { icon: Calendar,    title: 'Appointments',          desc: 'Book, manage, and bill appointments per doctor, with consultation fees and payment collection built in.' },
  { icon: Stethoscope, title: 'Clinical consultations', desc: 'Structured visit records — diagnosis, prescription, and treatment plans — linked directly to each patient.' },
  { icon: CreditCard,  title: 'Billing & invoices',    desc: 'Generate invoices, record payments, and track outstanding balances. Your finance view without the spreadsheet.' },
  { icon: Settings,    title: 'No-code modules',       desc: 'Add fields and sections to leads or patients — vitals, referral source, emergency contacts — without writing code.' },
]

const STEPS = [
  { n: '01', title: 'Set up in minutes',    desc: 'Add your clinic details, invite your team, and switch on the modules you need. No onboarding calls, no consultants.' },
  { n: '02', title: 'Connect your sources', desc: 'Link your forms, ad accounts, or website. Every new inquiry lands in your pipeline automatically, tagged and ready.' },
  { n: '03', title: 'Convert and retain',   desc: 'Turn inquiries into patients, schedule visits, log consultations, and track payments — all from one screen.' },
]

const SHOWCASE = [
  {
    eyebrow: 'Lead pipeline', icon: Kanban, ph: 'Pipeline board preview',
    title: 'A pipeline you can actually see',
    desc: 'Drag leads through your own stages, score by priority, and log every call without leaving the board. Notes and tasks surface right on the card.',
    points: ['Custom stages & colours', 'Priority scoring', 'Inline call & note logging'],
  },
  {
    eyebrow: 'Patient 360', icon: UserRound, ph: 'Patient profile preview',
    title: 'Every patient, on one screen',
    desc: 'Demographics, medical history, appointments, consultations, invoices, and custom modules — all linked to a single timeline you can search and filter.',
    points: ['Full visit & billing history', 'Custom fields & modules', 'Searchable timeline'],
  },
  {
    eyebrow: 'Automation', icon: GitBranch, ph: 'Automation builder preview',
    title: 'Set the follow-up loop once',
    desc: 'Build rules that trigger stage changes, create tasks, and notify your team the moment something happens — so no lead ever goes cold.',
    points: ['Event-based triggers', 'Auto-assign & notify', 'Zero manual follow-up'],
  },
]

const SECURITY = [
  { icon: Lock,      title: 'Encryption in transit & at rest', desc: 'All data is encrypted with TLS in transit and AES-256 at rest.' },
  { icon: KeyRound,  title: 'Role-based access control',       desc: 'Granular permissions per role — staff only see what they should.' },
  { icon: FileText,  title: 'Full audit logging',              desc: 'Every create, edit, and delete is recorded with who and when.' },
  { icon: Database,  title: 'Automated backups',               desc: 'Continuous backups with point-in-time recovery on managed Postgres.' },
  { icon: Shield,    title: 'Built for health data',           desc: 'Privacy-first architecture designed for sensitive patient records.' },
  { icon: RefreshCw, title: '99.9% uptime',                    desc: 'Resilient infrastructure with a public status page and live health checks.' },
]

const PLANS = [
  { name: 'Starter', price: '₹0', period: 'forever', desc: 'For solo practitioners getting organised.',
    features: ['Up to 2 users', 'Lead & patient records', 'Appointments', 'Core dashboard', 'Community support'], cta: 'Start free', highlight: false },
  { name: 'Professional', price: '₹2,999', period: 'per month', desc: 'For growing clinics that run on automation.',
    features: ['Up to 15 users', 'Everything in Starter', 'Automation rules', 'Lead integrations', 'Billing & invoices', 'Priority support'], cta: 'Start free trial', highlight: true },
  { name: 'Enterprise', price: 'Custom', period: 'let’s talk', desc: 'For hospital groups with advanced needs.',
    features: ['Unlimited users', 'Everything in Professional', 'SSO & advanced roles', 'Audit log exports', 'Dedicated manager', '99.9% uptime SLA'], cta: 'Contact sales', highlight: false },
]

const TESTIMONIALS = [
  { name: 'Dr. Rajesh Patel',    role: 'Director, Patel Diagnostics, Ahmedabad', quote: 'We used to track leads in WhatsApp groups and Excel. Now every inquiry is captured and followed up — our conversion rate doubled in three months.', stat: '2× conversion' },
  { name: 'Priya Krishnamurthy', role: 'Owner, SkinSense Clinic, Bengaluru',     quote: 'We built a full skin-consultation tracker with the custom modules — no technical help needed. The whole team was onboarded in an afternoon.',       stat: '1-day onboarding' },
  { name: 'Dr. Anand Mehta',     role: 'Orthopedic Surgeon, MedLine, Mumbai',    quote: 'The automation is what sold me. When a follow-up is logged, the next is already scheduled. We haven’t lost a lead to poor follow-up since.',          stat: '0 missed leads' },
]

const FAQS = [
  { q: 'Is my patient data secure?', a: 'Yes. Data is encrypted in transit (TLS) and at rest (AES-256), access is governed by role-based permissions, and every change is audit-logged. Backups run continuously with point-in-time recovery.' },
  { q: 'Can I import my existing patients and leads?', a: 'Absolutely. You can bring in existing records, and connect intake forms, Meta Lead Ads, WhatsApp, WordPress, or custom webhooks so new inquiries flow in automatically.' },
  { q: 'Is there really a free plan?', a: 'Yes — the Starter plan is free forever for up to two users and covers the core CRM, patient records, and appointments. No credit card required to begin.' },
  { q: 'Can I customise fields and modules?', a: 'You can add your own fields and entire sections to leads and patients — vitals, insurance, referral source, and more — without writing a single line of code.' },
  { q: 'Do you charge a setup fee?', a: 'No setup fees and no implementation consultants. Most clinics are up and running the same day they sign up.' },
]

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div style={{ borderBottom: `1px solid ${B.line}` }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: B.ink }}>{q}</span>
        <ChevronDown size={18} style={{ color: B.muted, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.75, padding: '0 4px 22px', maxWidth: 680 }}>{a}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function LandingPage({ loggedIn = false, homeHref = '/dashboard' }) {
  const dest = homeHref || '/dashboard'
  const [openFaq, setOpenFaq] = useState(0)

  const eyebrow = (text) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: B.brand, marginBottom: 18 }}>
      <span style={{ width: 16, height: 1.5, background: B.brand, display: 'inline-block' }} />
      {text}
    </div>
  )

  return (
    <div className="lp-root" style={{ fontFamily: "'Inter','DM Sans',system-ui,sans-serif", color: B.ink, background: B.surface }}>
      <MarketingStyles />
      <MarketingNav loggedIn={loggedIn} dest={dest} />

      {/* ── Hero ── */}
      <section style={{ position: 'relative', background: B.surface, padding: '88px 28px 0', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(33,41,126,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(33,41,126,.04) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse 80% 55% at 50% 28%, #000 0%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 28%, #000 0%, transparent 72%)',
        }} />
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Link href={loggedIn ? dest : '/login'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px 5px 7px', borderRadius: R.tag, background: B.tint, border: `1px solid ${B.line}`, fontSize: 12.5, fontWeight: 500, color: B.muted, textDecoration: 'none', marginBottom: 28 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: R.tag, background: B.brand, color: '#fff', fontSize: 11, fontWeight: 600 }}>New</span>
            Automation, consultations &amp; integrations are live
            <ArrowRight size={13} style={{ color: B.faint }} />
          </Link>

          <h1 style={{ fontSize: 'clamp(40px,6.4vw,66px)', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-2px', color: B.ink, marginBottom: 22 }}>
            The operating system<br />for modern clinics
          </h1>
          <p style={{ fontSize: 18.5, color: B.muted, lineHeight: 1.62, maxWidth: 560, margin: '0 auto 64px' }}>
            One clean platform for leads, patients, appointments, and billing — with the automation that turns more inquiries into long-term patients.
          </p>
        </div>

        <div style={{ maxWidth: 1040, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* growing connectors flowing leads into the CRM */}
          <LeadConnectors />
          {/* floating patient-lead chips drifting around the board */}
          <FloatingLead name="Ananya Iyer"  meta="Pediatrics"  c="#ec4899" anim="lp-floatA 7s ease-in-out infinite"     style={{ top: -30, left: -120 }} />
          <FloatingLead name="Mohan Das"    meta="Orthopedics" c="#0ea5e9" anim="lp-floatB 8.5s ease-in-out infinite"   style={{ top: 62, left: -120 }} />
          <FloatingLead name="Kavya Menon"  meta="Gynaecology" c="#8b5cf6" anim="lp-floatC 7.8s ease-in-out infinite"   style={{ top: -30, right: -120 }} />
          <FloatingLead name="Imran Sheikh" meta="ENT consult" c="#10b981" anim="lp-floatA 9s ease-in-out infinite .4s" style={{ top: 62, right: -120 }} />
          <HeroPipeline />
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ background: B.surface, borderTop: `1px solid ${B.line}`, borderBottom: `1px solid ${B.line}`, marginTop: 64 }}>
        <div className="lp-foot" style={{ maxWidth: 1000, margin: '0 auto', padding: '38px 28px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, textAlign: 'center' }}>
          {[['500+','Clinics & hospitals'],['2.4M+','Patient interactions'],['40%','Avg. conversion lift'],['99.9%','Uptime']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: 32, fontWeight: 700, color: B.ink, letterSpacing: '-1.2px', lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 13, color: B.muted, marginTop: 7 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" style={{ background: B.surface, padding: '104px 28px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ maxWidth: 620, marginBottom: 56 }}>
            {eyebrow('Platform')}
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,44px)', fontWeight: 700, letterSpacing: '-1.2px', color: B.ink, marginBottom: 16, lineHeight: 1.12 }}>
              Everything your clinic runs on, in one place
            </h2>
            <p style={{ fontSize: 17, color: B.muted, lineHeight: 1.7 }}>
              From the first inquiry to the final invoice — every touchpoint covered, so nothing slips through the cracks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px,1fr))', gap: 1, background: B.line, border: `1px solid ${B.line}`, borderRadius: R.card, overflow: 'hidden' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: B.surface, padding: '28px 26px' }}>
                <div style={{ width: 40, height: 40, borderRadius: R.ctl, background: B.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={18} color={B.brand} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: B.ink, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: B.muted, lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase ── */}
      <section style={{ background: B.tint, padding: '104px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 88 }}>
          {SHOWCASE.map((s, i) => {
            const flip = i % 2 === 1
            return (
              <div key={s.title} className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
                <div style={{ order: flip ? 2 : 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: B.brand, marginBottom: 16 }}>
                    <s.icon size={15} /> {s.eyebrow}
                  </div>
                  <h3 style={{ fontSize: 'clamp(26px,3.2vw,35px)', fontWeight: 700, letterSpacing: '-1px', color: B.ink, marginBottom: 16, lineHeight: 1.18 }}>{s.title}</h3>
                  <p style={{ fontSize: 16.5, color: B.muted, lineHeight: 1.72, marginBottom: 24 }}>{s.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {s.points.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, fontWeight: 500, color: B.body }}>
                        <span style={{ width: 19, height: 19, borderRadius: R.tag, background: B.brandTint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={12} style={{ color: B.brand }} />
                        </span>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ order: flip ? 1 : 2 }}>
                  <Placeholder label={s.ph} icon={s.icon} height={360} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: B.surface, padding: '104px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{eyebrow('How it works')}</div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,44px)', fontWeight: 700, letterSpacing: '-1.2px', color: B.ink, lineHeight: 1.12 }}>
              Live in a day, not a quarter
            </h2>
          </div>
          <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="lp-card" style={{ background: B.surface, border: `1px solid ${B.line}`, borderRadius: R.card, overflow: 'hidden' }}>
                <Placeholder label={`Step ${n}`} height={148} />
                <div style={{ padding: '24px 26px 28px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: B.brand, letterSpacing: '0.5px', marginBottom: 12 }}>{n}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: B.ink, marginBottom: 9 }}>{title}</h3>
                  <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.72 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security (light) ── */}
      <section id="security" style={{ background: B.tint, padding: '104px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ maxWidth: 620, marginBottom: 52 }}>
            {eyebrow('Security & compliance')}
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,44px)', fontWeight: 700, letterSpacing: '-1.2px', color: B.ink, marginBottom: 16, lineHeight: 1.12 }}>
              Patient data, protected by design
            </h2>
            <p style={{ fontSize: 17, color: B.muted, lineHeight: 1.7 }}>
              Healthcare records demand more than a login screen. Security is built into every layer of the platform.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16 }}>
            {SECURITY.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="lp-card" style={{ background: B.surface, border: `1px solid ${B.line}`, borderRadius: R.card, padding: '24px 22px' }}>
                <div style={{ width: 40, height: 40, borderRadius: R.ctl, background: B.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={18} color={B.brand} />
                </div>
                <h3 style={{ fontSize: 15.5, fontWeight: 600, color: B.ink, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: B.muted, lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ background: B.surface, padding: '104px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{eyebrow('Pricing')}</div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,44px)', fontWeight: 700, letterSpacing: '-1.2px', color: B.ink, marginBottom: 14, lineHeight: 1.12 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: 17, color: B.muted, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
              Start free and upgrade as you grow. No setup fees, cancel anytime.
            </p>
          </div>

          <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'start' }}>
            {PLANS.map(p => (
              <div key={p.name} style={{
                position: 'relative', background: B.surface,
                border: `${p.highlight ? 2 : 1}px solid ${p.highlight ? B.brand : B.line}`,
                borderRadius: R.card, padding: '32px 28px',
              }}>
                {p.highlight && (
                  <span style={{ position: 'absolute', top: 20, right: 22, fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: R.tag, background: B.brandTint, color: B.brand }}>
                    Most popular
                  </span>
                )}
                <h3 style={{ fontSize: 15, fontWeight: 600, color: B.ink, marginBottom: 6 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: B.muted, marginBottom: 20, minHeight: 36, lineHeight: 1.5 }}>{p.desc}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 24 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-1.2px', color: B.ink }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: B.faint }}>{p.period}</span>
                </div>
                <Link href={p.name === 'Enterprise' ? '/contact' : '/login'}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    fontSize: 14, fontWeight: 600, padding: '11px', borderRadius: R.ctl, textDecoration: 'none', marginBottom: 24,
                    background: p.highlight ? B.brand : B.surface, color: p.highlight ? '#fff' : B.ink,
                    border: p.highlight ? 'none' : `1px solid ${B.line}`, transition: 'opacity .15s, background .15s',
                  }}
                  onMouseEnter={e => { if (!p.highlight) e.currentTarget.style.background = B.tint }}
                  onMouseLeave={e => { if (!p.highlight) e.currentTarget.style.background = B.surface }}>
                  {p.cta} <ArrowRight size={14} />
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: B.body }}>
                      <Check size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: B.tint, padding: '104px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{eyebrow('Customers')}</div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,44px)', fontWeight: 700, letterSpacing: '-1.2px', color: B.ink, lineHeight: 1.12 }}>
              Loved by healthcare teams
            </h2>
          </div>
          <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {TESTIMONIALS.map(({ name, role, quote, stat }) => (
              <div key={name} className="lp-card" style={{ background: B.surface, border: `1px solid ${B.line}`, borderRadius: R.card, padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 2 }}>{[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: B.brand, background: B.brandTint, padding: '4px 9px', borderRadius: R.tag }}>{stat}</span>
                </div>
                <p style={{ fontSize: 14.5, color: B.body, lineHeight: 1.78, flex: 1 }}>“{quote}”</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, borderTop: `1px solid ${B.line}`, paddingTop: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: R.ctl, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 600, flexShrink: 0 }}>
                    {name[0]}{name.split(' ')[1]?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: B.ink }}>{name}</div>
                    <div style={{ fontSize: 11.5, color: B.faint, marginTop: 1 }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background: B.surface, padding: '104px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{eyebrow('FAQ')}</div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,44px)', fontWeight: 700, letterSpacing: '-1.2px', color: B.ink, lineHeight: 1.12 }}>
              Questions, answered
            </h2>
          </div>
          <div style={{ borderTop: `1px solid ${B.line}` }}>
            {FAQS.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter band ── */}
      <section style={{ background: B.surface, padding: '0 28px 104px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ border: `1px solid ${B.line}`, background: B.tint, borderRadius: R.card, padding: '44px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 540 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: B.brand, marginBottom: 12 }}>
                <Mail size={14} /> Newsletter
              </div>
              <h2 style={{ fontSize: 'clamp(24px,3.2vw,30px)', fontWeight: 700, letterSpacing: '-0.8px', color: B.ink, marginBottom: 8, lineHeight: 1.2 }}>
                Product updates &amp; clinic-growth tips
              </h2>
              <p style={{ fontSize: 15.5, color: B.muted, lineHeight: 1.6 }}>
                A short, useful email when we ship something new — no spam, unsubscribe anytime.
              </p>
            </div>
            <Link href="/newsletter" className="lp-primary" style={{ fontSize: 15, padding: '13px 26px' }}>
              Subscribe <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA (light) ── */}
      <section style={{ background: B.surface, padding: '0 28px 104px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ border: `1px solid ${B.line}`, background: B.surface, borderRadius: R.card, padding: '72px 40px', textAlign: 'center', boxShadow: '0 8px 30px rgba(20,22,31,0.04)' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(30px,4.6vw,46px)', fontWeight: 700, letterSpacing: '-1.4px', color: B.ink, marginBottom: 16, lineHeight: 1.1 }}>
                Ready to run your clinic smarter?
              </h2>
              <p style={{ fontSize: 17, color: B.muted, marginBottom: 34, lineHeight: 1.7 }}>
                Join 500+ healthcare teams managing more patients with less effort. Free to start, no card required.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href={loggedIn ? dest : '/login'} className="lp-primary" style={{ fontSize: 15.5, padding: '14px 30px' }}>
                  {loggedIn ? 'Go to dashboard' : 'Get started for free'} <ArrowRight size={16} />
                </Link>
                {!loggedIn && <a href="#pricing" className="lp-ghost" style={{ fontSize: 15.5, padding: '14px 26px' }}>View pricing</a>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
