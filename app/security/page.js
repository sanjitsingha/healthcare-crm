import LegalLayout from '../LegalLayout'

export const metadata = {
  title: 'Security Policy — HealthCRM',
  description: 'How HealthCRM protects your data and maintains platform security.',
}

export default function SecurityPolicy() {
  return (
    <LegalLayout title="Security Policy" lastUpdated="June 1, 2026">

      <p>Security is a core responsibility at HealthCRM Technologies Pvt. Ltd. We handle sensitive patient and clinical data on behalf of healthcare organisations, and we take that responsibility seriously. This page describes our security architecture, practices, and commitments.</p>
      <p>If you have discovered a security vulnerability, please see Section 9 (Responsible Disclosure) before reporting it.</p>

      <h2>1. Infrastructure Security</h2>
      <p>HealthCRM is built on Supabase, which runs on industry-leading cloud infrastructure with the following protections:</p>
      <ul>
        <li><strong>Hosting:</strong> All data is stored on servers located in secure, access-controlled data centres</li>
        <li><strong>Network isolation:</strong> The database layer is not publicly accessible; only the application layer can communicate with it through encrypted private network channels</li>
        <li><strong>DDoS protection:</strong> Built-in denial-of-service mitigation at the infrastructure level</li>
        <li><strong>Firewall:</strong> Strict firewall rules — only required ports and protocols are allowed</li>
        <li><strong>Uptime monitoring:</strong> 24/7 automated health checks with on-call alerting</li>
      </ul>

      <h2>2. Data Encryption</h2>
      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Standard</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data in transit</td>
            <td>TLS 1.2 / 1.3</td>
            <td>All communication between clients and servers is encrypted. HTTP is redirected to HTTPS.</td>
          </tr>
          <tr>
            <td>Data at rest</td>
            <td>AES-256</td>
            <td>All database files, backups, and storage objects are encrypted at the disk level.</td>
          </tr>
          <tr>
            <td>Passwords</td>
            <td>bcrypt</td>
            <td>User passwords are never stored in plaintext. Only salted hashes are retained.</td>
          </tr>
          <tr>
            <td>API tokens</td>
            <td>Short-lived JWTs</td>
            <td>Authentication tokens are short-lived and rotated regularly. Refresh tokens are rotated on each use.</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Access Controls</h2>
      <p>Data access is enforced at multiple layers:</p>
      <ul>
        <li><strong>Organisation isolation:</strong> Every database table includes an <code>organization_id</code> column enforced by PostgreSQL Row-Level Security (RLS). No organisation can read, write, or delete another organisation's data — even in the event of an application bug.</li>
        <li><strong>Role-based access:</strong> Within an organisation, users are assigned roles (Owner, Admin, Member) that restrict which features and data they can access.</li>
        <li><strong>Audit logging:</strong> Every significant action — logins, data exports, record changes, permission modifications — is logged with user identity, timestamp, IP address, and device. Audit logs cannot be deleted by users.</li>
        <li><strong>Session management:</strong> Sessions expire after inactivity and can be revoked remotely by administrators.</li>
      </ul>

      <h2>4. Application Security</h2>
      <p>Our development practices include:</p>
      <ul>
        <li><strong>Input validation:</strong> All user inputs are validated and sanitised server-side to prevent injection attacks</li>
        <li><strong>CSRF protection:</strong> Cross-Site Request Forgery protection on all state-changing operations</li>
        <li><strong>Content Security Policy:</strong> Strict CSP headers to mitigate XSS risks</li>
        <li><strong>Dependency scanning:</strong> Automated scanning of third-party libraries for known vulnerabilities</li>
        <li><strong>Parameterised queries:</strong> All database queries use parameterised statements — SQL injection is not possible through normal application paths</li>
        <li><strong>Least privilege:</strong> Application service accounts have only the minimum database permissions required</li>
      </ul>

      <h2>5. Backup and Disaster Recovery</h2>
      <ul>
        <li>Automated daily backups of all databases with point-in-time recovery</li>
        <li>Backup retention: 90 days</li>
        <li>Backups are encrypted with the same standards as production data</li>
        <li>Restoration procedures are tested quarterly</li>
        <li>Recovery Time Objective (RTO): &lt; 4 hours for critical failures</li>
        <li>Recovery Point Objective (RPO): &lt; 24 hours (daily backup)</li>
      </ul>

      <h2>6. Employee and Operational Security</h2>
      <ul>
        <li>All employees who handle customer data undergo background checks before joining</li>
        <li>Access to production systems is restricted to a minimal number of engineers on a need-to-know basis</li>
        <li>Multi-factor authentication is required for all internal systems</li>
        <li>Privileged access is logged and reviewed regularly</li>
        <li>Employees receive regular security awareness training</li>
      </ul>

      <h2>7. Incident Response</h2>
      <p>In the event of a confirmed security breach affecting your data:</p>
      <ul>
        <li>We will notify affected organisations within <strong>72 hours</strong> of becoming aware of the breach</li>
        <li>Notification will be sent to the registered account owner email and include: nature of the incident, data affected, steps taken, and recommended actions for you to take</li>
        <li>We will cooperate fully with any regulatory investigation and provide all necessary information</li>
        <li>Post-incident reports will be shared with affected customers upon request</li>
      </ul>

      <h2>8. Compliance and Standards</h2>
      <p>Our security programme is aligned with the following frameworks and regulations:</p>
      <ul>
        <li>ISO/IEC 27001 (Information Security Management) — aligned</li>
        <li>OWASP Top 10 — addressed in our application security programme</li>
        <li>Digital Personal Data Protection Act, 2023 (India) — compliant</li>
        <li>General Data Protection Regulation (GDPR) — applicable for EU-based users</li>
        <li>SOC 2 Type II — in progress</li>
      </ul>

      <h2>9. Responsible Disclosure</h2>
      <p>If you believe you have found a security vulnerability in HealthCRM, we ask that you:</p>
      <ol>
        <li>Do not exploit the vulnerability or access data beyond what is necessary to demonstrate the issue</li>
        <li>Do not disclose the issue publicly until we have had a reasonable opportunity to investigate and remediate it</li>
        <li>Report it to us at <a href="mailto:security@healthcrm.in">security@healthcrm.in</a> with a clear description and steps to reproduce</li>
      </ol>
      <p>We commit to: acknowledging your report within 48 hours, keeping you informed of our investigation progress, and crediting you in our security acknowledgements (if you wish) upon resolution. We do not take legal action against researchers acting in good faith.</p>

      <h2>10. Contact</h2>
      <p>For security inquiries, vulnerability reports, or to request a security questionnaire for vendor assessments, contact us at <a href="mailto:security@healthcrm.in">security@healthcrm.in</a>.</p>

    </LegalLayout>
  )
}
