'use client'
import { UserRound } from 'lucide-react'
import { Card, Avatar } from '@/components/ui'
import { useOrg } from '@/lib/context/OrgContext'

function SectionHead({ icon: Icon, title, description }) {
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

export default function AccountPage() {
  const { user } = useOrg()
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || 'Not available'

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHead icon={UserRound} title="Account" description="Your signed-in account details" />
        <div className="flex items-center gap-3 p-3 rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
          <Avatar name={displayName} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-600 truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{displayEmail}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
