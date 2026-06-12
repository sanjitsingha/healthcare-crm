import LegalLayout from '../LegalLayout'

export const metadata = {
  title: 'Contact Us — HealthCRM',
  description: 'Get in touch with the HealthCRM team for support, sales, or legal enquiries.',
}

const CONTACTS = [
  {
    emoji: '💬',
    title: 'Customer Support',
    email: 'support@healthcrm.in',
    desc: 'Help using the platform, troubleshooting, or questions about your account and features.',
    color: '#0ea5e9',
  },
  {
    emoji: '✉️',
    title: 'Sales & Onboarding',
    email: 'hello@healthcrm.in',
    desc: 'Interested in HealthCRM for your clinic or hospital? Talk to us about pricing, demos, and onboarding.',
    color: '#10b981',
  },
  {
    emoji: '🔒',
    title: 'Security',
    email: 'security@healthcrm.in',
    desc: 'Report a vulnerability, request a security questionnaire, or discuss security requirements.',
    color: '#8b5cf6',
  },
  {
    emoji: '📄',
    title: 'Privacy & Legal',
    email: 'privacy@healthcrm.in',
    desc: 'Data access or deletion requests, privacy questions, or legal and compliance enquiries.',
    color: '#f59e0b',
  },
]

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us" lastUpdated={null}>

      <p>We are here to help. Whether you need support with the platform, have a billing question, want to report a security issue, or have a legal enquiry — reach out to the right team below and we will get back to you promptly.</p>

      <style>{`
        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          margin: 28px 0 40px;
        }
        .contact-card {
          padding: 24px;
          border-radius: 16px;
          border: 1.5px solid #e2e4ef;
          background: #fff;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .contact-card-emoji {
          font-size: 28px;
          line-height: 1;
        }
        .contact-card-title {
          font-size: 15px;
          font-weight: 700;
          color: #0d0f1c;
          margin-bottom: 4px;
        }
        .contact-card-desc {
          font-size: 13.5px;
          color: #56608a;
          line-height: 1.7;
          margin-bottom: 8px;
        }
        .contact-card-email {
          font-size: 13.5px;
          color: #21297E;
          font-weight: 600;
          text-decoration: none;
        }
        .contact-card-email:hover { text-decoration: underline; }

        .hours-table { width: 100%; border-collapse: collapse; }
        .hours-table tr { border-bottom: 1px solid #e2e4ef; }
        .hours-table td { padding: 10px 0; font-size: 13.5px; width: 50%; }
        .hours-table td:first-child { color: #0d0f1c; font-weight: 600; }
        .hours-table td:last-child { color: #56608a; }
      `}</style>

      <div className="contact-grid">
        {CONTACTS.map(({ emoji, title, email, desc }) => (
          <div key={email} className="contact-card">
            <div className="contact-card-emoji">{emoji}</div>
            <div>
              <p className="contact-card-title">{title}</p>
              <p className="contact-card-desc">{desc}</p>
              <a href={`mailto:${email}`} className="contact-card-email">{email}</a>
            </div>
          </div>
        ))}
      </div>

      <h2>Support Hours</h2>
      <table className="hours-table">
        <tbody>
          <tr><td>Monday – Friday</td><td>9:00 AM – 6:00 PM IST</td></tr>
          <tr><td>Saturday</td><td>10:00 AM – 2:00 PM IST</td></tr>
          <tr><td>Sunday</td><td>Closed</td></tr>
        </tbody>
      </table>
      <p style={{ marginTop: 14, fontSize: 12.5, color: '#9499bb' }}>
        We aim to respond to all enquiries within 1 business day. For urgent security issues, we respond within 48 hours including weekends.
      </p>

      <h2>Company Information</h2>
      <table>
        <tbody>
          <tr><td><strong>Registered Name</strong></td><td>HealthCRM Technologies Pvt. Ltd.</td></tr>
          <tr><td><strong>Country</strong></td><td>India</td></tr>
          <tr><td><strong>General Enquiries</strong></td><td><a href="mailto:hello@healthcrm.in">hello@healthcrm.in</a></td></tr>
          <tr><td><strong>Support</strong></td><td><a href="mailto:support@healthcrm.in">support@healthcrm.in</a></td></tr>
          <tr><td><strong>Privacy</strong></td><td><a href="mailto:privacy@healthcrm.in">privacy@healthcrm.in</a></td></tr>
          <tr><td><strong>Security</strong></td><td><a href="mailto:security@healthcrm.in">security@healthcrm.in</a></td></tr>
          <tr><td><strong>Legal</strong></td><td><a href="mailto:legal@healthcrm.in">legal@healthcrm.in</a></td></tr>
        </tbody>
      </table>

      <h2>Response Time Commitments</h2>
      <ul>
        <li><strong>General support:</strong> Within 1 business day</li>
        <li><strong>Billing issues:</strong> Within 1 business day</li>
        <li><strong>Data requests (privacy):</strong> Acknowledgement within 2 business days; resolution within 30 days</li>
        <li><strong>Security vulnerabilities:</strong> Acknowledgement within 48 hours (including weekends)</li>
        <li><strong>Legal notices:</strong> Within 5 business days</li>
      </ul>

      <h2>Feedback</h2>
      <p>We genuinely value feedback from our customers. If you have a feature request, spotted something that is not working well, or want to share what you love about HealthCRM — we would love to hear from you at <a href="mailto:hello@healthcrm.in">hello@healthcrm.in</a>.</p>
      <p>You can also submit feedback directly from within the application using the Feedback button in the navigation.</p>

    </LegalLayout>
  )
}
