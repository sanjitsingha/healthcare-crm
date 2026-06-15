'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  Heart, ArrowRight, Check, Star, Shield, Lock, Activity, LayoutDashboard,
  TrendingUp, Users, Calendar, CreditCard, Workflow, Stethoscope, Settings,
  Plug, BarChart2, Zap, KeyRound, Database, RefreshCw, FileText, ChevronDown,
  ImageIcon, Kanban, UserRound, GitBranch,
} from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────
const B = {
  brand:   '#21297E',
  brand2:  '#3a43b5',
  ink:     '#0b0d1a',
  body:    '#3d4466',
  muted:   '#646b8c',
  faint:   '#9aa0bf',
  line:    '#e8eaf2',
  surface: '#ffffff',
  tint:    '#f6f7fb',
  tint2:   '#eceef7',
  dark:    '#090a18',
}
const RGB = '33,41,126'

// ── Enhanced app preview (kept, refined frame) ────────────────
function AppPreview() {
  const kpis = [
    { label: 'Total Leads',     val: '2,847', diff: '+12%' },
    { label: 'Active Patients', val: '1,429', diff: '+8%' },
    { label: 'Appts Today',     val: '34',    diff: '+4' },
    { label: 'Conversion',      val: '42%',   diff: '+5pp' },
  ]
  const rows = [
    { name: 'Ramesh Kumar', stage: 'Interested', sc: '#f59e0b', pr: 'High',   dot: '#ef4444' },
    { name: 'Priya Sharma', stage: 'Contacted',  sc: '#0ea5e9', pr: 'Medium', dot: '#f59e0b' },
    { name: 'Deepa Nair',   stage: 'Follow-up',  sc: '#8b5cf6', pr: 'Urgent', dot: '#7c3aed' },
    { name: 'Vikram Singh', stage: 'Converted',  sc: '#10b981', pr: 'Low',    dot: '#10b981' },
  ]
  return (
    <div style={{ position: 'relative', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ position: 'relative', zIndex: 1, borderRadius: 14, overflow: 'hidden', border: `1px solid ${B.line}`, boxShadow: '0 30px 80px rgba(11,13,26,0.14), 0 4px 14px rgba(11,13,26,0.06)' }}>
        {/* title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fbfbfe', borderBottom: `1px solid ${B.line}` }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#e2645a', '#e6b94e', '#5cbf6a'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }} />
            ))}
          </div>
          <div style={{ flex: 1, maxWidth: 340, margin: '0 auto' }}>
            <div style={{ padding: '4px 12px', borderRadius: 6, background: B.tint, border: `1px solid ${B.line}`, fontSize: 11, color: B.faint, textAlign: 'center' }}>
              app.healthcrm.in/dashboard
            </div>
          </div>
        </div>

        {/* layout */}
        <div style={{ display: 'flex', height: 358, background: B.tint }}>
          {/* sidebar */}
          <div style={{ width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 3, background: '#fff', borderRight: `1px solid ${B.line}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Heart size={13} color="#fff" />
            </div>
            {[BarChart2, TrendingUp, Users, Calendar, CreditCard, Workflow].map((Icon, i) => (
              <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: i === 0 ? B.tint2 : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={13} style={{ color: i === 0 ? B.brand : B.faint }} />
              </div>
            ))}
          </div>
          {/* main */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: '#fff', borderBottom: `1px solid ${B.line}` }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: B.ink }}>Dashboard</span>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <div style={{ padding: '5px 11px', background: B.brand, borderRadius: 6, fontSize: 9, color: '#fff', fontWeight: 700 }}>+ New Lead</div>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: B.tint2 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9, padding: '12px 14px 9px' }}>
              {kpis.map((k, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 9, padding: '9px 11px', border: `1px solid ${B.line}` }}>
                  <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: B.faint, marginBottom: 5 }}>{k.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: B.ink, letterSpacing: '-0.5px', lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: 7.5, marginTop: 3, color: '#16a34a', fontWeight: 700 }}>{k.diff}</div>
                </div>
              ))}
            </div>
            <div style={{ margin: '0 14px 14px', flex: 1, borderRadius: 9, overflow: 'hidden', border: `1px solid ${B.line}`, background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '8px 13px', background: B.tint, borderBottom: `1px solid ${B.line}` }}>
                {['Name', 'Stage', 'Priority', 'Action'].map(h => (
                  <span key={h} style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: B.faint }}>{h}</span>
                ))}
              </div>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '9px 13px', alignItems: 'center', borderBottom: i < rows.length - 1 ? `1px solid ${B.line}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: r.sc + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 700, color: r.sc }}>{r.name[0]}</div>
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: B.ink }}>{r.name}</span>
                  </div>
                  <span style={{ fontSize: 7.5, fontWeight: 600, padding: '2px 7px', borderRadius: 99, width: 'fit-content', background: r.sc + '18', color: r.sc }}>{r.stage}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: r.dot }} />
                    <span style={{ fontSize: 8, color: B.muted }}>{r.pr}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ padding: '2px 7px', borderRadius: 4, background: B.tint2, fontSize: 7, color: B.brand, fontWeight: 700 }}>Call</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Image placeholder ─────────────────────────────────────────
function Placeholder({ label, icon: Icon = ImageIcon, height = 340, accent = false }) {
  return (
    <div style={{
      position: 'relative', height, borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${accent ? 'rgba(255,255,255,.12)' : B.line}`,
      background: accent
        ? 'linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02))'
        : `linear-gradient(135deg, ${B.tint}, ${B.tint2})`,
    }}>
      {/* faint grid pattern to read as a placeholder */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${accent ? 'rgba(255,255,255,.05)' : 'rgba(33,41,126,.05)'} 1px, transparent 1px), linear-gradient(90deg, ${accent ? 'rgba(255,255,255,.05)' : 'rgba(33,41,126,.05)'} 1px, transparent 1px)`,
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: accent ? 'rgba(255,255,255,.08)' : B.surface, border: `1px solid ${accent ? 'rgba(255,255,255,.12)' : B.line}`,
        }}>
          <Icon size={24} style={{ color: accent ? '#a5b0ff' : B.brand }} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: accent ? 'rgba(255,255,255,.4)' : B.faint, letterSpacing: '.2px' }}>{label}</span>
      </div>
    </div>
  )
}

// ── Content ───────────────────────────────────────────────────
const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing',  href: '#pricing' },
  { label: 'FAQ',      href: '#faq' },
]

const FEATURES = [
  { icon: TrendingUp,  title: 'Lead pipeline',        desc: 'Custom stages, priority scoring, and one-click contact logging — every inquiry tracked from first call to conversion.' },
  { icon: Plug,        title: 'Automatic capture',     desc: 'Pull leads from Google Forms, Meta Ads, WhatsApp, WordPress, and webhooks straight into your pipeline. Zero manual entry.' },
  { icon: Workflow,    title: 'Automation rules',      desc: 'Trigger stage changes, tasks, and notifications on the events you choose. Set it once and let the follow-up loop run itself.' },
  { icon: Users,       title: 'Patient records',       desc: 'Complete profiles with history, insurance, and custom fields — searchable, filterable, and linked to the full timeline.' },
  { icon: Calendar,    title: 'Appointments',          desc: 'Book, manage, and bill appointments per doctor, with consultation fees and payment collection built in.' },
  { icon: Stethoscope, title: 'Clinical consultations', desc: 'Structured visit records — diagnosis, prescription, and treatment plans — linked directly to each patient.' },
  { icon: CreditCard,  title: 'Billing & invoices',    desc: 'Generate invoices, record payments, and track outstanding balances. Your finance view without the spreadsheet.' },
  { icon: Settings,    title: 'No-code modules',       desc: 'Add fields and sections to leads or patients — vitals, referral source, emergency contacts — without writing code.' },
]

const STEPS = [
  { n: '01', title: 'Set up in minutes',      desc: 'Add your clinic details, invite your team, and switch on the modules you need. No onboarding calls, no consultants.' },
  { n: '02', title: 'Connect your sources',   desc: 'Link your forms, ad accounts, or website. Every new inquiry lands in your pipeline automatically, tagged and ready.' },
  { n: '03', title: 'Convert and retain',     desc: 'Turn inquiries into patients, schedule visits, log consultations, and track payments — all from one screen.' },
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
  { icon: Lock,     title: 'Encryption in transit & at rest', desc: 'All data is encrypted with TLS in transit and AES-256 at rest.' },
  { icon: KeyRound, title: 'Role-based access control',       desc: 'Granular permissions per role — staff only see what they should.' },
  { icon: FileText, title: 'Full audit logging',              desc: 'Every create, edit, and delete is recorded with who and when.' },
  { icon: Database, title: 'Automated backups',               desc: 'Continuous backups with point-in-time recovery on managed Postgres.' },
  { icon: Shield,   title: 'Built for health data',           desc: 'Privacy-first architecture designed for sensitive patient records.' },
  { icon: RefreshCw,title: '99.9% uptime',                    desc: 'Resilient infrastructure with a public status page and live health checks.' },
]

const PLANS = [
  {
    name: 'Starter', price: '₹0', period: 'forever',
    desc: 'For solo practitioners getting organised.',
    features: ['Up to 2 users', 'Lead & patient records', 'Appointments', 'Core dashboard', 'Community support'],
    cta: 'Start free', highlight: false,
  },
  {
    name: 'Professional', price: '₹2,999', period: 'per month',
    desc: 'For growing clinics that run on automation.',
    features: ['Up to 15 users', 'Everything in Starter', 'Automation rules', 'Lead integrations', 'Billing & invoices', 'Priority support'],
    cta: 'Start free trial', highlight: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: 'let’s talk',
    desc: 'For hospital groups with advanced needs.',
    features: ['Unlimited users', 'Everything in Professional', 'SSO & advanced roles', 'Audit log exports', 'Dedicated manager', '99.9% uptime SLA'],
    cta: 'Contact sales', highlight: false,
  },
]

const TESTIMONIALS = [
  { name: 'Dr. Rajesh Patel',       role: 'Director, Patel Diagnostics, Ahmedabad',     quote: 'We used to track leads in WhatsApp groups and Excel. Now every inquiry is captured and followed up — our conversion rate doubled in three months.', stat: '2× conversion' },
  { name: 'Priya Krishnamurthy',    role: 'Owner, SkinSense Clinic, Bengaluru',         quote: 'We built a full skin-consultation tracker with the custom modules — no technical help needed. The whole team was onboarded in an afternoon.',       stat: '1-day onboarding' },
  { name: 'Dr. Anand Mehta',        role: 'Orthopedic Surgeon, MedLine, Mumbai',        quote: 'The automation is what sold me. When a follow-up is logged, the next is already scheduled. We haven’t lost a lead to poor follow-up since.',          stat: '0 missed leads' },
]

const FAQS = [
  { q: 'Is my patient data secure?',                a: 'Yes. Data is encrypted in transit (TLS) and at rest (AES-256), access is governed by role-based permissions, and every change is audit-logged. Backups run continuously with point-in-time recovery.' },
  { q: 'Can I import my existing patients and leads?', a: 'Absolutely. You can bring in existing records, and connect intake forms, Meta Lead Ads, WhatsApp, WordPress, or custom webhooks so new inquiries flow in automatically.' },
  { q: 'Is there really a free plan?',              a: 'Yes — the Starter plan is free forever for up to two users and covers the core CRM, patient records, and appointments. No credit card required to begin.' },
  { q: 'Can I customise fields and modules?',       a: 'You can add your own fields and entire sections to leads and patients — vitals, insurance, referral source, and more — without writing a single line of code.' },
  { q: 'Do you charge a setup fee?',                a: 'No setup fees and no implementation consultants. Most clinics are up and running the same day they sign up.' },
]

// ── FAQ accordion item ────────────────────────────────────────
function FaqItem({ q, a, open, onToggle }) {
  return (
    <div style={{ borderBottom: `1px solid ${B.line}` }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '22px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: B.ink }}>{q}</span>
        <ChevronDown size={18} style={{ color: B.muted, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.75, padding: '0 4px 24px', maxWidth: 680 }}>{a}</p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function LandingPage({ loggedIn = false, homeHref = '/dashboard' }) {
  const dest = homeHref || '/dashboard'
  const [openFaq, setOpenFaq] = useState(0)

  const eyebrow = (text) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: B.brand, marginBottom: 18 }}>
      <span style={{ width: 18, height: 1.5, background: B.brand, display: 'inline-block' }} />
      {text}
    </div>
  )

  return (
    <div className="lp-root" style={{ fontFamily: "'Inter','DM Sans',system-ui,sans-serif", color: B.ink, background: B.surface }}>
      <style>{`
        *,*::before,*::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        .lp-root {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          font-feature-settings: 'cv11','ss01';
        }
        .lp-root h1, .lp-root h2 { letter-spacing: -0.035em; }
        .lp-root h3 { letter-spacing: -0.015em; }
        @keyframes floaty { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        .floaty { animation: floaty 8s ease-in-out infinite; }
        .lp-primary { display:inline-flex; align-items:center; gap:8px; background:${B.brand}; color:#fff; text-decoration:none; font-weight:600; border-radius:10px; box-shadow: 0 1px 2px rgba(11,13,26,.12), 0 4px 14px rgba(${RGB},.18); transition:transform .15s, box-shadow .15s; }
        .lp-primary:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(11,13,26,.14), 0 10px 26px rgba(${RGB},.28); }
        .lp-ghost { display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid ${B.line}; color:${B.ink}; border-radius:10px; font-weight:600; background:#fff; box-shadow: 0 1px 2px rgba(11,13,26,.04); transition:background .15s, border-color .15s; }
        .lp-ghost:hover { background:${B.tint}; border-color:#d6d9e8; }
        .lp-navlink { font-size:14px; color:${B.muted}; text-decoration:none; font-weight:500; transition:color .14s; }
        .lp-navlink:hover { color:${B.ink}; }
        .lp-card { transition: border-color .18s, transform .18s, box-shadow .18s; }
        .lp-card:hover { transform: translateY(-3px); border-color:#d6d9e8; box-shadow: 0 16px 40px rgba(11,13,26,.06); }
        @media (max-width: 860px) {
          .lp-desk { display:none !important; }
          .lp-grid-2 { grid-template-columns:1fr !important; }
          .lp-foot { grid-template-columns:1fr 1fr !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px', color: B.ink }}>HealthCRM</span>
          </Link>

          <nav className="lp-desk" style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
            {NAV.map(n => <a key={n.label} href={n.href} className="lp-navlink">{n.label}</a>)}
          </nav>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {loggedIn ? (
              <Link href={dest} className="lp-primary" style={{ fontSize: 14, padding: '8px 18px' }}>Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="lp-navlink lp-desk" style={{ fontWeight: 600 }}>Log in</Link>
                <Link href="/login" className="lp-primary" style={{ fontSize: 14, padding: '8px 18px' }}>
                  Get started <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', background: B.surface, padding: '92px 28px 0', overflow: 'hidden' }}>
        {/* faint grid that fades out */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(33,41,126,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(33,41,126,.045) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse 80% 55% at 50% 30%, #000 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 30%, #000 0%, transparent 75%)',
        }} />
        {/* soft colour mesh */}
        <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 640, background: `radial-gradient(ellipse at center, rgba(${RGB},.10) 0%, transparent 68%)`, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 40, left: '12%', width: 360, height: 360, background: 'radial-gradient(circle, rgba(91,102,216,.10) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0, filter: 'blur(8px)' }} />
        <div style={{ position: 'absolute', top: 90, right: '12%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(56,189,248,.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0, filter: 'blur(8px)' }} />
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Link href={loggedIn ? dest : '/login'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 8px', borderRadius: 99, background: B.tint, border: `1px solid ${B.line}`, fontSize: 12.5, fontWeight: 600, color: B.muted, textDecoration: 'none', marginBottom: 30 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 99, background: B.brand, color: '#fff', fontSize: 11, fontWeight: 700 }}>New</span>
            Automation, consultations & integrations are live
            <ArrowRight size={13} style={{ color: B.faint }} />
          </Link>

          <h1 style={{ fontSize: 'clamp(40px,6.5vw,68px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2.5px', color: B.ink, marginBottom: 24 }}>
            The operating system<br />for modern clinics
          </h1>
          <p style={{ fontSize: 19, color: B.muted, lineHeight: 1.65, maxWidth: 580, margin: '0 auto 36px' }}>
            One platform for leads, patients, appointments, and billing — with the automation that turns more inquiries into long-term patients.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 26 }}>
            <Link href={loggedIn ? dest : '/login'} className="lp-primary" style={{ fontSize: 15.5, padding: '14px 28px' }}>
              {loggedIn ? <>Go to dashboard <LayoutDashboard size={16} /></> : <>Start for free <ArrowRight size={16} /></>}
            </Link>
            <a href="#features" className="lp-ghost" style={{ fontSize: 15.5, padding: '14px 26px' }}>See features</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 64, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex' }}>
              {['#6366f1','#8b5cf6','#ec4899','#0ea5e9','#10b981'].map((c, i) => (
                <div key={i} style={{ width: 26, height: 26, borderRadius: 13, border: '2px solid #fff', background: c, marginLeft: i > 0 ? -7 : 0 }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />)}
            </div>
            <span style={{ fontSize: 13, color: B.muted, fontWeight: 500 }}>Trusted by 500+ clinics across India</span>
          </div>
        </div>

        <div style={{ maxWidth: 1040, margin: '0 auto', position: 'relative', zIndex: 1 }} className="floaty">
          <AppPreview />
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ background: B.surface, borderTop: `1px solid ${B.line}`, borderBottom: `1px solid ${B.line}`, marginTop: 72 }}>
        <div className="lp-foot" style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 28px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, textAlign: 'center' }}>
          {[['500+','Clinics & hospitals'],['2.4M+','Patient interactions'],['40%','Avg. conversion lift'],['99.9%','Uptime']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: 34, fontWeight: 800, color: B.ink, letterSpacing: '-1.5px', lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 13, color: B.muted, marginTop: 7 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" style={{ background: B.surface, padding: '110px 28px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ maxWidth: 620, marginBottom: 60 }}>
            {eyebrow('Platform')}
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,46px)', fontWeight: 800, letterSpacing: '-1.4px', color: B.ink, marginBottom: 18, lineHeight: 1.1 }}>
              Everything your clinic runs on, in one place
            </h2>
            <p style={{ fontSize: 17, color: B.muted, lineHeight: 1.7 }}>
              From the first inquiry to the final invoice — every touchpoint covered, so nothing slips through the cracks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px,1fr))', gap: 1, background: B.line, border: `1px solid ${B.line}`, borderRadius: 16, overflow: 'hidden' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: B.surface, padding: '30px 28px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: B.tint, border: `1px solid ${B.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon size={18} color={B.brand} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: B.ink, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: B.muted, lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase (alternating image rows) ── */}
      <section style={{ background: B.tint, padding: '110px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 96 }}>
          {SHOWCASE.map((s, i) => {
            const flip = i % 2 === 1
            return (
              <div key={s.title} className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
                {/* Text */}
                <div style={{ order: flip ? 2 : 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: B.brand, marginBottom: 16 }}>
                    <s.icon size={15} /> {s.eyebrow}
                  </div>
                  <h3 style={{ fontSize: 'clamp(26px,3.2vw,36px)', fontWeight: 800, letterSpacing: '-1.2px', color: B.ink, marginBottom: 16, lineHeight: 1.15 }}>{s.title}</h3>
                  <p style={{ fontSize: 16.5, color: B.muted, lineHeight: 1.75, marginBottom: 24 }}>{s.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {s.points.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, fontWeight: 500, color: B.body }}>
                        <span style={{ width: 20, height: 20, borderRadius: 99, background: B.tint2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={12} style={{ color: B.brand }} />
                        </span>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Image placeholder */}
                <div style={{ order: flip ? 1 : 2 }}>
                  <Placeholder label={s.ph} icon={s.icon} height={360} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: B.surface, padding: '110px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{eyebrow('How it works')}</div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,46px)', fontWeight: 800, letterSpacing: '-1.4px', color: B.ink, lineHeight: 1.1 }}>
              Live in a day, not a quarter
            </h2>
          </div>
          <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} style={{ background: B.surface, border: `1px solid ${B.line}`, borderRadius: 16, overflow: 'hidden' }}>
                <Placeholder label={`Step ${n}`} height={150} />
                <div style={{ padding: '26px 28px 30px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: B.brand, letterSpacing: '1px', marginBottom: 14 }}>{n}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: B.ink, marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.75 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" style={{ background: B.dark, padding: '110px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: `radial-gradient(ellipse, rgba(${RGB},.25) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 620, marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#818cf8', marginBottom: 18 }}>
              <span style={{ width: 18, height: 1.5, background: '#818cf8', display: 'inline-block' }} /> Security & compliance
            </div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,46px)', fontWeight: 800, letterSpacing: '-1.4px', color: '#fff', marginBottom: 18, lineHeight: 1.1 }}>
              Patient data, protected by design
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', lineHeight: 1.7 }}>
              Healthcare records demand more than a login screen. Security is built into every layer of the platform.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 18 }}>
            {SECURITY.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 14, padding: '26px 24px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(${RGB},.45)`, border: `1px solid rgba(${RGB},.6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={18} color="#a5b0ff" />
                </div>
                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.45)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ background: B.surface, padding: '110px 28px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{eyebrow('Pricing')}</div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,46px)', fontWeight: 800, letterSpacing: '-1.4px', color: B.ink, marginBottom: 16, lineHeight: 1.1 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: 17, color: B.muted, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
              Start free and upgrade as you grow. No setup fees, cancel anytime.
            </p>
          </div>

          <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, alignItems: 'start' }}>
            {PLANS.map(p => (
              <div key={p.name} style={{
                position: 'relative',
                background: p.highlight ? B.ink : B.surface,
                border: `1px solid ${p.highlight ? B.ink : B.line}`,
                borderRadius: 18, padding: '34px 30px',
                boxShadow: p.highlight ? '0 24px 60px rgba(11,13,26,.18)' : 'none',
                transform: p.highlight ? 'translateY(-8px)' : 'none',
              }}>
                {p.highlight && (
                  <span style={{ position: 'absolute', top: 22, right: 24, fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,.12)', color: '#fff' }}>
                    Most popular
                  </span>
                )}
                <h3 style={{ fontSize: 15, fontWeight: 700, color: p.highlight ? '#fff' : B.ink, marginBottom: 6 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: p.highlight ? 'rgba(255,255,255,.5)' : B.muted, marginBottom: 22, minHeight: 36, lineHeight: 1.5 }}>{p.desc}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 26 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1.5px', color: p.highlight ? '#fff' : B.ink }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: p.highlight ? 'rgba(255,255,255,.5)' : B.faint }}>{p.period}</span>
                </div>
                <Link href={p.name === 'Enterprise' ? '/contact' : '/login'}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    fontSize: 14, fontWeight: 600, padding: '12px', borderRadius: 9, textDecoration: 'none', marginBottom: 26,
                    background: p.highlight ? '#fff' : B.brand, color: p.highlight ? B.ink : '#fff',
                    transition: 'opacity .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  {p.cta} <ArrowRight size={14} />
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: p.highlight ? 'rgba(255,255,255,.8)' : B.body }}>
                      <Check size={15} style={{ color: p.highlight ? '#7dd3a8' : '#16a34a', flexShrink: 0 }} />
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
      <section style={{ background: B.tint, padding: '110px 28px', borderTop: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{eyebrow('Customers')}</div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,46px)', fontWeight: 800, letterSpacing: '-1.4px', color: B.ink, lineHeight: 1.1 }}>
              Loved by healthcare teams
            </h2>
          </div>
          <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
            {TESTIMONIALS.map(({ name, role, quote, stat }) => (
              <div key={name} style={{ background: B.surface, border: `1px solid ${B.line}`, borderRadius: 18, padding: '30px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 2 }}>{[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: B.brand, background: B.tint2, padding: '4px 10px', borderRadius: 99 }}>{stat}</span>
                </div>
                <p style={{ fontSize: 14.5, color: B.body, lineHeight: 1.8, flex: 1 }}>“{quote}”</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, borderTop: `1px solid ${B.line}`, paddingTop: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                    {name[0]}{name.split(' ')[1]?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: B.ink }}>{name}</div>
                    <div style={{ fontSize: 11.5, color: B.faint, marginTop: 1 }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background: B.surface, padding: '110px 28px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{eyebrow('FAQ')}</div>
            <h2 style={{ fontSize: 'clamp(30px,4.2vw,46px)', fontWeight: 800, letterSpacing: '-1.4px', color: B.ink, lineHeight: 1.1 }}>
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

      {/* ── Final CTA ── */}
      <section style={{ background: B.surface, padding: '0 28px 110px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: B.brand, borderRadius: 28, padding: '80px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: 'radial-gradient(ellipse, rgba(255,255,255,.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, letterSpacing: '-1.8px', color: '#fff', marginBottom: 18, lineHeight: 1.08 }}>
                Ready to run your clinic smarter?
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,.7)', marginBottom: 38, lineHeight: 1.7 }}>
                Join 500+ healthcare teams managing more patients with less effort. Free to start, no card required.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href={loggedIn ? dest : '/login'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15.5, fontWeight: 700, padding: '14px 30px', borderRadius: 10, background: '#fff', color: B.brand, textDecoration: 'none', transition: 'transform .15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  {loggedIn ? 'Go to dashboard' : 'Get started for free'} <ArrowRight size={16} />
                </Link>
                {!loggedIn && (
                  <a href="#pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15.5, fontWeight: 600, padding: '14px 28px', borderRadius: 10, border: '1px solid rgba(255,255,255,.25)', color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,.06)' }}>
                    View pricing
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: B.dark, padding: '64px 28px 36px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="lp-foot" style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 1fr', gap: 44, marginBottom: 56 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={14} color="#fff" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.5px' }}>HealthCRM</span>
              </div>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.38)', lineHeight: 1.8, maxWidth: 280 }}>
                The complete CRM platform for clinics, hospitals, and diagnostic centres — built for teams who care about patients and growth alike.
              </p>
            </div>
            {[
              { heading: 'Product', links: [['Features', '#features'], ['Security', '#security'], ['Pricing', '#pricing'], ['Status', '/status']] },
              { heading: 'Company', links: [['About', '#'], ['Blog', '#'], ['Careers', '#'], ['Contact', '/contact']] },
              { heading: 'Legal',   links: [['Privacy', '/privacy'], ['Terms', '/terms'], ['Cookies', '/cookies'], ['Security', '/security']] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.9px', textTransform: 'uppercase', color: 'rgba(255,255,255,.28)', marginBottom: 18 }}>{heading}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {links.map(([label, href]) => (
                    <Link key={label} href={href} style={{ fontSize: 13.5, color: 'rgba(255,255,255,.45)', textDecoration: 'none', transition: 'color .14s', width: 'fit-content' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.85)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.45)'}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.3)' }}>© 2026 HealthCRM Technologies Pvt. Ltd. All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'rgba(255,255,255,.3)' }}>
              <Activity size={13} color="#34d399" /> All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
