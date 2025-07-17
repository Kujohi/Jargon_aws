'use client'

import { Card } from '@/components/ui/card'
import TransactionList from './_components/TransactionList'
import TransactionForm from './_components/TransactionForm'
import { useDataRefresh } from '@/context/DataRefreshContext'

export default function TransactionsPage() {
  const { triggerRefresh } = useDataRefresh();

  const handleTransactionSuccess = () => {
    triggerRefresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Form */}
        <Card className="p-4 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Add Transaction</h2>
          <TransactionForm onTransactionSuccess={handleTransactionSuccess} />
        </Card>

        {/* Transaction List */}
        <Card className="p-4 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
          <TransactionList />
        </Card>
      </div>
    </div>
  )
} 