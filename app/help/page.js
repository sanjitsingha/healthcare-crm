export const metadata = {
  title: 'Help | HealthCRM',
}

export default function HelpPage() {
  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-700 mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Help Center
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Need assistance? Reach us at <a className="underline" href="mailto:support@healthcrm.app">support@healthcrm.app</a>
        </p>

        <div className="rounded-xl border border-(--color-border) p-5" style={{ background: 'var(--color-surface)' }}>
          <h2 className="text-base font-600 mb-2" style={{ color: 'var(--color-text-primary)' }}>Quick help</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <li>Manage leads and patients from the dashboard modules.</li>
            <li>Update organization details from Settings → Organization.</li>
            <li>View your account email from Settings → Account.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
