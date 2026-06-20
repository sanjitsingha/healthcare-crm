// Client helper: ask the server to run automation rules for an event.
// Fire-and-forget from UI handlers; the server (service role) is the single
// executor, so rules behave identically no matter where they're triggered.
//
// Returns the run summary (useful for dryRun "Test rule"), or null on failure.
export async function triggerAutomation({ orgId, target, event, entityId, prev = null, dryRun = false }) {
  if (!orgId || !target || !event || !entityId) return null
  try {
    const res = await fetch('/api/automations/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, target, event, entityId, prev, dryRun }),
    })
    return await res.json().catch(() => null)
  } catch {
    return null
  }
}
