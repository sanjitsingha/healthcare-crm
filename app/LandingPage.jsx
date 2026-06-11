'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  Heart, Users, Calendar, CreditCard, TrendingUp, CheckSquare,
  BarChart2, ArrowRight, Menu, X, Shield, UserCheck, Bell, Settings,
  Star, Plug, Workflow, PhoneCall, Tag, Stethoscope, Check,
  Lock, Activity, LayoutDashboard, ChevronRight, Sparkles,
  Building2, FileText, Zap,
} from 'lucide-react'

const B = {
  brand:   '#21297E',
  light:   '#3a43b5',
  lighter: '#5b66d8',
  bg50:    '#eceef8',
  bg100:   '#d0d4f0',
  surface: '#ffffff',
  surf2:   '#f5f7fc',
  border:  '#e2e4ef',
  text:    '#0d0f1c',
  muted:   '#56608a',
  faint:   '#9499bb',
  dark:    '#08091a',
  dark2:   '#0d1030',
}
const RGB = '33,41,126'

// ── Enhanced app preview ──────────────────────────────────────
function AppPreview() {
  const kpis = [
    { label: 'Total Leads',      val: '2,847', diff: '+12%', up: true },
    { label: 'Active Patients',  val: '1,429', diff: '+8%',  up: true },
    { label: 'Appts Today',      val: '34',    diff: '↑ 4 vs yesterday', up: true },
    { label: 'Conversion',       val: '42%',   diff: '+5pp', up: true },
  ]
  const rows = [
    { name: 'Ramesh Kumar',  stage: 'Interested', sc: '#f59e0b', pr: 'High',   dot: '#ef4444' },
    { name: 'Priya Sharma',  stage: 'Contacted',  sc: '#0ea5e9', pr: 'Medium', dot: '#f59e0b' },
    { name: 'Deepa Nair',    stage: 'Follow-up',  sc: '#8b5cf6', pr: 'Urgent', dot: '#7c3aed' },
    { name: 'Vikram Singh',  stage: 'Converted',  sc: '#10b981', pr: 'Low',    dot: '#10b981' },
  ]

  return (
    <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
      {/* glow halo */}
      <div style={{ position: 'absolute', inset: '-40px', background: `radial-gradient(ellipse at center, rgba(${RGB},0.4) 0%, transparent 65%)`, filter: 'blur(48px)', zIndex: 0 }} />

      {/* browser chrome */}
      <div style={{ position: 'relative', zIndex: 1, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>
        {/* title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#13172e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          </div>
          <div style={{ flex: 1, margin: '0 14px' }}>
            <div style={{ padding: '3px 10px', borderRadius: 5, background: '#0a0d1f', border: '1px solid rgba(255,255,255,0.07)', fontSize: 10.5, color: 'rgba(255,255,255,0.28)' }}>
              app.healthcrm.in/dashboard
            </div>
          </div>
        </div>

        {/* layout */}
        <div style={{ display: 'flex', height: 350, background: B.surf2 }}>
          {/* sidebar */}
          <div style={{ width: 46, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 3, background: '#fff', borderRight: `1px solid ${B.border}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Heart size={13} color="#fff" />
            </div>
            {[BarChart2, TrendingUp, Users, Calendar, CreditCard, CheckSquare, Bell].map((Icon, i) => (
              <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: i === 0 ? B.bg50 : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={13} style={{ color: i === 0 ? B.brand : B.faint }} />
              </div>
            ))}
            <div style={{ marginTop: 'auto' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={13} style={{ color: B.faint }} />
              </div>
            </div>
          </div>

          {/* main */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* topbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: '#fff', borderBottom: `1px solid ${B.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: B.text }}>Dashboard</span>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <div style={{ padding: '4px 10px', background: B.brand, borderRadius: 6, fontSize: 8.5, color: '#fff', fontWeight: 700 }}>+ New Lead</div>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: B.bg50, border: `1.5px solid ${B.bg100}` }} />
              </div>
            </div>

            {/* kpi row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '10px 12px 8px' }}>
              {kpis.map((k, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', border: `1px solid ${B.border}` }}>
                  <div style={{ fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: B.faint, marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: B.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: 7, marginTop: 3, color: k.up ? '#16a34a' : B.faint, fontWeight: 600 }}>{k.diff}</div>
                </div>
              ))}
            </div>

            {/* table */}
            <div style={{ margin: '0 12px 12px', flex: 1, borderRadius: 10, overflow: 'hidden', border: `1px solid ${B.border}`, background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '7px 12px', background: B.surf2, borderBottom: `1px solid ${B.border}` }}>
                {['Name', 'Stage', 'Priority', 'Action'].map(h => (
                  <span key={h} style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: B.faint }}>{h}</span>
                ))}
              </div>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '8px 12px', alignItems: 'center', borderBottom: i < rows.length - 1 ? `1px solid ${B.border}` : 'none', background: i % 2 === 0 ? '#fff' : B.surf2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: r.sc + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: r.sc }}>{r.name[0]}</div>
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: B.text }}>{r.name}</span>
                  </div>
                  <span style={{ fontSize: 7.5, fontWeight: 600, padding: '2px 7px', borderRadius: 99, width: 'fit-content', background: r.sc + '18', color: r.sc }}>{r.stage}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: r.dot }} />
                    <span style={{ fontSize: 8, color: B.muted }}>{r.pr}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ padding: '2px 6px', borderRadius: 4, background: B.bg50, fontSize: 7, color: B.brand, fontWeight: 600 }}>Call</div>
                    <div style={{ padding: '2px 6px', borderRadius: 4, background: '#dcfce7', fontSize: 7, color: '#15803d', fontWeight: 600 }}>Done</div>
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

// ── Data ──────────────────────────────────────────────────────
const MINI_NAV = [
  { icon: LayoutDashboard, label: 'Overview',     href: '#hero' },
  { icon: TrendingUp,      label: 'Lead CRM',     href: '#features' },
  { icon: Users,           label: 'Patients',     href: '#features' },
  { icon: Calendar,        label: 'Appointments', href: '#features' },
  { icon: Workflow,        label: 'Automation',   href: '#features' },
  { icon: BarChart2,       label: 'Analytics',    href: '#features' },
  { icon: CreditCard,      label: 'Billing',      href: '#features' },
]

const STATS = [
  { value: '500+',  label: 'Clinics & hospitals' },
  { value: '2.4M+', label: 'Patient interactions' },
  { value: '40%',   label: 'Avg conversion lift' },
  { value: '∞',     label: 'Free to start' },
]

const FEATURES = [
  { icon: TrendingUp,  title: 'Lead Pipeline',          desc: 'Custom stages, priority scoring, and one-click contact logging. Move every inquiry from first call to conversion without a single lead falling through.', color: '#6366f1' },
  { icon: Plug,        title: 'Automatic Lead Capture',  desc: 'Pull leads from Google Forms, Meta Ads, WhatsApp, WordPress, and Zapier — directly into your pipeline with smart field mapping. Zero manual entry.', color: '#0ea5e9', badge: 'New' },
  { icon: Workflow,    title: 'Automation Rules',        desc: 'Trigger stage changes, task creation, and team notifications when events happen. Set it once — let the system run the follow-up loop for you.', color: '#f59e0b', badge: 'New' },
  { icon: PhoneCall,   title: 'Follow-up Tracking',      desc: 'Schedule calls and WhatsApp messages, log every outcome, and automatically create the next touchpoint. No lead goes cold, ever.', color: '#10b981' },
  { icon: Users,       title: 'Patient Records',         desc: 'Complete profiles with demographics, medical history, insurance, and your own custom fields — all searchable, filterable, and linked to the timeline.', color: '#8b5cf6' },
  { icon: Calendar,    title: 'Appointment Scheduling',  desc: 'Book, confirm, and manage appointments per doctor. Daily schedule views, status tracking, and cancellation handling — all in one place.', color: '#ec4899' },
  { icon: Stethoscope, title: 'Clinical Consultations',  desc: 'Structured visit records with diagnosis, prescription, treatment plans, and visit details. Linked directly to the patient profile and timeline.', color: '#14b8a6', badge: 'New' },
  { icon: CreditCard,  title: 'Billing & Invoices',      desc: 'Generate professional invoices, record payments, and track outstanding balances. Your finance dashboard without the spreadsheet.', color: '#f97316' },
  { icon: Settings,    title: 'Custom Modules',          desc: 'Add fields and sections to leads or patients — vitals, insurance, referral source, emergency contacts — without writing a single line of code.', color: '#a855f7' },
]

const STEPS = [
  { n: '01', title: 'Set up in 5 minutes',  desc: 'Add your clinic details, invite your team, and configure the modules you need. Zero onboarding calls. No implementation consultants.', icon: Zap },
  { n: '02', title: 'Connect your lead sources', desc: 'Link your intake forms, Meta ads, or website contact form. Every new inquiry lands in your pipeline automatically, tagged and ready to act on.', icon: Plug },
  { n: '03', title: 'Convert and retain', desc: 'Turn inquiries into patients, schedule appointments, log consultations, and track payments — all from one screen, without switching tools.', icon: TrendingUp },
]

const TESTIMONIALS = [
  {
    name: 'Dr. Rajesh Patel',
    role: 'Director, Patel Diagnostics Centre, Ahmedabad',
    quote: 'Before HealthCRM, we tracked leads through WhatsApp groups and Excel. Now every inquiry is captured, followed up, and converted faster than I thought possible. Our conversion rate doubled in 3 months.',
    rating: 5,
    stat: '2× conversion',
  },
  {
    name: 'Priya Krishnamurthy',
    role: 'Owner, SkinSense Aesthetic Clinic, Bengaluru',
    quote: 'The custom modules feature is incredible. We built a full skin consultation tracker without any technical help. The entire team was onboarded in a single afternoon.',
    rating: 5,
    stat: '1-day onboarding',
  },
  {
    name: 'Dr. Anand Mehta',
    role: 'Senior Orthopedic Surgeon, MedLine Hospital, Mumbai',
    quote: 'What impressed me most is the automation. When a follow-up is logged, the next one is already scheduled. We haven\'t lost a single lead to poor follow-up since we switched.',
    rating: 5,
    stat: '0 missed leads',
  },
]

const INTEGRATIONS = [
  { name: 'Google Forms', emoji: '📋' },
  { name: 'Meta Lead Ads', emoji: '📘' },
  { name: 'WhatsApp', emoji: '💬' },
  { name: 'Zapier', emoji: '⚡' },
  { name: 'WordPress', emoji: '🌐' },
  { name: 'Webhooks API', emoji: '🔗' },
]

// ── Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeMini, setActiveMini] = useState('Overview')

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif", color: B.text, background: B.surface }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        .float { animation: float 9s ease-in-out infinite; }
        .btn-main {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${B.brand}; color: #fff; text-decoration: none;
          font-weight: 700; border-radius: 11px;
          transition: background .18s, transform .18s, box-shadow .18s;
        }
        .btn-main:hover { background: ${B.light}; transform: translateY(-2px); box-shadow: 0 12px 36px rgba(${RGB},.4); }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
          border: 1.5px solid rgba(255,255,255,.14); color: rgba(255,255,255,.65);
          border-radius: 11px; font-weight: 500;
          background: rgba(255,255,255,.04);
          transition: background .15s, border-color .15s, color .15s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.24); color: #fff; }
        .feat-card { transition: all .22s; }
        .feat-card:hover { transform: translateY(-5px); box-shadow: 0 20px 56px rgba(${RGB},.1); }
        .mini-tab { transition: all .14s; text-decoration: none; }
        .mini-tab:hover { background: ${B.bg50} !important; color: ${B.text} !important; }
        .nav-link { transition: all .14s; text-decoration: none; }
        .nav-link:hover { background: ${B.surf2} !important; color: ${B.text} !important; }
        @media (max-width: 860px) {
          .desk-only { display: none !important; }
          .mob-btn   { display: flex !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid  { grid-template-columns: repeat(2,1fr) !important; }
          .trust-row   { gap: 18px !important; }
        }
        @media (max-width: 540px) {
          .footer-grid { grid-template-columns: 1fr !important; }
          .stats-grid  { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── Announcement bar ── */}
      <div style={{ background: `linear-gradient(90deg, ${B.brand} 0%, ${B.lighter} 100%)`, padding: '9px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'rgba(255,255,255,.88)', fontWeight: 500 }}>
          <Sparkles size={13} color="#fbbf24" />
          New: Automation Rules, Clinical Consultations &amp; Lead Integrations are live
        </span>
        <a href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: 'rgba(255,255,255,.6)', textDecoration: 'none', fontWeight: 600, padding: '2px 9px', borderRadius: 99, border: '1px solid rgba(255,255,255,.22)', transition: 'all .14s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.15)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.6)' }}
        >
          Explore <ChevronRight size={11} />
        </a>
      </div>

      {/* ── Sticky header (main nav + mini nav) ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: `1px solid ${B.border}` }}>

        {/* Main nav */}
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={17} color="#fff" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.5px', color: B.text }}>HealthCRM</span>
          </div>

          {/* Desktop nav */}
          <nav className="desk-only" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {['Features', 'Solutions', 'Pricing', 'Resources'].map(item => (
              <a key={item} href="#" className="nav-link" style={{ fontSize: 13.5, color: B.muted, padding: '7px 14px', borderRadius: 8, background: 'transparent' }}>
                {item}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="desk-only" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Link href="/login" className="nav-link" style={{ fontSize: 13.5, color: B.muted, padding: '7px 16px', borderRadius: 8, background: 'transparent' }}>
              Log in
            </Link>
            <Link href="/login" className="btn-main" style={{ fontSize: 13.5, padding: '8px 20px' }}>
              Get started free <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="mob-btn" onClick={() => setMobileOpen(o => !o)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: B.muted, padding: 4, alignItems: 'center' }}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ padding: '16px 24px 20px', borderTop: `1px solid ${B.border}`, background: B.surface, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['Features', 'Solutions', 'Pricing', 'Resources'].map(item => (
              <a key={item} href="#" style={{ fontSize: 14, color: B.muted, textDecoration: 'none', padding: '10px 8px', borderRadius: 8 }}>{item}</a>
            ))}
            <div style={{ borderTop: `1px solid ${B.border}`, marginTop: 8, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/login" style={{ fontSize: 14, color: B.muted, textDecoration: 'none', textAlign: 'center', padding: '11px', border: `1px solid ${B.border}`, borderRadius: 10 }}>Log in</Link>
              <Link href="/login" style={{ fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center', padding: '11px', borderRadius: 10, background: B.brand, color: '#fff' }}>Get started free</Link>
            </div>
          </div>
        )}

        {/* ── Mini nav (product modules) ── */}
        <div style={{ borderTop: `1px solid ${B.border}`, background: B.surf2, overflowX: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 2, height: 44, minWidth: 'max-content' }}>
            {MINI_NAV.map(({ icon: Icon, label, href }) => {
              const active = activeMini === label
              return (
                <a key={label} href={href} className="mini-tab"
                  onClick={() => setActiveMini(label)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 13px', borderRadius: 8, whiteSpace: 'nowrap',
                    fontSize: 12.5, fontWeight: active ? 700 : 500,
                    color: active ? B.brand : B.muted,
                    background: active ? B.bg50 : 'transparent',
                    borderBottom: `2px solid ${active ? B.brand : 'transparent'}`,
                  }}
                >
                  <Icon size={13} />
                  {label}
                </a>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="hero" style={{ background: B.dark, padding: '96px 24px 0', overflow: 'hidden', position: 'relative' }}>
        {/* Gradient blobs */}
        <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: 900, height: 700, background: `radial-gradient(ellipse at center, rgba(${RGB},.28) 0%, transparent 65%)`, zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 120, left: '8%', width: 340, height: 340, background: 'radial-gradient(ellipse at center, rgba(91,102,216,.14) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 220, right: '6%', width: 280, height: 280, background: 'radial-gradient(ellipse at center, rgba(16,185,129,.08) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 840, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.11)', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.7)', marginBottom: 30 }}>
            <Activity size={12} color="#10b981" />
            Healthcare CRM Platform
            <span style={{ display: 'inline-block', width: 1, height: 12, background: 'rgba(255,255,255,.15)' }} />
            <span style={{ color: '#34d399', fontWeight: 700 }}>500+ clinics trust us</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(38px,6.5vw,70px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-2.5px', color: '#fff', marginBottom: 24 }}>
            Run your clinic smarter,
            <br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 45%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              not harder.
            </span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 20px', fontWeight: 400 }}>
            One platform for leads, patients, appointments, and billing — with intelligent automation that turns more inquiries into loyal, long-term patients.
          </p>

          {/* Social proof line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{ display: 'flex' }}>
              {['#6366f1','#8b5cf6','#ec4899','#0ea5e9','#10b981'].map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: 14, border: '2px solid rgba(255,255,255,.15)', background: c, marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>
                  {['R','P','D','V','A'][i]}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#fbbf24" color="#fbbf24" />)}
            </div>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>Rated 4.9/5 by 200+ clinic teams</span>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 80 }}>
            <Link href="/login" className="btn-main" style={{ fontSize: 15.5, padding: '14px 32px', boxShadow: `0 8px 32px rgba(${RGB},.55)` }}>
              Start for free <ArrowRight size={16} />
            </Link>
            <a href="#how" className="btn-ghost" style={{ fontSize: 15.5, padding: '14px 28px' }}>
              See how it works
            </a>
          </div>
        </div>

        {/* App preview */}
        <div style={{ maxWidth: 1040, margin: '0 auto', position: 'relative', zIndex: 1 }} className="float">
          <AppPreview />
        </div>
      </section>

      {/* ── Stats ── */}
      <div style={{ background: B.surface, borderBottom: `1px solid ${B.border}` }}>
        <div className="stats-grid" style={{ maxWidth: 960, margin: '0 auto', padding: '44px 24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, textAlign: 'center' }}>
          {STATS.map(({ value, label }) => (
            <div key={label} style={{ padding: '16px 8px' }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: B.brand, letterSpacing: '-1.5px', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 13.5, color: B.muted, marginTop: 6, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust bar ── */}
      <div style={{ background: B.surf2, borderBottom: `1px solid ${B.border}`, padding: '18px 24px' }}>
        <div className="trust-row" style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
          {[
            { icon: Shield,    text: 'Data Security & Privacy' },
            { icon: Lock,      text: 'Role-based Access Control' },
            { icon: Plug,      text: '6+ Native Integrations' },
            { icon: Activity,  text: '99.9% Uptime SLA' },
            { icon: Settings,  text: 'No-code Customisation' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: B.muted, fontWeight: 500 }}>
              <Icon size={14} color={B.brand} />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" style={{ background: B.surface, padding: '108px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 68 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: B.bg50, border: `1px solid ${B.border}`, fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: B.brand, marginBottom: 16 }}>
              Platform Features
            </div>
            <h2 style={{ fontSize: 'clamp(30px,4.5vw,48px)', fontWeight: 900, letterSpacing: '-1.2px', color: B.text, marginBottom: 16 }}>
              Everything your clinic needs
            </h2>
            <p style={{ fontSize: 17, color: B.muted, maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
              From first inquiry to final invoice — HealthCRM covers every touchpoint so nothing slips through the cracks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, desc, badge, color }) => (
              <div key={title} className="feat-card" style={{ position: 'relative', padding: '28px', borderRadius: 18, border: `1.5px solid ${B.border}`, background: B.surface, overflow: 'hidden', cursor: 'default' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '18px 18px 0 0' }} />
                {badge && (
                  <span style={{ position: 'absolute', top: 20, right: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 99, background: B.bg50, color: B.brand }}>{badge}</span>
                )}
                <div style={{ width: 46, height: 46, borderRadius: 14, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon size={21} color={color} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: B.text, marginBottom: 9 }}>{title}</h3>
                <p style={{ fontSize: 14, color: B.muted, lineHeight: 1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ background: B.dark2, padding: '108px 24px', borderTop: `1px solid rgba(255,255,255,.06)` }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 68 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 16 }}>
              How it works
            </div>
            <h2 style={{ fontSize: 'clamp(30px,4.5vw,48px)', fontWeight: 900, letterSpacing: '-1.2px', color: '#fff' }}>
              Up and running in minutes
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,.4)', maxWidth: 480, margin: '16px auto 0', lineHeight: 1.7 }}>
              No implementation partner. No 6-week onboarding. Just a system that works from day one.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 20 }}>
            {STEPS.map(({ n, title, desc, icon: Icon }, idx) => (
              <div key={n} style={{ position: 'relative', padding: '36px 30px', borderRadius: 20, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -8, right: 12, fontSize: 88, fontWeight: 900, color: 'rgba(255,255,255,.03)', lineHeight: 1, letterSpacing: '-4px', userSelect: 'none' }}>{n}</div>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `rgba(${RGB},.5)`, border: `1px solid rgba(${RGB},.6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
                  <Icon size={20} color="#818cf8" />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#818cf8', marginBottom: 10 }}>Step {idx + 1}</div>
                <h3 style={{ fontSize: 16.5, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', lineHeight: 1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: B.surf2, padding: '108px 24px', borderTop: `1px solid ${B.border}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: B.bg50, border: `1px solid ${B.border}`, fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: B.brand, marginBottom: 16 }}>
              Customer stories
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, letterSpacing: '-1.2px', color: B.text }}>
              Loved by healthcare teams
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px,1fr))', gap: 22 }}>
            {TESTIMONIALS.map(({ name, role, quote, rating, stat }) => (
              <div key={name} style={{ padding: '30px', borderRadius: 20, border: `1.5px solid ${B.border}`, background: B.surface, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[...Array(rating)].map((_, i) => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: B.brand, background: B.bg50, padding: '4px 10px', borderRadius: 99 }}>{stat}</span>
                </div>
                <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.8, fontStyle: 'italic', flex: 1 }}>"{quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: `linear-gradient(135deg, ${B.brand}, ${B.lighter})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                    {name[0]}{name.split(' ')[1]?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: B.text }}>{name}</div>
                    <div style={{ fontSize: 11.5, color: B.faint, marginTop: 1 }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <div style={{ background: B.surface, borderTop: `1px solid ${B.border}`, borderBottom: `1px solid ${B.border}`, padding: '52px 24px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: B.faint, marginBottom: 28 }}>
            Connects with the tools you already use
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {INTEGRATIONS.map(({ name, emoji }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 11, background: B.surf2, border: `1.5px solid ${B.border}`, fontSize: 13, fontWeight: 600, color: B.muted, transition: 'all .15s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = B.bg100; e.currentTarget.style.background = B.bg50; e.currentTarget.style.color = B.text }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.background = B.surf2; e.currentTarget.style.color = B.muted }}
              >
                <span style={{ fontSize: 17 }}>{emoji}</span>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <section style={{ background: B.dark, padding: '108px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 60%, rgba(${RGB},.3) 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 300, height: 300, background: 'radial-gradient(ellipse, rgba(129,140,248,.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 250, height: 250, background: 'radial-gradient(ellipse, rgba(16,185,129,.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 28 }}>
            <Zap size={12} color="#fbbf24" />
            No credit card required
          </div>

          <h2 style={{ fontSize: 'clamp(34px,5.5vw,58px)', fontWeight: 900, letterSpacing: '-2px', color: '#fff', marginBottom: 18, lineHeight: 1.08 }}>
            Ready to transform<br />your practice?
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.45)', marginBottom: 52, lineHeight: 1.75, maxWidth: 460, margin: '0 auto 52px' }}>
            Join 500+ healthcare teams who manage more patients with less effort — and grow their revenue without growing their workload.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15.5, fontWeight: 700, padding: '14px 32px', borderRadius: 11, background: '#fff', color: B.brand, textDecoration: 'none', boxShadow: '0 8px 40px rgba(0,0,0,.35)', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 56px rgba(0,0,0,.45)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,.35)' }}
            >
              Get started for free <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn-ghost" style={{ fontSize: 15.5, padding: '14px 28px' }}>
              Log in to your account
            </Link>
          </div>

          {/* Trust pills */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Free forever plan', 'No setup fee', 'Cancel anytime'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>
                <Check size={12} color="#34d399" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#05060f', padding: '72px 24px 40px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 1fr', gap: 48, marginBottom: 64 }}>
            {/* Brand col */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={15} color="#fff" />
                </div>
                <span style={{ fontWeight: 900, fontSize: 17, color: '#fff', letterSpacing: '-0.5px' }}>HealthCRM</span>
              </div>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.38)', lineHeight: 1.8, maxWidth: 272, marginBottom: 24 }}>
                The complete CRM platform for healthcare clinics, hospitals, and diagnostic centres. Built for teams who care about both patients and growth.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {['🐦', '💼', '📺'].map((emoji, i) => (
                  <a key={i} href="#" style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, textDecoration: 'none', transition: 'background .14s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                  >{emoji}</a>
                ))}
              </div>
            </div>

            {/* Link cols */}
            {[
              { heading: 'Product',  links: ['Features', 'Integrations', 'Pricing', "What's new", 'Roadmap'] },
              { heading: 'Company',  links: ['About us', 'Blog', 'Careers', 'Press', 'Contact'] },
              { heading: 'Legal', links: [
                  { label: 'Privacy Policy',    href: '/privacy' },
                  { label: 'Terms & Conditions', href: '/terms' },
                  { label: 'Cookie Policy',     href: '/cookies' },
                  { label: 'Security Policy',   href: '/security' },
                  { label: 'Data Retention',    href: '/data-retention' },
                  { label: 'Contact Us',        href: '/contact' },
              ]},
            ].map(({ heading, links }) => (
              <div key={heading}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'rgba(255,255,255,.25)', marginBottom: 18 }}>{heading}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {links.map(l => {
                    const label = typeof l === 'string' ? l : l.label
                    const href  = typeof l === 'string' ? '#' : l.href
                    return (
                      <Link key={label} href={href} style={{ fontSize: 13.5, color: 'rgba(255,255,255,.42)', textDecoration: 'none', transition: 'color .14s' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.82)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.42)'}
                      >{label}</Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.18)' }}>
              © 2026 HealthCRM Technologies Pvt. Ltd. All rights reserved. Built for healthcare professionals.
            </p>
            <div style={{ display: 'flex', gap: 22 }}>
              {[
                { label: 'Privacy',   href: '/privacy' },
                { label: 'Terms',     href: '/terms' },
                { label: 'Cookies',   href: '/cookies' },
                { label: 'Security',  href: '/security' },
                { label: 'Contact',   href: '/contact' },
              ].map(({ label, href }) => (
                <Link key={label} href={href} style={{ fontSize: 12, color: 'rgba(255,255,255,.22)', textDecoration: 'none', transition: 'color .14s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.55)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.22)'}
                >{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
