// Global confirm dialog emitter — call showConfirm() from anywhere,
// ConfirmHost (mounted in dashboard layout) renders the modal.

const listeners = new Set()

export function subscribeConfirm(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function showConfirm({ title, message, confirmLabel = 'Delete', variant = 'danger' }) {
  return new Promise((resolve) => {
    listeners.forEach(fn => fn({ title, message, confirmLabel, variant, resolve }))
  })
}
