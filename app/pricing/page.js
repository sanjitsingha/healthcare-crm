import Link from 'next/link'
import { PLANS } from '@/lib/subscriptions'

const features = {
  starter: ['Core CRM & patient records', 'Appointments & consultations', 'Tasks, notifications & billing', '3 team seats'],
  growth: ['Everything in Starter', 'Reports & automations', 'Pharmacy and role management', '10 team seats'],
  enterprise: ['Everything in Growth', 'Custom modules and forms', 'Integrations and webhooks', 'Unlimited team seats'],
}

export default function PricingPage() {
  return <main className="min-h-screen bg-slate-50 px-5 py-16"><div className="mx-auto max-w-6xl text-center">
    <Link href="/" className="text-sm font-700 text-indigo-700">← Flowra</Link>
    <p className="mt-8 text-xs font-800 tracking-[.16em] text-indigo-600">SIMPLE CLINIC PRICING</p><h1 className="mt-3 text-4xl font-900 tracking-tight text-slate-950">Choose a plan that fits your practice.</h1>
    <p className="mt-4 text-slate-600">Start with 14 days of Enterprise access. All prices are in INR and exclude GST.</p>
    <div className="mt-10 grid gap-5 text-left md:grid-cols-3">{Object.values(PLANS).map(plan => <section key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <h2 className="text-xl font-800 text-slate-900">{plan.name}</h2><p className="mt-4 text-3xl font-900 text-slate-950">₹{plan.monthly.toLocaleString()}<span className="text-sm font-500 text-slate-500"> / month</span></p>
      <p className="mt-1 text-sm text-slate-500">₹{plan.annual.toLocaleString()} / year + GST</p>
      <ul className="mt-6 space-y-3 text-sm text-slate-700">{features[plan.id].map(item => <li key={item}>✓ {item}</li>)}</ul>
      <Link href={`/contact?plan=${plan.id}`} className="mt-8 block rounded-lg bg-indigo-800 px-4 py-3 text-center text-sm font-700 text-white">Talk to sales</Link>
    </section>)}</div>
  </div></main>
}
