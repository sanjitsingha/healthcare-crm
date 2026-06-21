'use client'
import { useState } from 'react'
import { Key, Tag } from 'lucide-react'
import ApiAccessPanel from '@/components/crm/ApiAccessPanel'
import ApiNamesPanel from '@/components/crm/ApiNamesPanel'

const TABS = [
  { id: 'api-access', label: 'API Access', icon: Key },
  { id: 'api-names',  label: 'API Names',  icon: Tag },
]

export default function DeveloperHubPage() {
  const [tab, setTab] = useState('api-access')

  return (
    <div className="flex -m-6 -mb-16 h-screen">
      {/* Left sub-menu */}
      <aside className="w-52 shrink-0 border-r border-(--color-border) h-full flex flex-col p-4" style={{ background: 'var(--color-surface)' }}>
        <div className="mb-6">
          <h2 className="text-base font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Developer Hub</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Build on the CRM</p>
        </div>
        <nav className="space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all hover:bg-(--color-brand-50)"
              style={tab === id ? { background: 'var(--color-brand)', color: 'white' } : { color: 'var(--color-text-secondary)' }}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto p-6 pb-16 space-y-4">
        {tab === 'api-access' && <ApiAccessPanel />}
        {tab === 'api-names' && <ApiNamesPanel />}
      </div>
    </div>
  )
}
