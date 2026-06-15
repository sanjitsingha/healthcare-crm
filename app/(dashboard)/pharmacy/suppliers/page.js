import { Users } from 'lucide-react'
import PharmacyPlaceholder from '@/components/crm/PharmacyPlaceholder'

export default function PharmacySuppliersPage() {
  return (
    <PharmacyPlaceholder
      icon={Users}
      title="Suppliers"
      description="Vendors & distributors"
      planned={[
        'Maintain a directory of suppliers with contact & GST details',
        'Link inventory items and purchases to a supplier',
        'Track outstanding payables per supplier',
        'View purchase history and lead times',
      ]}
    />
  )
}
