// Brand logo marks for integration providers (simple recreations for
// identification). They accept a `size` prop like lucide icons; their own
// brand colors are baked in, so any `color`/`style` is ignored for fill.

export function GoogleFormsLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Google Forms">
      <path fill="#7248B9" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path fill="#5a3a99" d="M14 2v6h6l-6-6z" />
      <path d="M8.4 12.4l1.1 1.1 2.2-2.2" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.4 16.1l1.1 1.1 2.2-2.2" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="13.4" y1="12" x2="16.6" y2="12" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13.4" y1="15.7" x2="16.6" y2="15.7" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function MetaLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Meta">
      <defs>
        <linearGradient id="meta-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0064E1" />
          <stop offset="1" stopColor="#00C6FF" />
        </linearGradient>
      </defs>
      <path
        fill="none"
        stroke="url(#meta-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        d="M5 15.5c-1.6 0-2.6-1.5-2.6-3.5S3.4 8.5 5 8.5c2.9 0 4.6 7 7 7s4.1-7 7-7c1.6 0 2.6 1.5 2.6 3.5S21.6 15.5 20 15.5c-2.9 0-4.1-7-7-7S7.9 15.5 5 15.5z"
      />
    </svg>
  )
}

export function ZapierLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Zapier">
      <g stroke="#FF4F00" strokeWidth="2.6" strokeLinecap="round">
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
        <line x1="18.4" y1="5.6" x2="5.6" y2="18.4" />
      </g>
    </svg>
  )
}
