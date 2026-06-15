import Link from 'next/link'
import { ArrowRight, Clock, FileText } from 'lucide-react'
import { B, R } from '@/components/marketing/tokens'
import { MarketingStyles, MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'

export const metadata = {
  title: 'Blog — Flowra by Nebkern',
  description: 'Product updates, clinic-growth playbooks, and notes from the Flowra team.',
}

const CATEGORIES = ['All', 'Product', 'Growth', 'Operations', 'Security']

const POSTS = [
  {
    slug: '#', featured: true, category: 'Product',
    title: 'Designing your own PDF invoice templates in Flowra',
    excerpt: 'Upload a letterhead, choose a data layout, and set the placement — your pharmacy invoices now print exactly the way your clinic brands them.',
    date: 'Jun 15, 2026', read: '5 min', author: 'Flowra Team',
  },
  {
    slug: '#', category: 'Growth',
    title: 'Why most clinics lose leads in the first 24 hours',
    excerpt: 'The follow-up gap is where revenue quietly leaks. Here is how a simple automation loop closes it.',
    date: 'Jun 8, 2026', read: '6 min', author: 'Flowra Team',
  },
  {
    slug: '#', category: 'Operations',
    title: 'A practical guide to lead pipelines for healthcare',
    excerpt: 'Stages, priority scoring, and the handful of fields that actually matter when you track inquiries.',
    date: 'May 30, 2026', read: '7 min', author: 'Flowra Team',
  },
  {
    slug: '#', category: 'Security',
    title: 'How we keep patient data protected by design',
    excerpt: 'Encryption, role-based access, and audit logging — the layers that sit under every record in Flowra.',
    date: 'May 22, 2026', read: '4 min', author: 'Flowra Team',
  },
  {
    slug: '#', category: 'Product',
    title: 'Capturing leads from Meta, WhatsApp & web forms',
    excerpt: 'Connect your sources once and watch every inquiry land in the pipeline — tagged, routed, and ready.',
    date: 'May 14, 2026', read: '5 min', author: 'Flowra Team',
  },
  {
    slug: '#', category: 'Growth',
    title: 'Turning one-time visits into long-term patients',
    excerpt: 'Retention is a workflow, not a hope. The recall and follow-up patterns that keep patients coming back.',
    date: 'May 6, 2026', read: '6 min', author: 'Flowra Team',
  },
]

function Cover({ height = 200, label }) {
  return (
    <div style={{ position: 'relative', height, background: B.tint, borderBottom: `1px solid ${B.line}`, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(33,41,126,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(33,41,126,.045) 1px, transparent 1px)`,
        backgroundSize: '26px 26px',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 46, height: 46, borderRadius: R.ctl, background: B.surface, border: `1px solid ${B.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={20} color={B.brand} />
        </div>
      </div>
      {label && (
        <span style={{ position: 'absolute', top: 14, left: 14, fontSize: 11, fontWeight: 600, color: B.brand, background: B.surface, border: `1px solid ${B.line}`, padding: '3px 9px', borderRadius: R.tag }}>{label}</span>
      )}
    </div>
  )
}

export default function BlogPage() {
  const featured = POSTS.find(p => p.featured)
  const rest = POSTS.filter(p => !p.featured)

  return (
    <div className="lp-root" style={{ fontFamily: "'Inter','DM Sans',system-ui,sans-serif", color: B.ink, background: B.surface, minHeight: '100vh' }}>
      <MarketingStyles />
      <MarketingNav />

      {/* Header */}
      <section style={{ background: B.surface, padding: '72px 28px 40px', borderBottom: `1px solid ${B.line}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: B.brand, marginBottom: 16 }}>
            <span style={{ width: 16, height: 1.5, background: B.brand, display: 'inline-block' }} /> The Flowra Blog
          </div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,50px)', fontWeight: 700, letterSpacing: '-1.6px', color: B.ink, marginBottom: 14, lineHeight: 1.08 }}>
            Ideas for clinics that want to grow
          </h1>
          <p style={{ fontSize: 17.5, color: B.muted, lineHeight: 1.65, maxWidth: 560 }}>
            Product updates, growth playbooks, and operational notes from the team building Flowra.
          </p>

          <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c, i) => (
              <span key={c} style={{
                fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: R.tag, cursor: 'default',
                border: `1px solid ${i === 0 ? B.brand : B.line}`,
                background: i === 0 ? B.brand : B.surface, color: i === 0 ? '#fff' : B.muted,
              }}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section style={{ background: B.surface, padding: '48px 28px 0' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>
            <Link href={featured.slug} className="lp-card lp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0, border: `1px solid ${B.line}`, borderRadius: R.card, overflow: 'hidden', textDecoration: 'none', background: B.surface }}>
              <Cover height={320} label={featured.category} />
              <div style={{ padding: '40px 38px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: B.faint, marginBottom: 14 }}>
                  <span style={{ fontWeight: 600, color: B.brand }}>Featured</span>
                  <span>{featured.date}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={12} /> {featured.read}</span>
                </div>
                <h2 style={{ fontSize: 'clamp(22px,2.6vw,28px)', fontWeight: 700, letterSpacing: '-0.8px', color: B.ink, lineHeight: 1.2, marginBottom: 14 }}>{featured.title}</h2>
                <p style={{ fontSize: 15.5, color: B.muted, lineHeight: 1.72, marginBottom: 22 }}>{featured.excerpt}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14.5, fontWeight: 600, color: B.brand }}>
                  Read article <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Grid */}
      <section style={{ background: B.surface, padding: '40px 28px 96px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {rest.map(p => (
              <Link key={p.title} href={p.slug} className="lp-card" style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${B.line}`, borderRadius: R.card, overflow: 'hidden', textDecoration: 'none', background: B.surface }}>
                <Cover label={p.category} />
                <div style={{ padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: B.faint, marginBottom: 12 }}>
                    <span>{p.date}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={11} /> {p.read}</span>
                  </div>
                  <h3 style={{ fontSize: 17.5, fontWeight: 600, letterSpacing: '-0.4px', color: B.ink, lineHeight: 1.3, marginBottom: 10 }}>{p.title}</h3>
                  <p style={{ fontSize: 14, color: B.muted, lineHeight: 1.68, marginBottom: 18, flex: 1 }}>{p.excerpt}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, color: B.brand }}>
                    Read more <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
