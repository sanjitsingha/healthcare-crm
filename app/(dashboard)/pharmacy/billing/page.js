import { ShoppingCart } from 'lucide-react'
import PharmacyPlaceholder from '@/components/crm/PharmacyPlaceholder'

export default function PharmacyBillingPage() {
  return (
    <PharmacyPlaceholder
      icon={ShoppingCart}
      title="Billing"
      description="Walk-in pharmacy sales & receipts"
      planned={[
        'Counter-style POS — search inventory, add items to a cart, auto-deduct stock',
        'Automatic totals with per-item GST/tax and discounts',
        'Optionally link a sale to an existing patient from the CRM',
        'Collect payment (cash / online) and generate a printable receipt',
      ]}
    />
  )
}
