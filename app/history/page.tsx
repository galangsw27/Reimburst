'use client'

import { HistoryList } from '@/components/HistoryList'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Reimbursement History</h1>
          <p className="text-muted-foreground mt-2">
            View all your reimbursement requests and their status
          </p>
        </div>
        <HistoryList />
      </div>
    </ProtectedRoute>
  )
}
