import LegalLayout from '../LegalLayout'
import { Mail, MessageCircle, Shield, FileText, Clock } from 'lucide-react'

export const metadata = {
  title: 'Contact Us — HealthCRM',
  description: 'Get in touch with the HealthCRM team for support, sales, or legal inquiries.',
}

const B = {
  brand: '#21297E',
  text:  '#0d0f1c',
  muted: '#56608a',
  faint: '#9499bb',
  border: '#e2e4ef',
  surf: '#f5f7fc',
  bg50: '#eceef8',
}

function ContactCard({ icon: Icon, title, email, desc, color }) {
  return (
    <div style={{ padding: '24px', borderRadius: 16, border: `1.5px solid ${B.border}`, background: '#fff', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: B.text, marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 13.5, color: B.muted, lineHeight: 1.7, marginBottom: 10 }}>{desc}</p>
        <a href={`mailto:${email}`} style={{ fontSize: 13.5, color: B.brand, fontWeight: 600, textDecoration: 'none' }}>{email}</a>
      </div>
    </div>
  )
}

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us" lastUpdated={null}>

      <p>We're here to help. Whether you need support with the platform, have a billing question, want to report a security issue, or have a legal enquiry — reach out to the right team below and we'll get back to you promptly.</p>

      {/* Contact cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, margin: '32px 0 40px' }}>
        <ContactCard
          icon={MessageCircle}
          title="Customer Support"
          email="support@healthcrm.in"
          desc="For help using the platform, troubleshooting issues, or questions about your account and features."
          color="#0ea5e9"
        />
        <ContactCard
          icon={Mail}
          title="Sales & Onboarding"
          email="hello@healthcrm.in"
          desc="Interested in HealthCRM for your clinic or hospital? Talk to us about pricing, demos, and custom onboarding."
          color="#10b981"
        />
        <ContactCard
          icon={Shield}
          title="Security"
          email="security@healthcrm.in"
          desc="To report a vulnerability, request a security questionnaire, or discuss security requirements."
          color="#8b5cf6"
        />
        <ContactCard
          icon={FileText}
          title="Privacy & Legal"
          email="privacy@healthcrm.in"
          desc="For data access requests, deletion requests, privacy questions, or legal and compliance enquiries."
          color="#f59e0b"
        />
      </div>

      <h2>Support Hours</h2>
      <div style={{ background: B.surf, borderRadius: 12, border: `1px solid ${B.border}`, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Clock size={16} color={B.brand} />
          <span style={{ fontSize: 14, fontWeight: 700, color: B.text }}>Business Hours</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              { day: 'Monday – Friday', hours: '9:00 AM – 6:00 PM IST' },
              { day: 'Saturday',        hours: '10:00 AM – 2:00 PM IST' },
              { day: 'Sunday',          hours: 'Closed' },
            ].map(({ day, hours }) => (
              <tr key={day} style={{ borderBottom: `1px solid ${B.border}` }}>
                <td style={{ padding: '10px 0', fontSize: 13.5, color: B.text, fontWeight: 600, width: '50%' }}>{day}</td>
                <td style={{ padding: '10px 0', fontSize: 13.5, color: B.muted }}>{hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 14, fontSize: 12.5, color: B.faint }}>
          We aim to respond to all enquiries within 1 business day. For urgent security issues, we respond within 48 hours, including weekends.
        </p>
      </div>

      <h2>Company Information</h2>
      <table>
        <tbody>
          <tr>
            <td><strong>Registered Name</strong></td>
            <td>HealthCRM Technologies Pvt. Ltd.</td>
          </tr>
          <tr>
            <td><strong>Country</strong></td>
            <td>India</td>
          </tr>
          <tr>
            <td><strong>General Enquiries</strong></td>
            <td><a href="mailto:hello@healthcrm.in">hello@healthcrm.in</a></td>
          </tr>
          <tr>
            <td><strong>Support</strong></td>
            <td><a href="mailto:support@healthcrm.in">support@healthcrm.in</a></td>
          </tr>
          <tr>
            <td><strong>Privacy</strong></td>
            <td><a href="mailto:privacy@healthcrm.in">privacy@healthcrm.in</a></td>
          </tr>
          <tr>
            <td><strong>Security</strong></td>
            <td><a href="mailto:security@healthcrm.in">security@healthcrm.in</a></td>
          </tr>
          <tr>
            <td><strong>Legal</strong></td>
            <td><a href="mailto:legal@healthcrm.in">legal@healthcrm.in</a></td>
          </tr>
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
      <p>We genuinely value feedback from our customers. If you have a feature request, spotted something that isn't working well, or want to share what you love about HealthCRM — we'd love to hear from you at <a href="mailto:hello@healthcrm.in">hello@healthcrm.in</a>.</p>
      <p>You can also submit feedback directly from within the application using the Feedback button in the navigation.</p>

    </LegalLayout>
  )
}
