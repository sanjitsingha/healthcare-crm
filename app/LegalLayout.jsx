import Link from 'next/link'
import { Heart, ArrowLeft, ChevronRight } from 'lucide-react'

const B = {
  brand:  '#21297E',
  light:  '#3a43b5',
  text:   '#0d0f1c',
  muted:  '#56608a',
  faint:  '#9499bb',
  border: '#e2e4ef',
  surf:   '#f5f7fc',
  bg50:   '#eceef8',
  dark:   '#08091a',
}

const POLICY_LINKS = [
  { href: '/privacy',        label: 'Privacy Policy' },
  { href: '/terms',          label: 'Terms & Conditions' },
  { href: '/cookies',        label: 'Cookie Policy' },
  { href: '/security',       label: 'Security Policy' },
  { href: '/data-retention', label: 'Data Retention & Deletion' },
  { href: '/contact',        label: 'Contact Us' },
]

export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif", color: B.text, background: '#fff', minHeight: '100vh' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .legal-body h2 { font-size: 20px; font-weight: 800; color: ${B.text}; margin: 40px 0 12px; letter-spacing: -0.4px; }
        .legal-body h3 { font-size: 15px; font-weight: 700; color: ${B.text}; margin: 28px 0 8px; }
        .legal-body p  { font-size: 14.5px; color: ${B.muted}; line-height: 1.85; margin-bottom: 14px; }
        .legal-body ul, .legal-body ol { padding-left: 22px; margin-bottom: 14px; }
        .legal-body li { font-size: 14.5px; color: ${B.muted}; line-height: 1.85; margin-bottom: 6px; }
        .legal-body a  { color: ${B.brand}; text-decoration: underline; }
        .legal-body strong { color: ${B.text}; font-weight: 700; }
        .legal-body table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; }
        .legal-body th { text-align: left; padding: 10px 14px; background: ${B.surf}; border: 1px solid ${B.border}; font-weight: 700; color: ${B.text}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .legal-body td { padding: 10px 14px; border: 1px solid ${B.border}; color: ${B.muted}; }
        .side-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: ${B.muted}; text-decoration: none; transition: all .13s; }
        .side-link:hover { background: ${B.bg50}; color: ${B.brand}; }
        .side-link.active { background: ${B.bg50}; color: ${B.brand}; font-weight: 700; }
        @media (max-width: 780px) { .legal-sidebar { display: none !important; } .legal-main { padding: 32px 20px !important; } }
      `}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: `1px solid ${B.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={15} color="#fff" />
              </div>
              <span style={{ fontWeight: 900, fontSize: 16, color: B.text, letterSpacing: '-0.4px' }}>HealthCRM</span>
            </Link>
            <span style={{ color: B.border, fontSize: 18, lineHeight: 1 }}>|</span>
            <span style={{ fontSize: 13, color: B.faint, fontWeight: 500 }}>Legal &amp; Policies</span>
          </div>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: B.muted, textDecoration: 'none', padding: '6px 14px', borderRadius: 8, border: `1px solid ${B.border}`, fontWeight: 500, transition: 'all .13s' }}
            onMouseEnter={e => { e.currentTarget.style.background = B.surf; e.currentTarget.style.color = B.text }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = B.muted }}
          >
            <ArrowLeft size={13} /> Back to home
          </Link>
        </div>
      </header>

      {/* Page hero */}
      <div style={{ background: B.surf, borderBottom: `1px solid ${B.border}`, padding: '44px 24px 36px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: B.faint, marginBottom: 12, flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: B.faint, textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={11} style={{ flexShrink: 0 }} />
            <Link href="/privacy" style={{ color: B.faint, textDecoration: 'none' }}>Legal</Link>
            <ChevronRight size={11} style={{ flexShrink: 0 }} />
            <span style={{ color: B.brand, fontWeight: 600 }}>{title}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, letterSpacing: '-1px', color: B.text, marginBottom: 10 }}>{title}</h1>
          {lastUpdated && (
            <p style={{ fontSize: 13, color: B.faint }}>Last updated: {lastUpdated}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 56, alignItems: 'flex-start' }}>

        {/* Sidebar */}
        <aside className="legal-sidebar" style={{ width: 220, flexShrink: 0, position: 'sticky', top: 78, paddingTop: 40, paddingBottom: 40 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: B.faint, marginBottom: 10, paddingLeft: 12 }}>Policies</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {POLICY_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="side-link">
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="legal-main legal-body" style={{ flex: 1, minWidth: 0, padding: '40px 0 80px' }}>
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer style={{ background: B.dark, borderTop: '1px solid rgba(255,255,255,.05)', padding: '36px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={13} color="#fff" />
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>© 2026 HealthCRM Technologies Pvt. Ltd.</span>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {POLICY_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontSize: 12, color: 'rgba(255,255,255,.28)', textDecoration: 'none', transition: 'color .13s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.65)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.28)'}
              >{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
