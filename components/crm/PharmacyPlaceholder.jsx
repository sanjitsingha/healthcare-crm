import { Check } from 'lucide-react'

// Shared "coming soon" scaffold for pharmacy sub-pages not yet built out.
export default function PharmacyPlaceholder({ icon: Icon, title, description, planned = [] }) {
  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
          <Icon size={18} style={{ color: 'var(--color-brand)' }} />
        </div>
        <div>
          <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-(--color-border) p-6" style={{ background: 'var(--color-surface)' }}>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-700 mb-4"
          style={{ background: '#fef3c7', color: '#b45309' }}>
          Coming soon
        </span>
        {planned.length > 0 && (
          <>
            <p className="text-xs font-600 mb-3" style={{ color: 'var(--color-text-secondary)' }}>Planned for this section:</p>
            <ul className="space-y-2">
              {planned.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <Check size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--color-brand)' }} />
                  {p}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
