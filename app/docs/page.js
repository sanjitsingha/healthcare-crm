'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Rocket, TrendingUp, Users, Calendar, Stethoscope, CheckSquare,
  PhoneCall, Tag, Workflow, LayoutGrid, Plug, CreditCard, LifeBuoy,
  Settings, ArrowRight, Star, AlertCircle, ChevronRight, Search,
} from 'lucide-react'

// Blue (Indigo) brand to match the marketing site. Set on the root so every
// var(--color-*) below resolves to the docs theme regardless of app theme.
const THEME_VARS = {
  '--color-brand': '#21297E',
  '--color-brand-light': '#3a43b5',
  '--color-brand-50': '#e8eaf6',
}

// ── Navigation / section registry ─────────────────────────────
const NAV = [
  {
    group: 'Getting Started',
    items: [
      { id: 'overview',    label: 'Overview',     icon: BookOpen },
      { id: 'quick-start', label: 'Quick Start',  icon: Rocket },
    ],
  },
  {
    group: 'Core Records',
    items: [
      { id: 'leads',         label: 'Leads',         icon: TrendingUp },
      { id: 'patients',      label: 'Patients',      icon: Users },
      { id: 'appointments',  label: 'Appointments',  icon: Calendar },
      { id: 'consultations', label: 'Consultations', icon: Stethoscope },
      { id: 'tasks',         label: 'Tasks',         icon: CheckSquare },
    ],
  },
  {
    group: 'Engagement',
    items: [
      { id: 'followups', label: 'Follow-ups',      icon: PhoneCall },
      { id: 'tags',      label: 'Tags',            icon: Tag },
      { id: 'rules',     label: 'Automation Rules', icon: Workflow },
    ],
  },
  {
    group: 'Customization',
    items: [
      { id: 'modules',  label: 'Custom Modules',  icon: LayoutGrid },
      { id: 'settings', label: 'Settings & Team', icon: Settings },
    ],
  },
  {
    group: 'Integrations',
    items: [
      { id: 'integrations',  label: 'Lead Capture', icon: Plug },
      { id: 'field-mapping', label: 'Field Mapping', icon: ArrowRight },
    ],
  },
  {
    group: 'More',
    items: [
      { id: 'billing', label: 'Billing',        icon: CreditCard },
      { id: 'support', label: 'Support Tickets', icon: LifeBuoy },
    ],
  },
]

const ALL_IDS = NAV.flatMap(g => g.items.map(i => i.id))

// ── Small content primitives ──────────────────────────────────
function Doc({ id, icon: Icon, title, lead, children }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4 pb-10 mb-10 border-b border-(--color-border) last:border-b-0">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
          <Icon size={18} style={{ color: 'var(--color-brand)' }} />
        </div>
        <h2 className="text-xl font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      </div>
      {lead && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{lead}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function P({ children }) {
  return <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
}

function Steps({ items }) {
  return (
    <ol className="space-y-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-800 mt-0.5" style={{ background: 'var(--color-brand)', color: 'white' }}>{i + 1}</span>
          <span className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t}</span>
        </li>
      ))}
    </ol>
  )
}

function Bullets({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          <ChevronRight size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function Tip({ children }) {
  return (
    <div className="flex gap-2.5 px-3.5 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' + '30' }}>
      <Star size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
    </div>
  )
}

function Note({ children }) {
  return (
    <div className="flex gap-2.5 px-3.5 py-3 rounded-xl border" style={{ background: '#fef9c3', borderColor: '#fde68a' }}>
      <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#b45309' }} />
      <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>{children}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function DocsPage() {
  const [active, setActive] = useState('overview')
  const [query, setQuery] = useState('')
  const contentRef = useRef(null)

  // Scroll-spy: highlight the nav item for the section in view.
  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { root, rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )
    ALL_IDS.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  const filteredNav = NAV
    .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(query.toLowerCase())) }))
    .filter(g => g.items.length)

  return (
    <div className="flex flex-col h-screen" style={{ ...THEME_VARS, background: 'var(--color-bg, #f7f8fc)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 h-14 border-b border-(--color-border) shrink-0" style={{ background: 'var(--color-surface, #fff)' }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-800" style={{ color: 'var(--color-text-primary)' }}>HealthCRM Docs</p>
            <p className="text-[10px] font-600 uppercase tracking-widest" style={{ color: 'var(--color-brand)' }}>Documentation</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/help" className="hidden sm:inline text-xs font-600 px-3 py-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>Help Center</Link>
          <Link href="/login" className="text-xs font-600 px-3.5 py-1.5 rounded-lg text-white inline-flex items-center gap-1.5" style={{ background: 'var(--color-brand)' }}>
            Open app <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-(--color-border) h-full overflow-y-auto p-3 hidden md:block" style={{ background: 'var(--color-surface, #fff)' }}>
          <div className="relative mb-3">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search docs…"
              className="w-full pl-8 pr-2 py-2 text-xs rounded-lg border border-(--color-border) outline-none"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
          </div>
          <nav className="space-y-4">
            {filteredNav.map(g => (
              <div key={g.group}>
                <p className="px-2 mb-1 text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{g.group}</p>
                <div className="space-y-0.5">
                  {g.items.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => scrollTo(id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-500 text-left transition-colors"
                      style={active === id
                        ? { background: 'var(--color-brand)', color: 'white' }
                        : { color: 'var(--color-text-secondary)' }}>
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-10">

            <Doc id="overview" icon={BookOpen} title="Overview"
              lead="HealthCRM is an all-in-one CRM built for clinics and healthcare practices — manage leads, patients, appointments, billing, and your whole pipeline in one place.">
              <P>This documentation walks through every feature. Use the sidebar to jump to a topic, or search above. Everything here reflects the live product.</P>
              <Bullets items={[
                'Leads & pipeline — capture inquiries and move them stage by stage to conversion.',
                'Patients & consultations — full clinical records linked to each patient.',
                'Appointments, tasks, and follow-ups — never lose track of the next step.',
                'Automation, custom fields, and integrations — shape the CRM to your workflow.',
              ]} />
            </Doc>

            <Doc id="quick-start" icon={Rocket} title="Quick Start"
              lead="Get your workspace running in a few minutes.">
              <Steps items={[
                'Set up your organization in Settings → Organization (clinic name, patient ID format, branding).',
                'Add your team in Settings → People (doctors and staff members).',
                'Create your tags and any custom modules you need.',
                'Start adding leads — manually or automatically via an integration.',
                'Work each lead through follow-ups and appointments, then convert to a patient.',
              ]} />
              <Tip>Most settings load once per session — reload an open page to see newly saved settings.</Tip>
            </Doc>

            <Doc id="leads" icon={TrendingUp} title="Leads"
              lead="A lead is a potential patient. Each lead carries contact details, a pipeline stage, priority, source, tags, tasks, follow-ups, and appointments.">
              <P>Open any lead to see its full profile. Change the pipeline stage from the stage pill at the top, assign it to a team member, add tags, and record activity — all of it is captured on the lead's timeline.</P>
              <Bullets items={[
                'Stages: New → Contacted → Interested → Follow-up → Converted / Lost.',
                'Convert a qualified lead into a patient with one click — details carry over.',
                'Add notes at the bottom of the lead page; everything is timestamped on the timeline.',
              ]} />
            </Doc>

            <Doc id="patients" icon={Users} title="Patients"
              lead="Patients are your active records — created directly or by converting a lead.">
              <P>A patient profile holds demographics, medical history, appointments, consultations, tasks, and any custom modules you've added. A linked lead and patient share their activity so nothing is duplicated.</P>
              <Bullets items={[
                'Each patient gets an auto-generated patient code (format configurable in Settings → Organization).',
                'Add medical records, book appointments, and track follow-ups from the patient page.',
              ]} />
            </Doc>

            <Doc id="appointments" icon={Calendar} title="Appointments"
              lead="Book, confirm, reschedule, and track appointments for leads and patients.">
              <P>Book an appointment from a lead or patient page — pick a date, doctor, and add notes. Booking from a lead without a patient record will create one automatically. Appointments appear on both the linked lead and patient.</P>
            </Doc>

            <Doc id="consultations" icon={Stethoscope} title="Consultations"
              lead="Consultations are clinical visit records — diagnosis, treatment, and visit details tied to a patient.">
              <P>Log a consultation to capture what happened in a visit. It links to the patient timeline so the full clinical history stays in one place.</P>
            </Doc>

            <Doc id="tasks" icon={CheckSquare} title="Tasks"
              lead="Lightweight to-dos attached to a lead or patient.">
              <P>Add a task with a title, priority, and due date. Completing tasks can trigger automation rules. Tasks created for a follow-up appear automatically when you schedule the next step.</P>
            </Doc>

            <Doc id="followups" icon={PhoneCall} title="Follow-ups"
              lead="Track every call, WhatsApp, and email touchpoint so no lead goes cold.">
              <P>Each follow-up records a type, date/time, outcome, who called, and the response. Log the outcome of a follow-up and optionally schedule the next one — a matching task is created for you.</P>
              <Bullets items={[
                'Regular view — readable cards, grouped and sortable.',
                'Table view — a spreadsheet-style grid. Type in text cells, and pick dropdown values as Google-Sheets-style chips.',
                'The empty bottom row in table view creates a new follow-up as soon as you fill a cell.',
                'Sort the table by date added or last modified from the sort menu in the header.',
              ]} />
              <Tip>Switch between Regular and Table view using the two icons next to the "Follow-ups" heading.</Tip>
            </Doc>

            <Doc id="tags" icon={Tag} title="Tags"
              lead="Colour-coded labels for organising and filtering leads and patients.">
              <P>Create tags in Settings → Tags and choose whether each applies to the Leads page, Patients page, or both. Apply them on any record and filter your lists by tag.</P>
            </Doc>

            <Doc id="rules" icon={Workflow} title="Automation Rules"
              lead="Run actions automatically when something happens — no manual steps.">
              <P>Build rules in Settings → Rules. A rule watches for an event, optionally checks conditions, then runs an action.</P>
              <Bullets items={[
                'Events (lead): follow-up logged, appointment booked, task added/completed, tag added, stage changed.',
                'Events (patient): appointment booked, task added/completed, tag added, medical record added.',
                'Conditions: match on fields like source, priority, stage, status, or gender.',
                'Actions: set stage / status, or add a tag. Every action is written to the timeline.',
              ]} />
              <Tip>Add multiple rules for both leads and patients, then Save. Reload an open record to apply newly saved rules.</Tip>
            </Doc>

            <Doc id="modules" icon={LayoutGrid} title="Custom Modules"
              lead="Add your own sections and fields to the Leads or Patients page — no code.">
              <P>In Settings → Modules, create a module, choose whether it shows on Leads or Patients, and add fields (text, number, date, phone, email, dropdown, yes/no). Active modules appear as an editable card on the matching record page.</P>
            </Doc>

            <Doc id="settings" icon={Settings} title="Settings & Team"
              lead="Configure your workspace, branding, team, and more.">
              <Bullets items={[
                'Organization — clinic details, patient ID format, theme.',
                'People — add doctors and staff members (used in assignment and follow-ups).',
                'Tags, Modules, Rules — covered in their own sections.',
                'Configuration — connect integrations (see Lead Capture).',
              ]} />
            </Doc>

            <Doc id="integrations" icon={Plug} title="Lead Capture & Integrations"
              lead="Capture leads automatically from external forms and services.">
              <P>In Settings → Configuration, connect a provider to get a webhook URL. Submissions arrive as new leads automatically.</P>
              <Bullets items={[
                'Google Forms — paste the provided Apps Script into your form and add an "On form submit" trigger.',
                'Meta Lead Ads, WordPress forms, Zapier, and a generic webhook are also supported.',
                'Each integration learns your form’s question names after the first submission.',
              ]} />
              <Note>The webhook URL must be publicly reachable — use your deployed site URL, not localhost.</Note>
            </Doc>

            <Doc id="field-mapping" icon={ArrowRight} title="Field Mapping"
              lead="Map each form question to the exact lead field it should fill.">
              <P>After a form submits once, open its integration and use the Field Mapping panel. Choose a detected form question on the left and the lead field on the right (or store it as a custom field). Unmapped questions are still auto-detected and saved.</P>
            </Doc>

            <Doc id="billing" icon={CreditCard} title="Billing"
              lead="Keep your practice finances in one place.">
              <P>Generate invoices and record payments tied to patients so your billing stays organised alongside clinical records.</P>
            </Doc>

            <Doc id="support" icon={LifeBuoy} title="Support Tickets"
              lead="Raise issues without leaving the app.">
              <P>Use "Raise a Complaint" in the bottom bar to file a support ticket. Track its status from your tickets list.</P>
            </Doc>

            <div className="pt-2 pb-16 text-center">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Need more help? Visit the <Link href="/help" className="font-600" style={{ color: 'var(--color-brand)' }}>Help Center</Link>.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
