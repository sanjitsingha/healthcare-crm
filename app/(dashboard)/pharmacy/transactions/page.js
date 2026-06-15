import { ArrowLeftRight } from 'lucide-react'
import PharmacyPlaceholder from '@/components/crm/PharmacyPlaceholder'

export default function PharmacyTransactionsPage() {
  return (
    <PharmacyPlaceholder
      icon={ArrowLeftRight}
      title="Transactions"
      description="Stock movement & money ledger"
      planned={[
        'Unified ledger of every sale, purchase, and stock adjustment',
        'Filter by date range, type, item, or payment mode',
        'Manual stock adjustments (damage, expiry write-off, returns)',
        'Export transactions to CSV for accounting',
      ]}
    />
  )
}
