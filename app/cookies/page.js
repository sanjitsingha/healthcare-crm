import LegalLayout from '../LegalLayout'

export const metadata = {
  title: 'Cookie Policy — HealthCRM',
  description: 'How HealthCRM uses cookies and similar tracking technologies.',
}

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="June 1, 2026">

      <p>This Cookie Policy explains how HealthCRM Technologies Pvt. Ltd. ("HealthCRM", "we", "us", or "our") uses cookies and similar technologies when you visit our website or use our platform. We keep cookie use to the absolute minimum necessary to operate the Service securely and effectively.</p>

      <h2>1. What Are Cookies?</h2>
      <p>Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit a website. They allow the website to recognise your device on subsequent visits and remember certain preferences or actions.</p>
      <p>Similar technologies include local storage, session storage, and pixel tags — these may be used for the same purposes described in this policy.</p>

      <h2>2. Cookies We Use</h2>
      <p>We categorise our cookies as follows:</p>

      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Cookie Name(s)</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Strictly Necessary</strong></td>
            <td>sb-auth-token, sb-refresh-token</td>
            <td>Maintain your authenticated session with Supabase. Without these, you cannot log in.</td>
            <td>Session / 7 days</td>
          </tr>
          <tr>
            <td><strong>Strictly Necessary</strong></td>
            <td>__host-next-auth.csrf-token</td>
            <td>Cross-site request forgery protection. Ensures form submissions come from your session.</td>
            <td>Session</td>
          </tr>
          <tr>
            <td><strong>Functional</strong></td>
            <td>hcrm-preferences</td>
            <td>Stores your UI preferences such as sidebar state, theme, and column visibility.</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td><strong>Analytics (Optional)</strong></td>
            <td>_ga, _gid</td>
            <td>Google Analytics — helps us understand aggregate usage patterns. No personal data is shared.</td>
            <td>2 years / 24 hours</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Strictly Necessary Cookies</h2>
      <p>These cookies are essential for the Service to function. They cannot be disabled without breaking core functionality such as logging in, maintaining your session, and protecting against security attacks. No consent is required for these cookies under applicable law.</p>

      <h2>4. Functional Cookies</h2>
      <p>Functional cookies remember your preferences and settings to improve your experience (for example, remembering which columns are visible in your leads table). These do not track you across other websites.</p>

      <h2>5. Analytics Cookies</h2>
      <p>We may use Google Analytics to collect aggregated, anonymised data about how users navigate the Service. This helps us understand which features are used most and where improvements are needed. This data is:</p>
      <ul>
        <li>Aggregated and not linked to individual users</li>
        <li>Never sold or shared with advertisers</li>
        <li>Processed by Google under their own privacy terms</li>
      </ul>
      <p>You can opt out of analytics tracking at any time (see Section 7 below) without affecting your ability to use the Service.</p>

      <h2>6. Third-Party Cookies</h2>
      <p>We do not allow third-party advertising or tracking cookies on our platform. The only third-party cookies that may be set are:</p>
      <ul>
        <li><strong>Supabase</strong> — our database and authentication provider, for session management</li>
        <li><strong>Google Analytics</strong> — for optional, anonymised usage analytics (only if you have not opted out)</li>
      </ul>

      <h2>7. Managing and Disabling Cookies</h2>
      <p>You have several options for controlling cookies:</p>

      <h3>Browser Settings</h3>
      <p>Most browsers allow you to view, delete, and block cookies through their settings. Note that blocking strictly necessary cookies will prevent you from logging in to HealthCRM.</p>
      <ul>
        <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
        <li><strong>Firefox:</strong> Options → Privacy &amp; Security → Cookies and Site Data</li>
        <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
        <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
      </ul>

      <h3>Opt Out of Analytics</h3>
      <p>To opt out of Google Analytics specifically, you can install the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.</p>

      <h2>8. Changes to This Policy</h2>
      <p>We may update this Cookie Policy as our use of cookies evolves. Changes will be noted with a revised "last updated" date at the top of this page.</p>

      <h2>9. Contact Us</h2>
      <p>If you have questions about our use of cookies, please contact <a href="mailto:privacy@healthcrm.in">privacy@healthcrm.in</a>.</p>

    </LegalLayout>
  )
}
