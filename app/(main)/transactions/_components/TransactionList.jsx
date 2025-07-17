'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDataRefresh } from '@/context/DataRefreshContext'
import { useUser } from '@/app/provider'

export default function TransactionList() {
  const [transactions, setTransactions] = useState([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const { user } = useUser()
  const [jarCategories, setJarCategories] = useState([])
  const [filter, setFilter] = useState({
    jar: 'all',
    type: 'all',
    search: ''
  })
  const { refreshTrigger } = useDataRefresh()

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      // Only show loading for the very first fetch
      const isFirstLoad = transactions.length === 0
      fetchTransactions(isFirstLoad)
    }
  }, [filter, user?.id, refreshTrigger])

  const fetchUserData = async () => {
    try {
      // Fetch jar categories from the API
      const response = await fetch('/api/jars/categories')
      if (!response.ok) {
        throw new Error('Failed to fetch jar categories')
      }
      
      const data = await response.json()
      console.log('Fetched jar categories for list:', data.categories)
      setJarCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast.error('Failed to load jar categories')
    }
  }

  const fetchTransactions = async (showLoading = false) => {
    try {
      if (!user?.id) {
        throw new Error('User not found')
      }

      const queryParams = new URLSearchParams({
        userId: user.id,
        ...(filter.jar !== 'all' && { jarCategoryId: filter.jar }),
        ...(filter.type !== 'all' && { type: filter.type }),
        ...(filter.search && { search: filter.search })
      })

      const response = await fetch(`/api/transactions?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Failed to load transactions')
    } finally {
      if (showLoading) {
        setIsInitialLoading(false)
      }
    }
  }

  const formatAmount = (cents) => {
    const dong = Math.abs(cents)
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(dong)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isInitialLoading) {
    return <div>Loading transactions...</div>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Filter by Jar</Label>
          <Select
            value={filter.jar}
            onValueChange={(value) => setFilter({ ...filter, jar: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jars</SelectItem>
              {jarCategories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Transaction Type</Label>
          <Select
            value={filter.type}
            onValueChange={(value) => setFilter({ ...filter, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Search</Label>
          <Input
            placeholder="Search by description..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No transactions found
          </div>
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50"
            >
              <div className="space-y-1">
                <div className="font-medium">{transaction.description}</div>
                <div className="text-sm text-gray-500">
                  {transaction.jar_category?.name || 'Unknown Jar'} • {formatDate(transaction.occurred_at)}
                </div>
              </div>
              <div className={`font-semibold ${transaction.amount_cents < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatAmount(transaction.amount_cents)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 