'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  Heart, Users, Calendar, CreditCard, TrendingUp,
  CheckSquare, Zap, BarChart2, ArrowRight, Menu, X,
  Shield, UserCheck, Bell, Settings,
  Plug, Workflow, PhoneCall, Tag, Stethoscope,
} from 'lucide-react'

// ── Brand tokens (blue / Indigo theme — mirrors the app's brand color) ──
const B = {
  brand:   '#21297E',
  light:   '#3a43b5',
  bg50:    '#e8eaf6',
  surface: '#ffffff',
  surf2:   '#f2f3fa',
  border:  '#e0e2f0',
  text:    '#131634',
  muted:   '#565d82',
  faint:   '#9499bb',
}
// RGB of the brand color, for translucent shadows.
const BRAND_RGB = '33,41,126'

// ── Dashboard mock ────────────────────────────────────────────
function AppPreview() {
  const leads = [
    { name: 'Ramesh Kumar',   stage: 'New',        sc: '#6366f1', p: 'High',   pc: '#ef4444', phone: '+91 98765 43210' },
    { name: 'Priya Sharma',   stage: 'Contacted',  sc: '#0ea5e9', p: 'Medium', pc: '#f59e0b', phone: '+91 87654 32109' },
    { name: 'Arjun Mehta',    stage: 'Interested', sc: '#f59e0b', p: 'Low',    pc: '#10b981', phone: '+91 76543 21098' },
    { name: 'Deepa Nair',     stage: 'Follow-up',  sc: '#8b5cf6', p: 'Urgent', pc: '#7c3aed', phone: '+91 65432 10987' },
    { name: 'Vikram Singh',   stage: 'Converted',  sc: '#10b981', p: 'Medium', pc: '#f59e0b', phone: '+91 54321 09876' },
  ]
  return (
    <div className="relative w-full" style={{ maxWidth: '680px' }}>
      {/* Subtle shadow underneath */}
      <div className="absolute -bottom-6 left-8 right-8 h-16 rounded-3xl blur-2xl" style={{ background: `rgba(${BRAND_RGB},0.15)` }} />

      {/* Browser frame */}
      <div className="rounded-2xl overflow-hidden border" style={{ background: B.surface, borderColor: B.border, boxShadow: '0 24px 64px rgba(13,31,26,0.12), 0 4px 16px rgba(13,31,26,0.06)' }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: B.surf2, borderBottom: `1px solid ${B.border}` }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
          </div>
          <div className="flex-1 mx-3">
            <div className="px-3 py-0.5 rounded text-[10px]" style={{ background: B.surface, border: `1px solid ${B.border}`, color: B.faint }}>
              app.healthcrm.in/leads
            </div>
          </div>
        </div>

        {/* App layout */}
        <div className="flex" style={{ height: '300px' }}>
          {/* Sidebar */}
          <div className="w-12 shrink-0 flex flex-col items-center pt-3 pb-2 gap-1" style={{ background: B.surface, borderRight: `1px solid ${B.border}` }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: B.brand }}>
              <Heart size={13} className="text-white" />
            </div>
            {[
              { Icon: BarChart2,  active: false },
              { Icon: TrendingUp, active: true  },
              { Icon: Users,      active: false },
              { Icon: Calendar,   active: false },
              { Icon: CreditCard, active: false },
              { Icon: CheckSquare,active: false },
              { Icon: Bell,       active: false },
            ].map(({ Icon, active }, i) => (
              <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: active ? B.bg50 : 'transparent' }}>
                <Icon size={13} style={{ color: active ? B.brand : B.faint }} />
              </div>
            ))}
            <div className="mt-auto">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <Settings size={13} style={{ color: B.faint }} />
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden" style={{ background: B.surf2 }}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: B.surface, borderBottom: `1px solid ${B.border}` }}>
              <span className="text-xs font-700" style={{ color: B.text }}>Leads</span>
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 rounded" style={{ background: B.surf2, border: `1px solid ${B.border}` }} />
                <div className="h-5 w-16 rounded text-[9px] font-600 flex items-center justify-center text-white" style={{ background: B.brand }}>+ New Lead</div>
              </div>
            </div>

            {/* Table */}
            <div className="m-3 rounded-xl overflow-hidden border" style={{ background: B.surface, borderColor: B.border }}>
              <div className="grid px-3 py-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: `1px solid ${B.border}`, background: B.surf2 }}>
                {['Name', 'Phone', 'Stage', 'Priority'].map(h => (
                  <span key={h} className="text-[8px] font-700 uppercase tracking-wider" style={{ color: B.faint }}>{h}</span>
                ))}
              </div>
              {leads.map((r, i) => (
                <div key={i} className="grid px-3 py-2 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: i < leads.length - 1 ? `1px solid ${B.border}` : 'none' }}>
                  <span className="text-[10px] font-500" style={{ color: B.text }}>{r.name}</span>
                  <span className="text-[9px]" style={{ color: B.muted }}>{r.phone.slice(0, 10)}…</span>
                  <span className="text-[8px] font-600 px-1.5 py-0.5 rounded-full w-fit" style={{ background: r.sc + '18', color: r.sc }}>{r.stage}</span>
                  <span className="text-[8px] font-600 px-1.5 py-0.5 rounded-full w-fit" style={{ background: r.pc + '18', color: r.pc }}>{r.p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feature data ──────────────────────────────────────────────
const FEATURES = [
  { icon: TrendingUp,   title: 'Lead Management',    desc: 'Capture leads with custom intake forms, assign stages, and track every interaction from first call to conversion.' },
  { icon: Plug,         title: 'Lead Capture & Integrations', desc: 'Pull leads in automatically from Google Forms, Meta Lead Ads, WordPress, and Zapier — with smart field mapping to your fields.', badge: 'New' },
  { icon: Workflow,     title: 'Automation Rules',   desc: 'Set rules that auto-advance stages, add tags, or trigger actions when a follow-up, task, or appointment happens.', badge: 'New' },
  { icon: PhoneCall,    title: 'Follow-ups',         desc: 'Schedule calls, WhatsApp, and email follow-ups, log outcomes, and auto-create the next task so no lead goes cold.', badge: 'New' },
  { icon: Users,        title: 'Patient Records',     desc: 'Maintain complete patient profiles with demographics, history, and your own custom fields — all searchable.' },
  { icon: Calendar,     title: 'Appointments',        desc: 'Book, confirm, and track appointments. See upcoming schedules and manage no-shows without losing data.' },
  { icon: Stethoscope,  title: 'Consultations',       desc: 'Record clinical visits with diagnosis, treatment, and visit details — linked to the patient timeline.', badge: 'New' },
  { icon: CreditCard,   title: 'Billing & Invoices',  desc: 'Generate invoices, record payments, and keep your practice finances organised in one place.' },
  { icon: Settings,     title: 'Custom Modules',      desc: 'Add your own sections to leads or patients — insurance details, vitals, emergency contacts — without writing code.' },
  { icon: Tag,          title: 'Tags & Segmentation', desc: 'Organise leads and patients with colour-coded tags and filter your pipeline in a click.' },
  { icon: BarChart2,    title: 'Analytics',           desc: 'Track conversion rates, lead sources, revenue trends, and team performance with a real-time dashboard.' },
]

const STEPS = [
  { n: '01', title: 'Set up your organization', desc: 'Add your clinic details, team members, and configure the modules you need in under 5 minutes.' },
  { n: '02', title: 'Start capturing leads',    desc: 'Add incoming patient inquiries, fill their profile, and move them through your pipeline stages.' },
  { n: '03', title: 'Convert and retain',       desc: 'Turn leads into active patients, schedule appointments, and track everything from one dashboard.' },
]

// ── Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: B.text, background: B.surface }}>
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .float { animation: float 6s ease-in-out infinite; }
        .btn-primary {
          background: ${B.brand};
          color: white;
          transition: background .18s, transform .18s;
        }
        .btn-primary:hover { background: ${B.light}; transform: translateY(-1px); }
        .feat-card { transition: box-shadow .2s, transform .2s; }
        .feat-card:hover { box-shadow: 0 8px 32px rgba(${BRAND_RGB},0.12); transform: translateY(-3px); }
      `}</style>

      {/* ── Navbar ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${B.border}` }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>HealthCRM</span>
          </div>

          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden md:flex">
            {['Features', 'How it works', 'Pricing'].map(item => (
              <a key={item} href="#" style={{ fontSize: 14, color: B.muted, textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => e.target.style.color = B.text}
                onMouseLeave={e => e.target.style.color = B.muted}
              >{item}</a>
            ))}
          </nav>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="hidden md:flex">
            <Link href="/login" style={{ fontSize: 14, color: B.muted, textDecoration: 'none', padding: '8px 16px', borderRadius: 8, transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = B.text}
              onMouseLeave={e => e.currentTarget.style.color = B.muted}
            >Log in</Link>
            <Link href="/login" className="btn-primary" style={{ fontSize: 14, fontWeight: 600, padding: '8px 20px', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              Get started <ArrowRight size={14} />
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen(o => !o)} style={{ color: B.muted }}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${B.border}`, background: B.surface, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Features', 'How it works', 'Pricing'].map(item => (
              <a key={item} href="#" style={{ fontSize: 14, color: B.muted, textDecoration: 'none' }}>{item}</a>
            ))}
            <div style={{ borderTop: `1px solid ${B.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/login" style={{ fontSize: 14, color: B.muted, textDecoration: 'none', textAlign: 'center', padding: '9px', border: `1px solid ${B.border}`, borderRadius: 8 }}>Log in</Link>
              <Link href="/login" className="btn-primary" style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center', padding: '9px', borderRadius: 8 }}>Get started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section style={{ background: B.surface, padding: '80px 24px 0', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: B.bg50, border: `1px solid ${B.border}`, fontSize: 12, fontWeight: 600, color: B.brand, marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: B.brand, display: 'inline-block' }} />
            CRM built exclusively for healthcare
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20, color: B.text }}>
            Manage your clinic.<br />
            <span style={{ color: B.brand }}>Grow your practice.</span>
          </h1>

          <p style={{ fontSize: 18, color: B.muted, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 36px', fontWeight: 400 }}>
            One platform for leads, patients, appointments, and billing — with automated lead capture and smart rules, so your team can focus on care, not admin.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
            <Link href="/login" className="btn-primary" style={{ fontSize: 15, fontWeight: 600, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 20px rgba(${BRAND_RGB},0.3)` }}>
              Start for free <ArrowRight size={16} />
            </Link>
            <Link href="/login" style={{ fontSize: 15, fontWeight: 500, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', border: `1.5px solid ${B.border}`, color: B.muted, display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'border-color .15s, color .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = B.brand; e.currentTarget.style.color = B.brand }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.color = B.muted }}
            >
              Log in to your account
            </Link>
          </div>
        </div>

        {/* Screenshot */}
        <div style={{ maxWidth: '1000px', margin: '0 auto' }} className="float">
          <AppPreview />
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div style={{ background: B.surf2, borderTop: `1px solid ${B.border}`, borderBottom: `1px solid ${B.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, textAlign: 'center' }}>
          {[
            { icon: Shield,    text: 'Secure & Private' },
            { icon: UserCheck, text: 'Multi-user Roles' },
            { icon: Plug,      text: 'Form Integrations' },
            { icon: Settings,  text: 'Fully Customisable' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: B.muted, fontWeight: 500 }}>
              <Icon size={15} color={B.brand} />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section style={{ background: B.surface, padding: '100px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: B.brand, marginBottom: 10 }}>Features</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.8px', color: B.text, marginBottom: 12 }}>Everything your clinic needs</h2>
            <p style={{ fontSize: 16, color: B.muted, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>From first inquiry to final payment — HealthCRM handles every step so your team can focus on patients.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, desc, badge }) => (
              <div key={title} className="feat-card" style={{ position: 'relative', padding: '28px', borderRadius: 16, border: `1.5px solid ${B.border}`, background: B.surface, cursor: 'default' }}>
                {badge && (
                  <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 99, background: B.bg50, color: B.brand }}>{badge}</span>
                )}
                <div style={{ width: 42, height: 42, borderRadius: 12, background: B.bg50, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon size={20} color={B.brand} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: B.text, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: B.muted, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: B.surf2, padding: '100px 24px', borderTop: `1px solid ${B.border}` }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: B.brand, marginBottom: 10 }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.8px', color: B.text }}>Up and running in minutes</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} style={{ padding: '32px 28px', borderRadius: 16, background: B.surface, border: `1.5px solid ${B.border}` }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: B.bg50, marginBottom: 16, lineHeight: 1, letterSpacing: '-1px', WebkitTextStroke: `2px ${B.brand}` }}>{n}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: B.text, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: B.muted, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: B.brand, padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.8px', color: '#fff', marginBottom: 14 }}>
            Ready to grow your practice?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 36, lineHeight: 1.6 }}>
            Join healthcare teams using HealthCRM to manage more patients with less effort.
          </p>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 15, fontWeight: 600, padding: '13px 30px', borderRadius: 10,
            background: '#fff', color: B.brand, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'transform .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Get started for free <ArrowRight size={16} />
          </Link>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>No credit card required</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: B.text, padding: '40px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.3px' }}>HealthCRM</span>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Privacy', 'Terms', 'Support', 'Contact'].map(item => (
              <a key={item} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
              >{item}</a>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2026 HealthCRM. Built for healthcare professionals.</p>
        </div>
      </footer>
    </div>
  )
}
