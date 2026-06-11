import LegalLayout from '../LegalLayout'

export const metadata = {
  title: 'Privacy Policy — HealthCRM',
  description: 'How HealthCRM collects, uses, and protects your personal and clinic data.',
}

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="June 1, 2026">

      <p>HealthCRM Technologies Pvt. Ltd. ("HealthCRM", "we", "us", or "our") is committed to protecting the privacy and security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our cloud-based healthcare CRM platform (the "Service").</p>
      <p>By accessing or using the Service, you agree to the terms of this Privacy Policy. If you do not agree, please discontinue use of the Service immediately.</p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Account and Organisation Information</h3>
      <p>When you register for HealthCRM, we collect:</p>
      <ul>
        <li>Your name, email address, and phone number</li>
        <li>Clinic or organisation name, address, and contact details</li>
        <li>Billing information (processed securely through our payment provider)</li>
        <li>User role and permissions within your organisation</li>
      </ul>

      <h3>1.2 Patient and Lead Data</h3>
      <p>HealthCRM is a tool used by healthcare organisations to manage their own data. When your organisation uses the Service, you may enter patient and lead information including names, contact details, medical histories, appointment records, consultation notes, and billing information. <strong>You are the data controller for this data; we are the data processor.</strong></p>

      <h3>1.3 Usage and Technical Data</h3>
      <p>We automatically collect technical data to operate and improve the Service:</p>
      <ul>
        <li>IP address and approximate location</li>
        <li>Browser type and operating system</li>
        <li>Pages viewed, actions taken, and session duration</li>
        <li>Audit log entries (login events, data access, exports)</li>
        <li>Error reports and performance metrics</li>
      </ul>

      <h3>1.4 Communications</h3>
      <p>If you contact us for support, we retain the content of that communication to help resolve your inquiry and improve our services.</p>

      <h2>2. How We Use Your Information</h2>
      <p>We use the collected information to:</p>
      <ul>
        <li>Provide, maintain, and improve the Service</li>
        <li>Process transactions and manage your subscription</li>
        <li>Send service-related notifications, security alerts, and support messages</li>
        <li>Analyse usage patterns to improve features and user experience</li>
        <li>Detect, prevent, and respond to fraud, abuse, or security incidents</li>
        <li>Comply with applicable legal obligations</li>
      </ul>
      <p>We do not sell your data or the data of your patients to third parties, ever.</p>

      <h2>3. Patient Data — Our Role as Data Processor</h2>
      <p>All patient and lead records entered into HealthCRM by your organisation are processed strictly on your behalf. This means:</p>
      <ul>
        <li>Your organisation (the data controller) determines what patient data is collected and how it is used</li>
        <li>We act only on your instructions as your data processor</li>
        <li>We do not use patient data for our own analytics, marketing, or product development</li>
        <li>You are responsible for obtaining appropriate consents from patients before entering their data into HealthCRM</li>
        <li>Upon termination of your subscription, your data is retained for 30 days before permanent deletion, unless a longer retention period is required by law</li>
      </ul>

      <h2>4. Data Storage and Security</h2>
      <p>All data is stored on Supabase (PostgreSQL), hosted on secure cloud infrastructure. We implement the following safeguards:</p>
      <ul>
        <li><strong>Encryption in transit:</strong> All data transmitted between your browser and our servers is protected with TLS 1.2/1.3</li>
        <li><strong>Encryption at rest:</strong> All database data is encrypted at rest using AES-256</li>
        <li><strong>Access controls:</strong> Row-level security ensures each organisation can only access its own data</li>
        <li><strong>Audit logging:</strong> All access, exports, and changes are logged with user identity and timestamp</li>
        <li><strong>Backups:</strong> Automated daily backups with 90-day retention</li>
      </ul>
      <p>For more information, please see our <a href="/security">Security Policy</a>.</p>

      <h2>5. Data Sharing and Disclosure</h2>
      <p>We share data only in the following limited circumstances:</p>
      <ul>
        <li><strong>Service providers:</strong> Trusted third parties that help us operate the Service (database hosting, payment processing, email delivery). These processors are contractually bound to handle data securely and only for specified purposes.</li>
        <li><strong>Legal requirements:</strong> When required by applicable law, court order, or government authority.</li>
        <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred. We will notify you and ensure equivalent protections remain in place.</li>
        <li><strong>With your consent:</strong> For any other purpose with your explicit written consent.</li>
      </ul>

      <h2>6. Cookies and Tracking</h2>
      <p>We use a minimal number of cookies necessary to operate the Service. See our <a href="/cookies">Cookie Policy</a> for full details.</p>

      <h2>7. Your Rights</h2>
      <p>Depending on your location and applicable law, you may have the following rights regarding your personal data:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
        <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data</li>
        <li><strong>Erasure:</strong> Request deletion of your personal data, subject to legal retention requirements</li>
        <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
        <li><strong>Objection:</strong> Object to processing of your personal data in certain circumstances</li>
        <li><strong>Restriction:</strong> Request that we restrict processing of your data</li>
      </ul>
      <p>To exercise any of these rights, please contact us at <a href="mailto:privacy@healthcrm.in">privacy@healthcrm.in</a>. We will respond within 30 days.</p>

      <h2>8. Data Retention</h2>
      <p>We retain personal data for as long as your account is active or as necessary to provide the Service. Upon account closure, data is deleted within 30 days. Some data may be retained longer where required by law or legitimate business interests (e.g., billing records for 7 years as required by Indian tax law).</p>
      <p>For full details, see our <a href="/data-retention">Data Retention &amp; Deletion Policy</a>.</p>

      <h2>9. Children's Privacy</h2>
      <p>The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected such data, please contact us immediately.</p>

      <h2>10. Third-Party Links</h2>
      <p>The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.</p>

      <h2>11. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or prominent notice within the Service at least 14 days before the change takes effect. Continued use after the effective date constitutes acceptance of the updated policy.</p>

      <h2>12. Contact Us</h2>
      <p>For questions, concerns, or to exercise your data rights, contact our Privacy Officer:</p>
      <ul>
        <li>Email: <a href="mailto:privacy@healthcrm.in">privacy@healthcrm.in</a></li>
        <li>General enquiries: <a href="mailto:hello@healthcrm.in">hello@healthcrm.in</a></li>
        <li>Postal address: HealthCRM Technologies Pvt. Ltd., India</li>
      </ul>

    </LegalLayout>
  )
}
