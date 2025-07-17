'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useDataRefresh } from '@/context/DataRefreshContext'
import { useUser } from '@/app/provider'

export default function TransactionForm({ onTransactionSuccess }) {
  const [loading, setLoading] = useState(false)
  const [jars, setJars] = useState([])
  const { user } = useUser()
  const { triggerRefresh } = useDataRefresh()
  const [formData, setFormData] = useState({
    jarCategoryId: '',
    amount: '',
    description: '',
    type: 'expense' // or 'income'
  })

  useEffect(() => {
    if (user?.id) {
      fetchUserJars()
    }
  }, [user?.id])

  const fetchUserJars = async () => {
    try {
      const response = await fetch('/api/jars/categories')
      
      if (!response.ok) {
        throw new Error('Failed to fetch jar categories')
      }
      
      const data = await response.json()
      console.log('Fetched jar categories:', data.categories)
      setJars(data.categories || [])
    } catch (error) {
      console.error('Error fetching jar categories:', error)
      toast.error('Failed to load jar categories')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!user?.id) {
        throw new Error('User not found')
      }

      const amount = Math.round(parseFloat(formData.amount))
      const finalAmount = formData.type === 'expense' ? -amount : amount

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(user.id),
          jarCategoryId: parseInt(formData.jarCategoryId),
          amountCents: finalAmount,
          description: formData.description,
          source: 'manual'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add transaction')
      }

      // Trigger refresh across the app
      triggerRefresh()

      toast.success('Transaction added successfully')
      
      if (onTransactionSuccess) {
        onTransactionSuccess()
      }

      setFormData({
        jarCategoryId: '',
        amount: '',
        description: '',
        type: 'expense'
      })
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast.error(error.message || 'Failed to add transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="jar">Select Jar</Label>
        <Select
          value={formData.jarCategoryId}
          onValueChange={(value) => setFormData({ ...formData, jarCategoryId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a jar" />
          </SelectTrigger>
          <SelectContent>
            {jars.map((jar) => (
              <SelectItem key={jar.id} value={jar.id.toString()}>
                {jar.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Transaction Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (VND)</Label>
        <Input
          id="amount"
          type="number"
          step="1"
          placeholder="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Enter transaction description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Adding...' : 'Add Transaction'}
      </Button>
    </form>
  )
} 