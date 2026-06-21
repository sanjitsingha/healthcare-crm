// Small section header used across Settings panels.
export default function SectionHead({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-4 pb-4 border-b border-(--color-border)">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-50)' }}>
        <Icon size={16} style={{ color: 'var(--color-brand)' }} />
      </div>
      <div>
        <p className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {description && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      </div>
    </div>
  )
}
