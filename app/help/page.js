'use client'
import { useState } from 'react'
import {
  LayoutDashboard, TrendingUp, UserRound, Calendar, CheckSquare,
  Bell, CreditCard, Settings, Users, Building2, Kanban, Tag,
  LayoutGrid, Shield, Stethoscope, Phone, Mail, ChevronDown,
  ArrowRight, Star, Zap, BookOpen, User,
} from 'lucide-react'

// ── Reusable pieces ────────────────────────────────────────────
function Section({ id, title, children }) {
  return (
    <section id={id} className="space-y-4">
      <h2 className="text-base font-700 pb-2 border-b border-(--color-border)" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function ModuleCard({ icon: Icon, title, description, color = 'var(--color-brand)' }) {
  return (
    <div className="p-4 rounded-2xl border border-(--color-border) space-y-2 hover:shadow-sm transition-shadow" style={{ background: 'var(--color-surface)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
    </div>
  )
}

function Step({ n, title, description }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-800 mt-0.5" style={{ background: 'var(--color-brand)', color: 'white' }}>
        {n}
      </div>
      <div>
        <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
      </div>
    </div>
  )
}

function Tip({ children }) {
  return (
    <div className="flex gap-2.5 px-3.5 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' + '30' }}>
      <Star size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
    </div>
  )
}

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-(--color-border) overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-(--color-surface-2)"
        style={{ background: 'var(--color-surface)' }}
      >
        <span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
        <ChevronDown size={15} style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div className="px-4 py-4 border-t border-(--color-border) space-y-3" style={{ background: 'var(--color-surface-2)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function FeaturePill({ label }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-600 border border-(--color-border)" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
      {label}
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function HelpPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Hero */}
      <div className="border-b border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-600 uppercase tracking-widest" style={{ color: 'var(--color-brand)' }}>HealthCRM</p>
              <h1 className="text-2xl font-800 leading-tight" style={{ color: 'var(--color-text-primary)' }}>Help Center</h1>
            </div>
          </div>
          <p className="text-sm max-w-xl leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Everything you need to know about managing your healthcare leads, patients, appointments, and team — all in one place.
          </p>

          {/* Quick nav */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { href: '#modules',   label: 'Modules' },
              { href: '#leads',     label: 'Leads' },
              { href: '#patients',  label: 'Patients' },
              { href: '#appointments', label: 'Appointments' },
              { href: '#tasks',     label: 'Tasks' },
              { href: '#settings',  label: 'Settings' },
              { href: '#workflows', label: 'Workflows' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-600 border border-(--color-border) transition-colors hover:bg-(--color-brand-50)"
                style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)' }}
              >
                {label} <ArrowRight size={11} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">

        {/* ── Modules Overview ── */}
        <Section id="modules" title="Modules Overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ModuleCard icon={LayoutDashboard} title="Dashboard"      color="#6366f1" description="KPIs, pipeline snapshot, upcoming tasks, follow-ups at a glance." />
            <ModuleCard icon={TrendingUp}      title="Leads"          color="#0ea5e9" description="Full lead list + Kanban pipeline view with drag-and-drop stage changes." />
            <ModuleCard icon={UserRound}       title="Patients"       color="#10b981" description="Converted patient records with medical history, tags, and activity." />
            <ModuleCard icon={Calendar}        title="Appointments"   color="#f59e0b" description="Book, confirm, and track patient appointments with doctor assignment." />
            <ModuleCard icon={CheckSquare}     title="Tasks"          color="#8b5cf6" description="Org-wide tasks with Today / Overdue / Completed filters and entity links." />
            <ModuleCard icon={Bell}            title="Follow-ups"     color="#ef4444" description="Log calls, WhatsApp, and emails. Track outcomes and schedule next contact." />
            <ModuleCard icon={CreditCard}      title="Billing"        color="#06b6d4" description="Invoices and payment tracking for patient services." />
            <ModuleCard icon={Settings}        title="Settings"       color="#64748b" description="Org profile, team members, doctors, tags, lead stages, and custom modules." />
          </div>
        </Section>

        {/* ── Leads ── */}
        <Section id="leads" title="Leads">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Leads are potential patients — people who have expressed interest but haven't yet been converted. Every lead moves through a pipeline of stages you define.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface)' }}>
              <p className="text-xs font-700 uppercase tracking-wide" style={{ color: 'var(--color-brand)' }}>Lead Detail Page</p>
              <div className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span><strong>Stage chip</strong> — Click the colored badge beside the name to open a dropdown and change stage instantly.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span><strong>Assign Lead</strong> — Top-right button assigns a team member to own this lead. Initials show when assigned.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span><strong>Convert to Patient</strong> — One-click conversion creates a Patient record and links it. Assignment carries over.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span><strong>Book Appointment</strong> — Schedule from the lead page. If no patient exists, one is auto-created.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span><strong>Follow-ups</strong> — Log calls (with caller name), WhatsApp, and email. Mark done, reschedule, or miss.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span><strong>Timeline</strong> — Auto-logs every action: stage changes, follow-ups, tasks, and appointments.</span></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-(--color-border) space-y-3" style={{ background: 'var(--color-surface)' }}>
              <p className="text-xs font-700 uppercase tracking-wide" style={{ color: '#0ea5e9' }}>Lead Pipeline</p>
              <div className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} /><span><strong>Board view</strong> — Kanban columns per stage. Drag a card to a different column to update the stage instantly.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} /><span><strong>List view</strong> — Collapsible stage groups showing phone, priority, value, assignee, and date.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} /><span><strong>Cards</strong> — Show priority badge, source, value (₹), and assignee initials.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} /><span><strong>Other column</strong> — Leads with unrecognised stages appear in a catch-all "Other" column.</span></div>
              </div>
            </div>
          </div>
          <Tip>Custom lead stages (with colors) are configured in Settings → Tags. Changes apply instantly across all leads and the pipeline.</Tip>
        </Section>

        {/* ── Patients ── */}
        <Section id="patients" title="Patients">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Patients are converted leads. They carry over the lead's contact info and assignment, and gain additional healthcare-specific features.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-(--color-border) space-y-2" style={{ background: 'var(--color-surface)' }}>
              <p className="text-xs font-700 uppercase tracking-wide" style={{ color: '#10b981' }}>Patient Features</p>
              <div className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#10b981' }} /><span><strong>Tags</strong> — Color-coded labels (VIP, Chronic, Follow-up needed…). Add or remove from the profile card. Managed in Settings → Tags.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#10b981' }} /><span><strong>Assign Patient</strong> — Same button pattern as leads. Assigns a team member to own this patient.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#10b981' }} /><span><strong>Medical History</strong> — Add diagnosis, treatment, and notes records. Displayed chronologically.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#10b981' }} /><span><strong>Quick Stats</strong> — Visits, invoices, records, and linked leads at a glance.</span></div>
                <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: '#10b981' }} /><span><strong>Follow-ups</strong> — Same as leads: call logs, WhatsApp, email tracking.</span></div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-(--color-border) space-y-2" style={{ background: 'var(--color-surface)' }}>
              <p className="text-xs font-700 uppercase tracking-wide" style={{ color: '#10b981' }}>Tags vs Stages</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                <strong>Leads</strong> use <em>Stages</em> as their primary pipeline signal — one stage at a time, reflecting where they are in the sales process.
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                <strong>Patients</strong> use <em>Tags</em> for flexible segmentation — multiple tags can be applied simultaneously (e.g. VIP + Chronic + Follow-up needed).
              </p>
            </div>
          </div>
        </Section>

        {/* ── Appointments ── */}
        <Section id="appointments" title="Appointments">
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { status: 'Booked',    color: '#1d4ed8', bg: '#dbeafe', desc: 'Appointment created, awaiting confirmation.' },
              { status: 'Confirmed', color: '#15803d', bg: '#dcfce7', desc: 'Doctor/staff has confirmed the slot.' },
              { status: 'Completed', color: '#374151', bg: '#f3f4f6', desc: 'Visit has taken place.' },
              { status: 'Cancelled', color: '#b91c1c', bg: '#fee2e2', desc: 'Appointment was cancelled.' },
            ].map(({ status, color, bg, desc }) => (
              <div key={status} className="flex items-start gap-2.5 p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
                <span className="text-[10px] font-700 px-2 py-0.5 rounded-full shrink-0 mt-0.5" style={{ background: bg, color }}>{status}</span>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
            <p className="font-700 text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>Booking an Appointment</p>
            <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span>From the <strong>Appointments page</strong> — click "Book Appointment", select patient, link to lead (optional), pick date/time, assign doctor.</span></div>
            <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span>From a <strong>Lead detail page</strong> — scroll to Appointments card, click "Book Appointment". Patient info is auto-filled. If no patient exists, one is created on save.</span></div>
            <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span>An <strong>auto reminder task</strong> is created 5 days before the appointment date, visible in Tasks.</span></div>
            <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span><strong>Reschedule</strong> any booked/confirmed appointment directly from the lead's Appointments card.</span></div>
          </div>
          <Tip>Add your doctors in Settings → People → Doctors. They will appear in the doctor dropdown on every booking form.</Tip>
        </Section>

        {/* ── Tasks ── */}
        <Section id="tasks" title="Tasks">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
                <p className="text-xs font-700 uppercase tracking-wide mb-2" style={{ color: '#8b5cf6' }}>Filters</p>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <p><strong>All</strong> — grouped into Overdue, Today, Upcoming, Completed sections</p>
                  <p><strong>Today</strong> — tasks due today that are not yet complete</p>
                  <p><strong>Overdue</strong> — pending tasks past their due date</p>
                  <p><strong>Completed</strong> — finished tasks</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
                <p className="text-xs font-700 uppercase tracking-wide mb-2" style={{ color: '#8b5cf6' }}>Priority Levels</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Low', bg: '#f1f5f9', color: '#64748b' },
                    { label: 'Medium', bg: '#fef9c3', color: '#a16207' },
                    { label: 'High', bg: '#fee2e2', color: '#b91c1c' },
                    { label: 'Urgent', bg: '#f3e8ff', color: '#7c3aed' },
                  ].map(p => (
                    <span key={p.label} className="text-[10px] font-700 px-2 py-0.5 rounded-full uppercase" style={{ background: p.bg, color: p.color }}>{p.label}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-(--color-border) space-y-2" style={{ background: 'var(--color-surface)' }}>
              <p className="text-xs font-700 uppercase tracking-wide mb-2" style={{ color: '#8b5cf6' }}>Entity Links</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Tasks created from a lead or patient detail page are <strong>linked</strong> to that entity. The task card shows a footer strip with the lead/patient name — clicking it navigates directly to their detail page.
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                <strong>Appointment reminder tasks</strong> are auto-created 5 days before each booked appointment with High priority. They appear in the lead's Tasks tab and the global Tasks page.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Key Workflows ── */}
        <Section id="workflows" title="Key Workflows">
          <div className="space-y-3">
            <Accordion title="Converting a Lead to Patient">
              <div className="space-y-3">
                <Step n={1} title="Open the Lead" description="Navigate to Leads and click on a lead to open the detail page." />
                <Step n={2} title="Click 'Convert to Patient'" description="In the Lead Profile card, click the brand-colored 'Convert to Patient' button at the bottom." />
                <Step n={3} title="Auto-creation" description="A Patient record is created with the lead's contact info, phone, email, address, and assigned team member. The lead's stage is set to Converted." />
                <Step n={4} title="View Patient" description="A 'View Patient Profile' link appears in the Lead Profile card. Click it to navigate to the patient page." />
                <Tip>After conversion, follow-ups and tasks logged on either the lead or patient page appear merged in the patient's history.</Tip>
              </div>
            </Accordion>

            <Accordion title="Setting Up Lead Stages">
              <div className="space-y-3">
                <Step n={1} title="Go to Settings → Tags" description="Click Settings in the sidebar, then select Tags from the settings navigation." />
                <Step n={2} title="Find Lead Stages" description="The second card on the Tags page is 'Lead Stages'. Default stages: New, Contacted, Interested, Follow-up, Converted, Lost." />
                <Step n={3} title="Add a stage" description="Type a stage name, pick a color from the preset swatches or the color picker, and click 'Add Stage'." />
                <Step n={4} title="Delete a stage" description="Hover over any stage pill and click the × that appears. Leads in that stage keep it until manually changed." />
                <Tip>Stage colors appear on the pipeline Kanban columns and on lead cards throughout the app.</Tip>
              </div>
            </Accordion>

            <Accordion title="Logging a Follow-up">
              <div className="space-y-3">
                <Step n={1} title="Open Lead or Patient" description="Go to any lead or patient detail page and scroll to the Follow-ups section at the bottom." />
                <Step n={2} title="Click Add" description="Click the 'Add' button to expand the follow-up form." />
                <Step n={3} title="Select Type & Status" description="Choose Call, WhatsApp, or Email. Then pick a status (e.g. 'Connected - Interested' for calls)." />
                <Step n={4} title="Set Date & Caller" description="Use the date picker to set when it happened. Optionally select the team member who made the call from 'Called By'." />
                <Step n={5} title="Add Response & Save" description="Add the patient's response in the text field. Click Save. The follow-up appears in the list and is logged in the Timeline." />
              </div>
            </Accordion>

            <Accordion title="Managing the Lead Pipeline (Kanban)">
              <div className="space-y-3">
                <Step n={1} title="Navigate to Lead Pipeline" description="In the sidebar, click Leads to expand the sub-menu, then click 'Lead Pipeline'." />
                <Step n={2} title="Board view" description="Each stage appears as a column. Cards show name, priority, source, value, and assignee." />
                <Step n={3} title="Drag to change stage" description="Grab a card and drag it to another column. The stage updates instantly and is saved." />
                <Step n={4} title="Switch to List view" description="Click the 'List' toggle in the top-right. Stages are collapsible rows. Click a row to expand/collapse it." />
              </div>
            </Accordion>

            <Accordion title="Adding Doctors & Team Members">
              <div className="space-y-3">
                <Step n={1} title="Go to Settings → People" description="In the sidebar, click Settings → People." />
                <Step n={2} title="Team Members" description="Add staff with a name and designation. These appear in the 'Assign Lead', 'Assign Patient', and 'Called By' dropdowns." />
                <Step n={3} title="Doctors" description="Add doctors with name, department (short, e.g. 'Cardiology'), and qualification (e.g. 'MBBS, MD')." />
                <Step n={4} title="Usage" description="Doctors appear in the doctor dropdown on the Appointments page and in the Appointments card on lead detail pages." />
              </div>
            </Accordion>
          </div>
        </Section>

        {/* ── Settings ── */}
        <Section id="settings" title="Settings Reference">
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { icon: User,        title: 'Account',      desc: 'View your profile, sign out, and see login activity and 30-day session history (device-local).' },
              { icon: Building2,   title: 'Organization', desc: 'Set org name, type, specialty, registration, contact info, location, and social links.' },
              { icon: Users,       title: 'People',       desc: 'Manage Team Members (for assignment & follow-up caller) and Doctors (for appointment booking).' },
              { icon: Tag,         title: 'Tags',         desc: 'Create color-coded patient tags and configure custom lead stages with colors.' },
              { icon: LayoutGrid,  title: 'Modules',      desc: 'Build custom field sections that appear on Lead or Patient detail pages.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
                  <Icon size={15} style={{ color: 'var(--color-brand)' }} />
                </div>
                <div>
                  <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
            <p className="text-xs font-700 uppercase tracking-wide mb-3" style={{ color: 'var(--color-brand)' }}>Custom Modules</p>
            <div className="space-y-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span>Create named modules with custom fields (text, number, date, phone, email, dropdown, yes/no).</span></div>
              <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span>Assign each module to the <strong>Patients</strong> page. Custom sections appear on the detail page and are editable inline.</span></div>
              <div className="flex gap-2"><ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} /><span>Toggle modules active/inactive without deleting them — data is preserved.</span></div>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-(--color-border) pt-8 text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            HealthCRM Help Center · For support contact{' '}
            <a href="mailto:diabetes.kinshealth@gmail.com" className="underline" style={{ color: 'var(--color-brand)' }}>
              diabetes.kinshealth@gmail.com
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
