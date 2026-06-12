'use client'
import { useState } from 'react'
import { Plus, Search, ClipboardList, X } from 'lucide-react'
import { Button } from '@/components/ui'

export default function ServicesSettingsPage() {
  const [search, setSearch] = useState('')

  // Data layer wired in a later step. For now this is the page scaffold:
  // title, search, and the common "Add" button.
  const services = []
  const filtered = services.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    // Implementation comes next.
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Services &amp; Pricing
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Manage the services and tests your clinic offers and their prices
          </p>
        </div>
        <Button onClick={handleAdd} className="shrink-0">
          <Plus size={16} /> Add Service
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-(--color-border) outline-none transition-all"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            placeholder="Search services or tests…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Body — placeholder until the data layer is implemented */}
      <div className="py-24 text-center border border-dashed rounded-2xl border-(--color-border)">
        <ClipboardList size={32} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm font-500" style={{ color: 'var(--color-text-muted)' }}>
          {search ? 'No services match your search.' : 'No services added yet.'}
        </p>
      </div>
    </div>
  )
}
