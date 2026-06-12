import Link from 'next/link'
import { Heart, ArrowLeft, ChevronRight } from 'lucide-react'

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
    <div className="legal-wrap">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .legal-wrap {
          font-family: 'Inter', 'DM Sans', system-ui, sans-serif;
          color: #0d0f1c;
          background: #fff;
          min-height: 100vh;
        }

        /* Header */
        .legal-header {
          position: sticky; top: 0; z-index: 40;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid #e2e4ef;
        }
        .legal-header-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 0 24px; height: 58px;
          display: flex; align-items: center;
          justify-content: space-between; gap: 16px;
        }
        .legal-logo {
          display: flex; align-items: center; gap: 8px; text-decoration: none;
        }
        .legal-logo-icon {
          width: 32px; height: 32px; border-radius: 9px;
          background: #21297E;
          display: flex; align-items: center; justify-content: center;
        }
        .legal-logo-text {
          font-weight: 900; font-size: 16px; color: #0d0f1c; letter-spacing: -0.4px;
        }
        .legal-back-btn {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; color: #56608a; text-decoration: none;
          padding: 6px 14px; border-radius: 8px;
          border: 1px solid #e2e4ef; font-weight: 500;
          transition: background 0.13s, color 0.13s;
        }
        .legal-back-btn:hover { background: #f5f7fc; color: #0d0f1c; }

        /* Hero */
        .legal-hero {
          background: #f5f7fc; border-bottom: 1px solid #e2e4ef;
          padding: 44px 24px 36px;
        }
        .legal-hero-inner { max-width: 1100px; margin: 0 auto; }
        .legal-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #9499bb; margin-bottom: 12px; flex-wrap: wrap;
        }
        .legal-breadcrumb a { color: #9499bb; text-decoration: none; }
        .legal-breadcrumb a:hover { color: #21297E; }
        .legal-title {
          font-size: clamp(26px, 4vw, 40px); font-weight: 900;
          letter-spacing: -1px; color: #0d0f1c; margin-bottom: 10px;
        }
        .legal-updated { font-size: 13px; color: #9499bb; }

        /* Body */
        .legal-body-wrap {
          max-width: 1100px; margin: 0 auto; padding: 0 24px;
          display: flex; gap: 56px; align-items: flex-start;
        }

        /* Sidebar */
        .legal-sidebar {
          width: 220px; flex-shrink: 0;
          position: sticky; top: 78px;
          padding: 40px 0;
        }
        .legal-sidebar-label {
          font-size: 10.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.8px;
          color: #9499bb; margin-bottom: 10px; padding-left: 12px;
        }
        .legal-sidebar nav { display: flex; flex-direction: column; gap: 2px; }
        .side-link {
          display: block; padding: 8px 12px; border-radius: 8px;
          font-size: 13px; color: #56608a; text-decoration: none;
          transition: background 0.13s, color 0.13s;
        }
        .side-link:hover { background: #eceef8; color: #21297E; }

        /* Content */
        .legal-content {
          flex: 1; min-width: 0; padding: 40px 0 80px;
        }
        .legal-content h2 {
          font-size: 20px; font-weight: 800; color: #0d0f1c;
          margin: 40px 0 12px; letter-spacing: -0.4px;
        }
        .legal-content h3 {
          font-size: 15px; font-weight: 700; color: #0d0f1c; margin: 28px 0 8px;
        }
        .legal-content p {
          font-size: 14.5px; color: #56608a; line-height: 1.85; margin-bottom: 14px;
        }
        .legal-content ul, .legal-content ol {
          padding-left: 22px; margin-bottom: 14px;
        }
        .legal-content li {
          font-size: 14.5px; color: #56608a; line-height: 1.85; margin-bottom: 6px;
        }
        .legal-content a { color: #21297E; text-decoration: underline; }
        .legal-content strong { color: #0d0f1c; font-weight: 700; }
        .legal-content table {
          width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;
        }
        .legal-content th {
          text-align: left; padding: 10px 14px;
          background: #f5f7fc; border: 1px solid #e2e4ef;
          font-weight: 700; color: #0d0f1c;
          font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .legal-content td {
          padding: 10px 14px; border: 1px solid #e2e4ef; color: #56608a;
        }

        /* Footer */
        .legal-footer {
          background: #08091a; border-top: 1px solid rgba(255,255,255,.05);
          padding: 36px 24px;
        }
        .legal-footer-inner {
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
        }
        .legal-footer-brand {
          display: flex; align-items: center; gap: 8px;
        }
        .legal-footer-brand-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: #21297E;
          display: flex; align-items: center; justify-content: center;
        }
        .legal-footer-links {
          display: flex; gap: 18px; flex-wrap: wrap;
        }
        .legal-footer-link {
          font-size: 12px; color: rgba(255,255,255,.28);
          text-decoration: none; transition: color 0.13s;
        }
        .legal-footer-link:hover { color: rgba(255,255,255,.65); }

        @media (max-width: 780px) {
          .legal-sidebar { display: none; }
          .legal-content { padding: 32px 0 60px; }
        }
      `}</style>

      {/* Header */}
      <header className="legal-header">
        <div className="legal-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/" className="legal-logo">
              <div className="legal-logo-icon">
                <Heart size={15} color="#fff" />
              </div>
              <span className="legal-logo-text">HealthCRM</span>
            </Link>
            <span style={{ color: '#e2e4ef', fontSize: 18, lineHeight: 1 }}>|</span>
            <span style={{ fontSize: 13, color: '#9499bb', fontWeight: 500 }}>Legal &amp; Policies</span>
          </div>
          <Link href="/" className="legal-back-btn">
            <ArrowLeft size={13} /> Back to home
          </Link>
        </div>
      </header>

      {/* Page hero */}
      <div className="legal-hero">
        <div className="legal-hero-inner">
          <div className="legal-breadcrumb">
            <Link href="/">Home</Link>
            <ChevronRight size={11} style={{ flexShrink: 0 }} />
            <Link href="/privacy">Legal</Link>
            <ChevronRight size={11} style={{ flexShrink: 0 }} />
            <span style={{ color: '#21297E', fontWeight: 600 }}>{title}</span>
          </div>
          <h1 className="legal-title">{title}</h1>
          {lastUpdated && <p className="legal-updated">Last updated: {lastUpdated}</p>}
        </div>
      </div>

      {/* Body */}
      <div className="legal-body-wrap">
        <aside className="legal-sidebar">
          <p className="legal-sidebar-label">Policies</p>
          <nav>
            {POLICY_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="side-link">
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="legal-content">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <div className="legal-footer-brand">
            <div className="legal-footer-brand-icon">
              <Heart size={13} color="#fff" />
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>
              © 2026 HealthCRM Technologies Pvt. Ltd.
            </span>
          </div>
          <div className="legal-footer-links">
            {POLICY_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="legal-footer-link">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
