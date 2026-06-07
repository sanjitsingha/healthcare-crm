// Tiny global toast emitter — call toast({...}) from anywhere (pages, handlers)
// and the ToastHost (mounted in the dashboard layout) renders it.

const listeners = new Set()

export function subscribeToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// toast({ type, title, message, duration })
export function toast(opts) {
  listeners.forEach(fn => fn(opts))
}
