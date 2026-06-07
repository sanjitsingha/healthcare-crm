// Client-side notification history (per user, localStorage-backed).
// Every toast — local or received over the org realtime channel — is recorded
// here so the Notifications page can show a persistent feed with read state.

const MAX = 200
const key = (uid) => `notifications_${uid || 'anon'}`
const listeners = new Set()

export function getNotifications(uid) {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(key(uid)) || '[]') } catch { return [] }
}

function save(uid, list) {
  try { localStorage.setItem(key(uid), JSON.stringify(list)) } catch {}
  listeners.forEach(fn => fn(list))
}

// Add one notification. Dedupe by event id (eid) so the same event recorded by
// multiple tabs in one browser doesn't appear twice.
export function addNotification(uid, n) {
  if (typeof window === 'undefined') return null
  const list = getNotifications(uid)
  if (n.eid && list.some(x => x.eid === n.eid)) return null
  const entry = {
    id: (crypto.randomUUID?.() || String(Date.now() + Math.random())),
    read: false,
    created_at: new Date().toISOString(),
    ...n,
  }
  save(uid, [entry, ...list].slice(0, MAX))
  return entry
}

export function markAllRead(uid) {
  save(uid, getNotifications(uid).map(n => ({ ...n, read: true })))
}
export function markRead(uid, id) {
  save(uid, getNotifications(uid).map(n => n.id === id ? { ...n, read: true } : n))
}
export function removeNotification(uid, id) {
  save(uid, getNotifications(uid).filter(n => n.id !== id))
}
export function clearNotifications(uid) {
  save(uid, [])
}
export function unreadCount(uid) {
  return getNotifications(uid).filter(n => !n.read).length
}
export function subscribeNotifications(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
