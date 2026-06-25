'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Rocket, TrendingUp, Users, Calendar, Stethoscope, CheckSquare,
  PhoneCall, Tag, Workflow, LayoutGrid, Plug, CreditCard, LifeBuoy,
  Settings, ArrowRight, ArrowLeft, Star, AlertCircle, ChevronRight, Search, Sparkles,
  Globe, Copy, Check, Download, MessageCircle, Send,
} from 'lucide-react'

// Blue (Indigo) brand to match the marketing site. Set on the root so every
// var(--color-*) below resolves to the docs theme regardless of app theme.
const THEME_VARS = {
  '--color-brand': '#21297E',
  '--color-brand-light': '#3a43b5',
  '--color-brand-50': '#eef0fb',
  '--color-border': '#e6e8f2',
  '--color-surface': '#ffffff',
  '--color-surface-2': '#f6f7fc',
  '--color-bg': '#fbfbfe',
  '--color-text-primary': '#13163a',
  '--color-text-secondary': '#3c4163',
  '--color-text-muted': '#787da0',
}

// ── Navigation / section registry ─────────────────────────────
const NAV = [
  {
    group: 'Getting Started',
    items: [
      { id: 'overview',    label: 'Welcome',      icon: BookOpen },
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
      { id: 'followups', label: 'Follow-ups',       icon: PhoneCall },
      { id: 'tags',      label: 'Tags',             icon: Tag },
      { id: 'rules',     label: 'Automation Rules', icon: Workflow },
    ],
  },
  {
    group: 'Messaging',
    items: [
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
      { id: 'telegram', label: 'Telegram', icon: Send },
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
      { id: 'integrations',  label: 'Lead Capture',  icon: Plug },
      { id: 'google-forms',  label: 'Google Forms',  icon: BookOpen },
      { id: 'wordpress',     label: 'WordPress',     icon: Globe },
      { id: 'field-mapping', label: 'Field Mapping', icon: ArrowRight },
    ],
  },
  {
    group: 'More',
    items: [
      { id: 'billing', label: 'Billing',         icon: CreditCard },
      { id: 'support', label: 'Support Tickets', icon: LifeBuoy },
    ],
  },
]

const ALL = NAV.flatMap(g => g.items)
const ALL_IDS = ALL.map(i => i.id)

// ── Content primitives ────────────────────────────────────────
function Doc({ eyebrow, title, lead, children }) {
  return (
    <section>
      {eyebrow && <p className="text-[11px] font-700 uppercase tracking-widest mb-2" style={{ color: 'var(--color-brand)' }}>{eyebrow}</p>}
      <h2 className="text-[28px] font-800 tracking-tight leading-tight" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      {lead && <p className="text-[15px] leading-relaxed mt-3" style={{ color: 'var(--color-text-muted)' }}>{lead}</p>}
      <div className="space-y-4 mt-6">{children}</div>
    </section>
  )
}

function P({ children }) {
  return <p className="text-[14px] leading-7" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
}

function H3({ children }) {
  return <h3 className="text-sm font-700 pt-2" style={{ color: 'var(--color-text-primary)' }}>{children}</h3>
}

function Steps({ items }) {
  return (
    <ol className="space-y-3 relative ml-1">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-800" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>{i + 1}</span>
          <span className="text-[14px] leading-7 pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t}</span>
        </li>
      ))}
    </ol>
  )
}

function Bullets({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-[14px] leading-7" style={{ color: 'var(--color-text-secondary)' }}>
          <ChevronRight size={16} className="shrink-0 mt-1" style={{ color: 'var(--color-brand)' }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function Tip({ children }) {
  return (
    <div className="flex gap-3 px-4 py-3 rounded-xl border" style={{ background: 'var(--color-brand-50)', borderColor: 'var(--color-brand)' + '22' }}>
      <Star size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
      <p className="text-[13px] leading-6" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
    </div>
  )
}

function Note({ children }) {
  return (
    <div className="flex gap-3 px-4 py-3 rounded-xl border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
      <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#c2410c' }} />
      <p className="text-[13px] leading-6" style={{ color: '#9a3412' }}>{children}</p>
    </div>
  )
}

// Copyable code block.
function Code({ children }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <div className="relative">
      <pre className="text-[12px] font-mono p-4 rounded-xl overflow-x-auto whitespace-pre leading-6 border" style={{ background: '#0f1230', color: '#dfe2f5', borderColor: '#1c2150' }}>{children}</pre>
      <button type="button" onClick={copy}
        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-600"
        style={{ background: 'rgba(255,255,255,0.1)', color: copied ? '#86efac' : '#c7cbf0' }}>
        {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
      </button>
    </div>
  )
}

// Mintlify-style card grid — navigates to a topic instead of scrolling.
function CardGroup({ cards, go }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3.5 mt-6">
      {cards.map(({ id, icon: Icon, title, desc }) => (
        <button key={id} type="button" onClick={() => go(id)}
          className="group text-left p-4 rounded-2xl border transition-all hover:-translate-y-0.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--color-brand-50)' }}>
            <Icon size={18} style={{ color: 'var(--color-brand)' }} />
          </div>
          <p className="text-sm font-700 flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
            {title}
            <ArrowRight size={13} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" style={{ color: 'var(--color-brand)' }} />
          </p>
          <p className="text-[13px] leading-6 mt-1" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
        </button>
      ))}
    </div>
  )
}

// ── Hero (shown only on the Welcome topic) ────────────────────
function Hero({ go }) {
  return (
    <div className="rounded-3xl border overflow-hidden mb-10" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-8 py-12 relative" style={{ background: 'linear-gradient(135deg, #21297E 0%, #3a43b5 60%, #5b63d6 100%)' }}>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5 text-[11px] font-600" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
          <Sparkles size={12} /> CRM for healthcare teams
        </div>
        <h1 className="text-[34px] font-800 leading-tight tracking-tight text-white">HealthCRM Documentation</h1>
        <p className="text-[15px] leading-relaxed mt-3 max-w-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Everything you need to run your clinic — leads, patients, appointments, automation, messaging, and integrations. Pick a topic on the left, or start below.
        </p>
        <div className="flex flex-wrap gap-2.5 mt-6">
          <button onClick={() => go('quick-start')} className="inline-flex items-center gap-1.5 text-[13px] font-600 px-4 py-2 rounded-xl" style={{ background: '#fff', color: 'var(--color-brand)' }}>
            Quick Start <ArrowRight size={13} />
          </button>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] font-600 px-4 py-2 rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
            Open the app
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Topic content ─────────────────────────────────────────────
// One topic renders at a time. `go` switches topics (used by cards/links).
function DocBody({ id, go }) {
  switch (id) {
    case 'overview':
      return (
        <Doc eyebrow="Getting Started" title="Welcome"
          lead="HealthCRM is an all-in-one CRM built for clinics and healthcare practices — manage leads, patients, appointments, billing, and your whole pipeline in one place.">
          <P>This documentation covers every feature of the product. Each topic is its own page — use the sidebar to jump around, or the Previous / Next buttons at the bottom to read straight through. Everything here reflects the live product.</P>
          <CardGroup go={go} cards={[
            { id: 'leads',     icon: TrendingUp,    title: 'Leads & Pipeline', desc: 'Capture inquiries and move them stage by stage to conversion.' },
            { id: 'followups', icon: PhoneCall,     title: 'Follow-ups',       desc: 'Track every call, WhatsApp, and email — card or spreadsheet view.' },
            { id: 'rules',     icon: Workflow,      title: 'Automation Rules', desc: 'Triggers, conditions, and actions that react to events.' },
            { id: 'telegram',  icon: Send,          title: 'Messaging',        desc: 'Send reminders and slips over WhatsApp and Telegram.' },
            { id: 'integrations', icon: Plug,       title: 'Lead Capture',     desc: 'Pull leads in from Google Forms, Meta, WordPress, Zapier.' },
            { id: 'modules',   icon: LayoutGrid,    title: 'Custom Modules',   desc: 'Add your own sections and fields without code.' },
          ]} />
        </Doc>
      )

    case 'quick-start':
      return (
        <Doc eyebrow="Getting Started" title="Quick Start"
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
      )

    case 'leads':
      return (
        <Doc eyebrow="Core Records" title="Leads"
          lead="A lead is a potential patient. Each lead carries contact details, a pipeline stage, priority, source, tags, tasks, follow-ups, and appointments.">
          <P>Open any lead to see its full profile. Change the pipeline stage from the stage pill at the top, assign it to a team member, add tags, and record activity — all of it is captured on the lead&apos;s timeline.</P>
          <Bullets items={[
            'Stages: New → Contacted → Interested → Follow-up → Converted / Lost.',
            'Convert a qualified lead into a patient with one click — details carry over.',
            'Add notes at the bottom of the lead page; everything is timestamped on the timeline.',
          ]} />
        </Doc>
      )

    case 'patients':
      return (
        <Doc eyebrow="Core Records" title="Patients"
          lead="Patients are your active records — created directly or by converting a lead.">
          <P>A patient profile holds demographics, medical history, appointments, consultations, tasks, and any custom modules you&apos;ve added. A linked lead and patient share their activity so nothing is duplicated.</P>
          <Bullets items={[
            'Each patient gets an auto-generated patient code (format configurable in Settings → Organization).',
            'Add medical records, book appointments, and track follow-ups from the patient page.',
          ]} />
        </Doc>
      )

    case 'appointments':
      return (
        <Doc eyebrow="Core Records" title="Appointments"
          lead="Book, confirm, reschedule, and track appointments for leads and patients.">
          <P>Book an appointment from a lead or patient page — pick a date, doctor, and add notes. Booking from a lead without a patient record will create one automatically. Appointments appear on both the linked lead and patient, and each gets its own appointment number.</P>
        </Doc>
      )

    case 'consultations':
      return (
        <Doc eyebrow="Core Records" title="Consultations"
          lead="Consultations are clinical visit records — diagnosis, treatment, and visit details tied to a patient.">
          <P>Log a consultation to capture what happened in a visit. It links to the patient timeline so the full clinical history stays in one place.</P>
        </Doc>
      )

    case 'tasks':
      return (
        <Doc eyebrow="Core Records" title="Tasks"
          lead="Lightweight to-dos attached to a lead or patient.">
          <P>Add a task with a title, priority, and due date. Completing tasks can trigger automation rules. Tasks created for a follow-up appear automatically when you schedule the next step.</P>
        </Doc>
      )

    case 'followups':
      return (
        <Doc eyebrow="Engagement" title="Follow-ups"
          lead="Track every call, WhatsApp, and email touchpoint so no lead goes cold.">
          <P>Each follow-up records a type, date/time, outcome, who called, and the response. Log the outcome of a follow-up and optionally schedule the next one — a matching task is created for you.</P>
          <H3>Two views</H3>
          <Bullets items={[
            'Regular view — readable cards, grouped and sortable.',
            'Table view — a spreadsheet-style grid. Type in text cells, and pick dropdown values as Google-Sheets-style chips.',
            'The empty bottom row in table view creates a new follow-up as soon as you fill a cell.',
            'Sort the table by date added or last modified from the sort menu in the header.',
          ]} />
          <Tip>Switch between Regular and Table view using the two icons next to the &quot;Follow-ups&quot; heading.</Tip>
        </Doc>
      )

    case 'tags':
      return (
        <Doc eyebrow="Engagement" title="Tags"
          lead="Colour-coded labels for organising and filtering leads and patients.">
          <P>Create tags in Settings → Tags and choose whether each applies to the Leads page, Patients page, or both. Apply them on any record and filter your lists by tag.</P>
        </Doc>
      )

    case 'rules':
      return (
        <Doc eyebrow="Engagement" title="Automation Rules"
          lead="Run actions automatically when something happens — no manual steps. Build rules in Settings → Rules.">
          <P>Each rule is three steps: a <b>trigger</b> (when), optional <b>conditions</b> (if), and one or more <b>actions</b> (do). Rules run on the server, so they fire the same way whether the event came from the app, a webhook, or the public API.</P>

          <H3>1 · Trigger</H3>
          <P>Pick a module — Lead, Patient, Appointment, Task, or Consultation — and the event that starts the rule. Examples: Lead created, Lead details updated, Stage changed, Appointment booked, Task completed.</P>

          <H3>2 · Conditions</H3>
          <P>Add conditions to narrow when the rule runs, matching ALL or ANY of them. Available operators:</P>
          <Bullets items={[
            'is / is not, contains / does not contain, starts with / ends with',
            'greater than / less than, ≥ / ≤, between, is any of (comma list)',
            'is empty / is not empty',
            'changed (any value), changed to, changed from — fire only when a field actually changes value.',
          ]} />
          <Tip>The &quot;changed&quot; operators compare against the record&apos;s previous state. Pair them with a &quot;details updated&quot; event — e.g. <b>When lead updated → IF stage changed → do something</b>.</Tip>

          <H3>3 · Actions</H3>
          <Bullets items={[
            'Set stage, status, priority, source, or deal value.',
            'Set a field — write any standard field; Set custom field — write a custom_data value.',
            'Add or remove a tag, assign to a team member.',
            'Add a note, create a task (with relative due dates), or schedule a follow-up.',
            'Convert lead to patient — creates the patient record and marks the lead Converted.',
            'Send an in-app notification.',
          ]} />

          <H3>Test &amp; history</H3>
          <P>Use <b>Test on latest record</b> to dry-run a rule against your most recent record without changing anything. Every real run is logged with its status — success, partial, failed, or skipped — in the rule&apos;s run history.</P>
          <Note>Saved rules apply to events going forward. Reload an open record to pick up newly saved rules.</Note>
        </Doc>
      )

    case 'whatsapp':
      return (
        <Doc eyebrow="Messaging" title="WhatsApp"
          lead="Send messages to leads and patients from your CRM using the WhatsApp Cloud API.">
          <P>Connect WhatsApp in Settings → Configuration → WhatsApp. Add your Cloud API credentials, enable the channel, and send a test from the built-in panel.</P>
          <Steps items={[
            'Create an app in Meta for Developers and add the WhatsApp product.',
            'Copy the Phone Number ID and a permanent Access Token.',
            'In Settings → Configuration → WhatsApp, paste both, enable, and save.',
            'Use the test panel to send yourself a message and confirm delivery.',
          ]} />
          <Tip>Credentials are stored per organization and used server-side only — they never reach the browser.</Tip>
          <Note>WhatsApp requires an approved message template for the first message outside the 24-hour customer-service window. Free-form text works inside an active conversation.</Note>
        </Doc>
      )

    case 'telegram':
      return (
        <Doc eyebrow="Messaging" title="Telegram"
          lead="Connect a Telegram bot to send reminders, appointment slips, and documents straight from the CRM.">
          <H3>Create your bot</H3>
          <Steps items={[
            'In Telegram, open @BotFather and send /newbot, then follow the prompts to name your bot.',
            'BotFather replies with a bot token — copy it.',
            'In Settings → Configuration → Telegram, paste the token, enable, and save.',
            'Open a chat with your bot (or add it to a group) and send it any message.',
            'Click "Get Updates" — your chat appears in the list. Click it to set the default chat ID.',
            'Send a test message to confirm it works.',
          ]} />
          <H3>What you can send</H3>
          <Bullets items={[
            'Plain text messages (HTML formatting supported).',
            'Photos with a caption.',
            'Documents by URL — e.g. appointment slips and PDFs.',
          ]} />
          <Tip>Use &quot;Get Updates&quot; any time you need a new chat ID — it lists everyone who has recently messaged your bot.</Tip>
          <Note>A bot can only message someone after that person has started a chat with it (or it&apos;s added to their group). This is a Telegram restriction, not a CRM one.</Note>
        </Doc>
      )

    case 'modules':
      return (
        <Doc eyebrow="Customization" title="Custom Modules"
          lead="Add your own sections and fields to the Leads or Patients page — no code.">
          <P>In Settings → Modules, create a module, choose whether it shows on Leads or Patients, and add fields (text, number, date, phone, email, dropdown, yes/no). Active modules appear as an editable card on the matching record page.</P>
          <Tip>Custom field values are stored on the record and can be written by automation rules using the <b>Set custom field</b> action.</Tip>
        </Doc>
      )

    case 'settings':
      return (
        <Doc eyebrow="Customization" title="Settings & Team"
          lead="Configure your workspace, branding, team, and more.">
          <Bullets items={[
            'Organization — clinic details, patient ID format, theme.',
            'People — add doctors and staff members (used in assignment and follow-ups).',
            'Tags, Modules, Rules — covered in their own sections.',
            'Configuration — connect integrations and messaging (WhatsApp, Telegram).',
          ]} />
        </Doc>
      )

    case 'integrations':
      return (
        <Doc eyebrow="Integrations" title="Lead Capture & Integrations"
          lead="Capture leads automatically from external forms and services.">
          <P>In Settings → Configuration, connect a provider to get a webhook URL. Submissions arrive as new leads automatically.</P>
          <Bullets items={[
            'Google Forms — paste the provided Apps Script into your form and add an "On form submit" trigger.',
            'Meta Lead Ads, WordPress forms, Zapier, and a generic webhook are also supported.',
            'Each integration learns your form’s question names after the first submission.',
          ]} />
          <Note>The webhook URL must be publicly reachable — use your deployed site URL, not localhost.</Note>
        </Doc>
      )

    case 'google-forms':
      return (
        <Doc eyebrow="Integrations" title="Google Forms setup"
          lead="Send every Google Form response into your CRM as a lead via a small Apps Script.">
          <H3>Steps</H3>
          <Steps items={[
            'In Settings → Configuration, connect Google Forms and copy your webhook URL.',
            'Open your Google Form → ⋮ menu → Apps Script.',
            'Delete any sample code, paste the script below, and replace YOUR_WEBHOOK_URL with the URL you copied. Save.',
            'Click the clock icon (Triggers) → Add Trigger.',
            'Choose function onFormSubmit, event source "From form", event type "On form submit" → Save (authorize when prompted).',
            'Submit a test response — a new lead appears in your CRM.',
          ]} />
          <Code>{`function onFormSubmit(e) {
  var url = "YOUR_WEBHOOK_URL";
  var fields = {};
  var answers = e.response.getItemResponses();
  for (var i = 0; i < answers.length; i++) {
    fields[answers[i].getItem().getTitle()] = answers[i].getResponse();
  }
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true
  });
}`}</Code>
          <Tip>Name your questions Name, Phone, Email so they map automatically. The &ldquo;Deploy&rdquo; button is not needed — only the trigger.</Tip>
          <Note>The webhook URL must be publicly reachable — use your deployed site URL, not localhost.</Note>
        </Doc>
      )

    case 'wordpress':
      return (
        <Doc eyebrow="Integrations" title="WordPress setup"
          lead="The easiest way is our plugin — install once and every form on your site is captured.">
          <H3>Recommended — HealthCRM plugin</H3>
          <P>One plugin captures all forms (Contact Form 7, WPForms, Gravity, Elementor Pro, Fluent, Ninja) — no per-form setup.</P>
          <Steps items={[
            'Download the plugin and install it in WordPress (Plugins → Add New → Upload Plugin), then activate.',
            'Go to Settings → HealthCRM and paste your Webhook URL (and Shared Secret if you set one).',
            'Click “Send test lead” to confirm, then submit any form.',
          ]} />
          <a href="/healthcrm-lead-capture.zip" download
            className="inline-flex items-center gap-1.5 text-[13px] font-600 px-4 py-2 rounded-xl text-white" style={{ background: 'var(--color-brand)' }}>
            <Download size={14} /> Download plugin (.zip)
          </a>

          <H3>Alternatives (single form)</H3>
          <Bullets items={[
            'Elementor Pro — edit the form → Actions After Submit → add Webhook → paste your webhook URL.',
            'WPForms (Pro) — install the Webhooks addon → form Settings → Webhooks → Request URL = your webhook, POST, JSON.',
            'Contact Form 7 — add the snippet below to your (child) theme’s functions.php.',
          ]} />
          <Code>{`add_action('wpcf7_before_send_mail', function ($contact_form) {
  $submission = WPCF7_Submission::get_instance();
  if (!$submission) return;
  $data = $submission->get_posted_data();
  $fields = array();
  foreach ($data as $key => $value) {
    if (substr($key, 0, 1) === '_') continue;
    $fields[$key] = is_array($value) ? implode(', ', $value) : $value;
  }
  wp_remote_post('YOUR_WEBHOOK_URL', array(
    'headers' => array('Content-Type' => 'application/json'),
    'body'    => wp_json_encode(array('fields' => $fields)),
    'timeout' => 15,
  ));
});`}</Code>
          <Tip>Name your fields Name, Phone, Email for automatic mapping — or map them precisely in the Field Mapping panel.</Tip>
        </Doc>
      )

    case 'field-mapping':
      return (
        <Doc eyebrow="Integrations" title="Field Mapping"
          lead="Map each form question to the exact lead field it should fill.">
          <P>After a form submits once, open its integration and use the Field Mapping panel. Choose a detected form question on the left and the lead field on the right (or store it as a custom field). Unmapped questions are still auto-detected and saved.</P>
          <P>Click <b>Refresh fields</b> in the panel to pull the latest detected fields without reloading the page.</P>
        </Doc>
      )

    case 'billing':
      return (
        <Doc eyebrow="More" title="Billing"
          lead="Keep your practice finances in one place.">
          <P>Generate invoices and record payments tied to patients so your billing stays organised alongside clinical records.</P>
        </Doc>
      )

    case 'support':
      return (
        <Doc eyebrow="More" title="Support Tickets"
          lead="Raise issues without leaving the app.">
          <P>Use &quot;Raise a Complaint&quot; in the bottom bar to file a support ticket. Track its status from your tickets list, and our team will follow up.</P>
        </Doc>
      )

    default:
      return null
  }
}

// ── Previous / Next pager ─────────────────────────────────────
function PrevNext({ id, go }) {
  const idx  = ALL_IDS.indexOf(id)
  const prev = idx > 0 ? ALL[idx - 1] : null
  const next = idx < ALL.length - 1 ? ALL[idx + 1] : null
  return (
    <div className="flex items-center justify-between gap-4 mt-14 pt-6 border-t border-(--color-border)">
      {prev ? (
        <button type="button" onClick={() => go(prev.id)}
          className="group w-fit inline-flex items-center gap-1.5 text-[13.5px] font-600 transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" style={{ color: 'var(--color-brand)' }} />
          {prev.label}
        </button>
      ) : <span />}
      {next ? (
        <button type="button" onClick={() => go(next.id)}
          className="group w-fit inline-flex items-center gap-1.5 text-[13.5px] font-600 transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}>
          {next.label}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-brand)' }} />
        </button>
      ) : <span />}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function DocsPage() {
  const [active, setActive] = useState('overview')
  const [query, setQuery] = useState('')
  const contentRef = useRef(null)

  // Deep linking: each topic has a URL hash (e.g. /docs#leads). Sync the active
  // topic from the hash on load and on back/forward / manual hash edits.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace('#', '')
      if (h && ALL_IDS.includes(h)) {
        setActive(h)
        contentRef.current?.scrollTo({ top: 0 })
      }
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    window.addEventListener('popstate', fromHash)
    return () => {
      window.removeEventListener('hashchange', fromHash)
      window.removeEventListener('popstate', fromHash)
    }
  }, [])

  // Switch topic, update the URL hash, and jump the reading pane back to the top.
  const go = (id) => {
    setActive(id)
    if (window.location.hash !== `#${id}`) {
      window.history.pushState(null, '', id === 'overview' ? '#' : `#${id}`)
    }
    contentRef.current?.scrollTo({ top: 0 })
  }

  const filteredNav = NAV
    .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(query.toLowerCase())) }))
    .filter(g => g.items.length)

  return (
    <div className="flex flex-col h-screen" style={{ ...THEME_VARS, background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="flex items-center gap-4 px-5 h-16 border-b border-(--color-border) shrink-0" style={{ background: 'var(--color-surface)' }}>
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="text-[15px] font-800 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>HealthCRM</span>
          <span className="text-[13px] font-500 pl-2.5 ml-0.5 border-l border-(--color-border)" style={{ color: 'var(--color-text-muted)' }}>Docs</span>
        </Link>

        {/* Search (visual) */}
        <button onClick={() => document.getElementById('docs-search')?.focus()}
          className="hidden md:flex items-center gap-2 ml-4 w-64 px-3 py-2 rounded-xl border text-left transition-colors hover:bg-(--color-surface-2)"
          style={{ borderColor: 'var(--color-border)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-[13px] flex-1" style={{ color: 'var(--color-text-muted)' }}>Search…</span>
          <span className="text-[10px] font-600 px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>⌘K</span>
        </button>

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <span className="text-[13px] font-600 px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand)' }}>Documentation</span>
        </nav>
        <Link href="/login" className="text-[13px] font-600 px-4 py-2 rounded-xl text-white inline-flex items-center gap-1.5 shrink-0 md:ml-1" style={{ background: 'var(--color-brand)' }}>
          Open app <ArrowRight size={13} />
        </Link>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <aside className="w-64 shrink-0 border-r border-(--color-border) h-full overflow-y-auto px-3 py-5 hidden md:block" style={{ background: 'var(--color-surface)' }}>
          <div className="relative mb-4 px-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input id="docs-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter…"
              className="w-full pl-9 pr-2 py-2 text-[13px] rounded-xl border border-(--color-border) outline-none focus:border-(--color-brand)"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }} />
          </div>
          <nav className="space-y-6">
            {filteredNav.map(g => (
              <div key={g.group}>
                <p className="px-3 mb-1.5 text-[11px] font-700 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{g.group}</p>
                <div className="space-y-0.5">
                  {g.items.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => go(id)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13.5px] font-500 text-left transition-colors"
                      style={active === id
                        ? { background: 'var(--color-brand-50)', color: 'var(--color-brand)', fontWeight: 700 }
                        : { color: 'var(--color-text-secondary)' }}>
                      <Icon size={15} style={{ color: active === id ? 'var(--color-brand)' : 'var(--color-text-muted)' }} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!filteredNav.length && (
              <p className="px-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>No topics match.</p>
            )}
          </nav>
        </aside>

        {/* Content — one topic at a time */}
        <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-12">
            {active === 'overview' && <Hero go={go} />}
            <DocBody id={active} go={go} />
            <PrevNext id={active} go={go} />
          </div>
        </main>
      </div>
    </div>
  )
}
