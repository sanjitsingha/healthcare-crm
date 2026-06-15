import { Truck } from 'lucide-react'
import PharmacyPlaceholder from '@/components/crm/PharmacyPlaceholder'

export default function PharmacyPurchasesPage() {
  return (
    <PharmacyPlaceholder
      icon={Truck}
      title="Purchases"
      description="Stock purchases & purchase orders"
      planned={[
        'Record incoming stock against a supplier with batch & expiry',
        'Auto-increment inventory quantities on receipt',
        'Track purchase orders and pending deliveries',
        'Capture purchase invoices and payment status',
      ]}
    />
  )
}
