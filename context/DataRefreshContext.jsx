'use client'

import { createContext, useContext, useState } from 'react'

const DataRefreshContext = createContext()

export function DataRefreshProvider({ children }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <DataRefreshContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </DataRefreshContext.Provider>
  )
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext)
  if (!context) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider')
  }
  return context
} 