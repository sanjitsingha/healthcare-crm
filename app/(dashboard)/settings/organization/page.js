'use client'
import { useState } from 'react'
import { Building2, Network, Stethoscope, Hash } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import OrganizationPanel from '@/components/crm/settings/OrganizationPanel'
import DepartmentsPage from '../departments/page'
import DoctorsPage from '../doctors/page'
import IdFormatsPage from '../id-formats/page'

// Organization settings as one tabbed page (Organization / Departments /
// Doctors / ID Formats), replacing the former sidebar sub-items.
const TABS = [
  { key: 'organization', label: 'Organization', icon: Building2,   permission: 'settings.organization', Panel: OrganizationPanel },
  { key: 'departments',  label: 'Departments',  icon: Network,     permission: 'settings.departments',  Panel: DepartmentsPage },
  { key: 'doctors',      label: 'Doctors',      icon: Stethoscope, permission: 'settings.doctors',      Panel: DoctorsPage },
  { key: 'id-formats',   label: 'ID Formats',   icon: Hash,        permission: 'settings.organization', Panel: IdFormatsPage },
]

export default function OrganizationSettingsPage() {
  const { hasPermission } = useOrg()
  const visible = TABS.filter(t => hasPermission(t.permission))
  const [tab, setTab] = useState(visible[0]?.key || 'organization')

  const active = visible.find(t => t.key === tab) || visible[0]
  const ActivePanel = active?.Panel

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-(--color-border) overflow-x-auto">
        {visible.map(t => {
          const isActive = active?.key === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-600 border-b-2 -mb-px whitespace-nowrap transition-colors"
              style={isActive
                ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }
                : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {ActivePanel && <ActivePanel />}
    </div>
  )
}
