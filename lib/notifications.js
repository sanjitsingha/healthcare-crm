// Per-user notification read/dismiss state (localStorage). The notification
// CONTENT lives in the Supabase `notifications` table (org-wide, auto-purged
// after 30 days); only each user's read/dismissed ids are kept here.

const readKey = (uid) => `notif_read_${uid || 'anon'}`
const dismKey = (uid) => `notif_dismissed_${uid || 'anon'}`
const listeners = new Set()

function getSet(k) {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')) } catch { return new Set() }
}
function saveSet(k, set) {
  try { localStorage.setItem(k, JSON.stringify([...set])) } catch {}
  listeners.forEach(fn => fn())
}

export const getReadIds      = (uid) => getSet(readKey(uid))
export const getDismissedIds = (uid) => getSet(dismKey(uid))

export function markRead(uid, id) {
  const s = getSet(readKey(uid)); s.add(id); saveSet(readKey(uid), s)
}
export function markAllRead(uid, ids) {
  const s = getSet(readKey(uid)); ids.forEach(i => s.add(i)); saveSet(readKey(uid), s)
}
export function dismiss(uid, id) {
  const s = getSet(dismKey(uid)); s.add(id); saveSet(dismKey(uid), s)
}
export function clearAll(uid, ids) {
  const s = getSet(dismKey(uid)); ids.forEach(i => s.add(i)); saveSet(dismKey(uid), s)
}
export function subscribeNotifState(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
