'use client'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { B, RGB, R, BRAND } from './tokens'

// ── Logomark: two flow strokes on a brand tile ─────────────────
export function FlowraMark({ size = 34, radius = R.ctl }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: B.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M3.5 8.5C6.5 5 9.5 5 12 8.5s5.5 3.5 8.5 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M3.5 15C6.5 11.5 9.5 11.5 12 15s5.5 3.5 8.5 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function Wordmark({ size = 17, color = B.ink, sub = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7 }}>
      <span style={{ fontWeight: 700, fontSize: size, letterSpacing: '-0.4px', color }}>{BRAND.name}</span>
      {sub && <span style={{ fontSize: size * 0.62, color: B.faint, fontWeight: 500 }}>by Nebkern</span>}
    </span>
  )
}

// Shared CSS (button styles, nav link, card hover, responsive helpers).
export function MarketingStyles() {
  return (
    <style>{`
      *,*::before,*::after { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      .lp-root {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
      .lp-root h1, .lp-root h2 { letter-spacing: -0.03em; }
      .lp-root h3 { letter-spacing: -0.012em; }
      .lp-primary { display:inline-flex; align-items:center; gap:8px; background:${B.brand}; color:#fff; text-decoration:none; font-weight:600; border-radius:${R.ctl}px; transition:background .15s; }
      .lp-primary:hover { background:${B.brand2}; }
      .lp-ghost { display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid ${B.line}; color:${B.ink}; border-radius:${R.ctl}px; font-weight:600; background:#fff; transition:background .15s, border-color .15s; }
      .lp-ghost:hover { background:${B.tint}; border-color:#d6d9e8; }
      .lp-navlink { font-size:14px; color:${B.muted}; text-decoration:none; font-weight:500; transition:color .14s; }
      .lp-navlink:hover { color:${B.ink}; }
      .lp-subnav { overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none; }
      .lp-subnav::-webkit-scrollbar { display:none; }
      .lp-card { transition: border-color .16s, box-shadow .16s; }
      .lp-card:hover { border-color:#d3d7e4; box-shadow: 0 8px 24px rgba(20,22,31,.05); }
      .lp-footlink { font-size:13.5px; color:${B.muted}; text-decoration:none; transition:color .14s; width:fit-content; }
      .lp-footlink:hover { color:${B.ink}; }
      @keyframes lp-floatA { 0%,100% { transform: translate(0,0) rotate(-3deg) } 50% { transform: translate(-14px,-34px) rotate(-3deg) } }
      @keyframes lp-floatB { 0%,100% { transform: translate(0,0) rotate(2.5deg) } 50% { transform: translate(16px,-40px) rotate(2.5deg) } }
      @keyframes lp-floatC { 0%,100% { transform: translate(0,0) rotate(3deg) } 50% { transform: translate(14px,-30px) rotate(3deg) } }
      @keyframes lp-draw { 0% { stroke-dashoffset: 1; opacity: 0 } 10% { opacity: 1 } 62% { stroke-dashoffset: 0; opacity: 1 } 84% { stroke-dashoffset: 0; opacity: 0 } 100% { stroke-dashoffset: 1; opacity: 0 } }
      @keyframes lp-ping { 0% { transform: scale(1); opacity: .55 } 70%,100% { transform: scale(3.4); opacity: 0 } }
      @media (prefers-reduced-motion: reduce) { .lp-floater, .lp-connectors path, .lp-connectors circle { animation: none !important; } }
      @media (max-width: 1180px) { .lp-floater, .lp-connectors { display:none !important; } }
      @media (max-width: 860px) {
        .lp-desk { display:none !important; }
        .lp-grid-2 { grid-template-columns:1fr !important; }
        .lp-foot { grid-template-columns:1fr 1fr !important; }
      }
      @media (max-width: 620px) {
        .lp-board-scroll { overflow-x:auto; }
      }
    `}</style>
  )
}

// ── Sticky two-tier nav ────────────────────────────────────────
// Main bar: just the logo + the auth action. Secondary bar below holds
// all the navigation links.
const NAV = [
  { label: 'Features',   href: '/#features' },
  { label: 'Security',   href: '/#security' },
  { label: 'Pricing',    href: '/pricing' },
  { label: 'FAQ',        href: '/#faq' },
  { label: 'Blog',       href: '/blog' },
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'Docs',       href: '/docs' },
  { label: 'Contact',    href: '/contact' },
]

export function MarketingNav({ loggedIn = false, dest = '/dashboard' }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${B.line}` }}>
      {/* Main bar */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <FlowraMark size={32} />
          <Wordmark size={17} />
        </Link>
        {loggedIn ? (
          <Link href={dest} className="lp-primary" style={{ fontSize: 14, padding: '8px 18px' }}>Dashboard</Link>
        ) : (
          <Link href="/login" className="lp-primary" style={{ fontSize: 14, padding: '8px 18px' }}>
            Sign in <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Secondary nav bar */}
      <div style={{ borderTop: `1px solid ${B.line}`, background: 'rgba(255,255,255,0.55)' }}>
        <nav className="lp-subnav" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 44, display: 'flex', alignItems: 'center', gap: 26 }}>
          {NAV.map(n => <Link key={n.label} href={n.href} className="lp-navlink" style={{ whiteSpace: 'nowrap' }}>{n.label}</Link>)}
        </nav>
      </div>
    </header>
  )
}

// ── Light footer ───────────────────────────────────────────────
const FOOTER_COLS = [
  { heading: 'Product', links: [['Features', '/#features'], ['Security', '/#security'], ['Pricing', '/pricing'], ['Status', '/status']] },
  { heading: 'Company', links: [['Blog', '/blog'], ['Newsletter', '/newsletter'], ['Contact', '/contact'], ['Docs', '/docs']] },
  { heading: 'Legal',   links: [['Privacy', '/privacy'], ['Terms', '/terms'], ['Cookies', '/cookies'], ['Data retention', '/data-retention']] },
]

export function MarketingFooter() {
  return (
    <footer style={{ background: B.tint, borderTop: `1px solid ${B.line}`, padding: '60px 28px 34px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div className="lp-foot" style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 1fr', gap: 44, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <FlowraMark size={30} />
              <Wordmark size={16} sub />
            </div>
            <p style={{ fontSize: 13.5, color: B.muted, lineHeight: 1.8, maxWidth: 300 }}>
              The clinic operating system — leads, patients, appointments, and billing in one clean workspace.
            </p>
          </div>
          {FOOTER_COLS.map(({ heading, links }) => (
            <div key={heading}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: B.faint, marginBottom: 16 }}>{heading}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {links.map(([label, href]) => (
                  <Link key={label} href={href} className="lp-footlink">{label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${B.line}`, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12.5, color: B.faint }}>© {new Date().getFullYear()} {BRAND.legal}. All rights reserved.</p>
          <p style={{ fontSize: 12.5, color: B.faint }}>{BRAND.full}</p>
        </div>
      </div>
    </footer>
  )
}
