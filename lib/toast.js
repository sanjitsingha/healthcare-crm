// Tiny global toast emitter — call toast({...}) from anywhere (pages, handlers)
// and the ToastHost (mounted in the dashboard layout) renders it.

const listeners = new Set()

export function subscribeToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// toast({ type, title, message, duration }) — attaches a stable event id (eid)
// so the same event can be deduped across tabs/clients.
export function toast(opts) {
  const payload = { eid: (crypto.randomUUID?.() || String(Date.now() + Math.random())), ...opts }
  listeners.forEach(fn => fn(payload))
}
