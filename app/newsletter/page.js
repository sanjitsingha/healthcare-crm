'use client'
import { useState } from 'react'
import { Mail, ArrowRight, Check, Loader2, Bell, Sparkles, ShieldCheck } from 'lucide-react'
import { B, R } from '@/components/marketing/tokens'
import { MarketingStyles, MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'

const PERKS = [
  { icon: Sparkles,    title: 'Product updates',   desc: 'Be first to know when we ship new features and improvements.' },
  { icon: Bell,        title: 'Clinic-growth tips', desc: 'Practical playbooks on leads, follow-ups, and retention.' },
  { icon: ShieldCheck, title: 'No spam, ever',      desc: 'A short email only when it’s worth your time. Unsubscribe anytime.' },
]

export default function NewsletterPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [msg, setMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (state === 'loading') return
    setState('loading'); setMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source: 'newsletter_page' }),
      })
      const data = await res.json()
      if (!res.ok) { setState('error'); setMsg(data.error || 'Something went wrong.'); return }
      setState('done')
    } catch {
      setState('error'); setMsg('Network error. Please try again.')
    }
  }

  return (
    <div className="lp-root" style={{ fontFamily: "'Inter','DM Sans',system-ui,sans-serif", color: B.ink, background: B.surface, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingStyles />
      <MarketingNav />

      <section style={{ flex: 1, background: B.surface, padding: '72px 28px 96px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(33,41,126,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(33,41,126,.04) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 20%, #000 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 20%, #000 0%, transparent 70%)',
        }} />
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 52, height: 52, borderRadius: R.ctl, background: B.brandTint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <Mail size={22} color={B.brand} />
          </div>
          <h1 style={{ fontSize: 'clamp(30px,4.6vw,44px)', fontWeight: 700, letterSpacing: '-1.4px', color: B.ink, marginBottom: 14, lineHeight: 1.1 }}>
            The Flowra newsletter
          </h1>
          <p style={{ fontSize: 17.5, color: B.muted, lineHeight: 1.65, maxWidth: 480, margin: '0 auto 34px' }}>
            Product updates and clinic-growth tips, straight to your inbox. Join the clinics building smarter operations with Flowra.
          </p>

          {/* Form */}
          {state === 'done' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 24px', borderRadius: R.card, border: `1px solid ${B.line}`, background: B.tint }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={15} color="#15803d" />
              </span>
              <span style={{ fontSize: 15, fontWeight: 500, color: B.ink }}>You’re subscribed. Welcome aboard!</span>
            </div>
          ) : (
            <form onSubmit={submit} style={{ maxWidth: 460, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  style={{ flex: 1, minWidth: 200, padding: '13px 16px', fontSize: 15, borderRadius: R.ctl, border: `1px solid ${state === 'error' ? '#dc2626' : B.line}`, outline: 'none', color: B.ink, background: B.surface }}
                />
                <button type="submit" disabled={state === 'loading'} className="lp-primary" style={{ fontSize: 15, padding: '13px 24px', border: 'none', cursor: 'pointer', opacity: state === 'loading' ? 0.7 : 1 }}>
                  {state === 'loading' ? <><Loader2 size={16} className="lp-spin" /> Subscribing…</> : <>Subscribe <ArrowRight size={16} /></>}
                </button>
              </div>
              {state === 'error' && <p style={{ fontSize: 13, color: '#dc2626', marginTop: 10, textAlign: 'left' }}>{msg}</p>}
              <p style={{ fontSize: 12.5, color: B.faint, marginTop: 12 }}>We care about your data. Read our <a href="/privacy" style={{ color: B.muted, textDecoration: 'underline' }}>privacy policy</a>.</p>
            </form>
          )}
        </div>

        {/* Perks */}
        <div style={{ maxWidth: 980, margin: '64px auto 0', position: 'relative', zIndex: 1 }}>
          <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {PERKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: B.surface, border: `1px solid ${B.line}`, borderRadius: R.card, padding: '26px 24px' }}>
                <div style={{ width: 38, height: 38, borderRadius: R.ctl, background: B.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={17} color={B.brand} />
                </div>
                <h3 style={{ fontSize: 15.5, fontWeight: 600, color: B.ink, marginBottom: 7 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: B.muted, lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />

      <style>{`@keyframes lp-spin { to { transform: rotate(360deg) } } .lp-spin { animation: lp-spin .8s linear infinite; }`}</style>
    </div>
  )
}
