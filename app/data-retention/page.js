import LegalLayout from '../LegalLayout'

export const metadata = {
  title: 'Data Retention & Deletion Policy — HealthCRM',
  description: 'How long HealthCRM keeps your data and how to request deletion.',
}

export default function DataRetention() {
  return (
    <LegalLayout title="Data Retention & Deletion Policy" lastUpdated="June 1, 2026">

      <p>This policy describes how long HealthCRM Technologies Pvt. Ltd. retains different categories of data, and how you can request deletion of your data. We believe in keeping only what is necessary, for only as long as it is needed.</p>

      <h2>1. Our Data Retention Principles</h2>
      <ul>
        <li><strong>Purpose limitation:</strong> We only retain data as long as it serves the purpose for which it was collected</li>
        <li><strong>Minimisation:</strong> We do not retain data we no longer need</li>
        <li><strong>Transparency:</strong> We tell you exactly how long we keep each category of data</li>
        <li><strong>Your control:</strong> You can export or delete your data at any time through the platform or by contacting us</li>
      </ul>

      <h2>2. Retention Schedule</h2>
      <table>
        <thead>
          <tr>
            <th>Data Category</th>
            <th>Retention Period</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Active account data (leads, patients, appointments, consultations)</td>
            <td>Duration of active subscription</td>
            <td>Required to provide the Service</td>
          </tr>
          <tr>
            <td>Account profile and organisation details</td>
            <td>Duration of subscription + 30 days post-termination</td>
            <td>Required to provide the Service and handle termination queries</td>
          </tr>
          <tr>
            <td>Audit logs</td>
            <td>2 years from the date of creation</td>
            <td>Security, compliance, and dispute resolution</td>
          </tr>
          <tr>
            <td>Billing and invoicing records</td>
            <td>7 years from the date of transaction</td>
            <td>Required by Indian tax law (GST and Income Tax Act)</td>
          </tr>
          <tr>
            <td>Support communications</td>
            <td>3 years from last interaction</td>
            <td>Quality improvement and dispute resolution</td>
          </tr>
          <tr>
            <td>Database backups</td>
            <td>90 days from backup creation date</td>
            <td>Disaster recovery</td>
          </tr>
          <tr>
            <td>Usage and analytics logs</td>
            <td>13 months</td>
            <td>Year-over-year product analysis</td>
          </tr>
          <tr>
            <td>Data exported for deleted accounts</td>
            <td>30 days (download window)</td>
            <td>Allow time for final data export</td>
          </tr>
        </tbody>
      </table>

      <h2>3. What Happens When You Cancel Your Subscription</h2>
      <p>When your subscription ends (whether by cancellation, non-payment, or account closure):</p>
      <ol>
        <li><strong>Day 0 — Access suspended:</strong> Your ability to log in and access the platform is disabled. Your data remains intact in our systems.</li>
        <li><strong>Days 1–30 — Export window:</strong> You may contact <a href="mailto:support@healthcrm.in">support@healthcrm.in</a> to request a full data export. We will provide your data in CSV or JSON format within 5 business days of your request.</li>
        <li><strong>Day 30 — Permanent deletion:</strong> All your operational data (leads, patients, appointments, consultations, notes, tags, tasks, custom modules, and user records) is permanently and irreversibly deleted from our production systems.</li>
        <li><strong>Days 30–120 — Backup expiry:</strong> Residual data in encrypted backups will naturally expire and be deleted within the 90-day backup retention window.</li>
        <li><strong>Retained records:</strong> Billing records, audit logs for the active period, and legally required data are retained per the schedule above and are not affected by account deletion.</li>
      </ol>

      <h2>4. Deleting Data During an Active Subscription</h2>
      <p>You can delete data at any time while your subscription is active:</p>

      <h3>In-app deletion</h3>
      <ul>
        <li><strong>Individual records:</strong> Delete individual leads, patients, appointments, or consultations from within the platform. Deleted records are soft-deleted (hidden from view) for 7 days, then permanently removed.</li>
        <li><strong>Team members:</strong> Organisation Owners and Admins can remove team members from Settings → People at any time.</li>
        <li><strong>Tags and custom modules:</strong> Can be removed from Settings.</li>
      </ul>

      <h3>Account-level deletion</h3>
      <p>To permanently delete your entire organisation and all associated data, contact <a href="mailto:support@healthcrm.in">support@healthcrm.in</a> from the registered owner email. We will:</p>
      <ol>
        <li>Verify your identity and ownership</li>
        <li>Provide a final data export if requested</li>
        <li>Permanently delete all organisation data within 30 days of the confirmed request</li>
        <li>Send written confirmation once deletion is complete</li>
      </ol>

      <h2>5. Data Portability — Exporting Your Data</h2>
      <p>You have the right to export your data at any time. HealthCRM supports:</p>
      <ul>
        <li><strong>CSV export:</strong> Available directly from the Leads, Patients, and Consultations list pages using the Export button</li>
        <li><strong>Full account export:</strong> Contact <a href="mailto:support@healthcrm.in">support@healthcrm.in</a> to request a complete export of all your organisation's data in JSON format</li>
      </ul>
      <p>We will fulfil full-account export requests within 5 business days.</p>

      <h2>6. Patient Data — Special Considerations</h2>
      <p>HealthCRM processes patient data on behalf of healthcare organisations (our customers). This means:</p>
      <ul>
        <li>Requests for deletion of individual patient records should be directed to the healthcare organisation (data controller), not to HealthCRM</li>
        <li>We will action deletion requests from the healthcare organisation promptly</li>
        <li>We are not responsible for the retention decisions of the healthcare organisations that use our platform, who must comply with their own regulatory obligations (e.g., medical records retention requirements under applicable Indian healthcare regulations)</li>
      </ul>

      <h2>7. Data Residency</h2>
      <p>All primary data is stored within our cloud provider's infrastructure. We do not currently offer data residency guarantees for specific geographic regions beyond what our infrastructure provider (Supabase) supports. If data residency is a regulatory requirement for your organisation, please contact us to discuss your needs before subscribing.</p>

      <h2>8. Requesting Data Deletion</h2>
      <p>To submit a deletion request:</p>
      <ul>
        <li>Email: <a href="mailto:privacy@healthcrm.in">privacy@healthcrm.in</a> with subject line "Data Deletion Request"</li>
        <li>Include: your organisation name, registered email, and the specific data you want deleted</li>
        <li>We will respond within 5 business days to acknowledge and confirm the deletion timeline</li>
      </ul>

      <h2>9. Contact</h2>
      <p>For questions about this policy or to submit a data request, contact us at <a href="mailto:privacy@healthcrm.in">privacy@healthcrm.in</a>.</p>

    </LegalLayout>
  )
}
