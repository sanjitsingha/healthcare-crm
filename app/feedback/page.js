export const metadata = {
  title: "Feedback | HealthCRM",
};

export default function FeedbackPage() {
  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-2xl font-700 mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Feedback
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          We’d love to hear from you. Share your suggestions at{" "}
          <a className="underline" href="mailto:feedback@healthcrm.app">
            feedback@healthcrm.app
          </a>
        </p>

        <div
          className="rounded-xl border border-(--color-border) p-5"
          style={{ background: "var(--color-surface)" }}
        >
          <h2
            className="text-base font-600 mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            What to include
          </h2>
          <ul
            className="list-disc pl-5 space-y-1 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <li>What you were trying to do.</li>
            <li>What happened vs what you expected.</li>
            <li>Any screenshot or exact page name (if possible).</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
