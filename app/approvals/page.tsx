'use client'

import { ApprovalList } from '@/components/ApprovalList'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function ApprovalsPage() {
  return (
    <ProtectedRoute requiredRoles={['finance', 'lead', 'head']}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Approval Management</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve reimbursement requests
          </p>
        </div>
        <ApprovalList />
      </div>
    </ProtectedRoute>
  )
}
