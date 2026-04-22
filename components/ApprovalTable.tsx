'use client'

import React, { useState, useMemo } from 'react'
import { Reimbursement, ReimbursementStatus, UserRole } from '@/lib/types'
import { Button } from './ui/button'
import { ChevronLeft, ChevronRight, Check, X, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Props for the ApprovalTable component
 */
export interface ApprovalTableProps {
  /** Array of reimbursement requests to display */
  requests: Reimbursement[]
  /** Callback when view detail button is clicked */
  onViewDetail: (request: Reimbursement) => void
  /** Callback when approve button is clicked */
  onApprove?: (request: Reimbursement) => void
  /** Callback when reject button is clicked */
  onReject?: (request: Reimbursement) => void
  /** Callback when batch submit is clicked */
  onBatchSubmit?: (requests: Reimbursement[]) => void
  /** Callback when single submit is clicked (for lead/head) */
  onSubmitSingle?: (request: Reimbursement) => void
  /** Callback when batch approve is clicked */
  onBatchApprove?: (requests: Reimbursement[]) => void
  /** Whether the table is in a loading state */
  loading?: boolean
}

/**
 * Get status badge color based on reimbursement status
 */
function getStatusColor(status: ReimbursementStatus): string {
  switch (status) {
    case 'approved_by_finance':
      return 'bg-green-500 text-white'
    case 'submitted_to_finance':
      return 'bg-purple-500 text-white'
    case 'approved_by_head':
      return 'bg-blue-600 text-white'
    case 'submitted_to_head':
      return 'bg-indigo-500 text-white'
    case 'approved_by_lead':
      return 'bg-blue-500 text-white'
    case 'rejected':
      return 'bg-red-500 text-white'
    case 'pending':
    default:
      return 'bg-yellow-500 text-white'
  }
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: ReimbursementStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'approved_by_lead':
      return 'Approved by Lead'
    case 'submitted_to_head':
      return 'Submitted to Head'
    case 'approved_by_head':
      return 'Approved by Head'
    case 'submitted_to_finance':
      return 'Submitted to Finance'
    case 'approved_by_finance':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}

/**
 * Format amount to Indonesian Rupiah format (Rp X,XXX)
 */
function formatAmount(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

/**
 * Format date to DD/MM/YYYY format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return dateString
  }
}

/**
 * Check if user can take action on a request based on role and request status
 * 
 * NEW FLOW - Approval Page Actions:
 * - Lead: Can SUBMIT approved_by_lead requests to Head
 * - Head: Can SUBMIT approved_by_head requests to Finance
 * - Finance: Can APPROVE submitted_to_finance requests (final approval)
 */
function canUserApprove(userRole: UserRole, request: Reimbursement): boolean {
  if (userRole === 'lead') {
    // Lead can submit their approved requests to head (that haven't been submitted yet)
    return request.status === 'approved_by_lead' && 
           (request.approvals?.lead?.approved === true) &&
           (request.approvals?.lead?.submittedToHead !== true)
  }
  if (userRole === 'head') {
    // Head can submit their approved requests to finance (that haven't been submitted yet)
    return request.status === 'approved_by_head' && 
           (request.approvals?.head?.approved === true) &&
           (request.approvals?.head?.submittedToFinance !== true)
  }
  if (userRole === 'finance') {
    // Finance can approve requests that have been submitted to them
    return request.status === 'submitted_to_finance' &&
           (request.approvals?.finance?.approved !== true)
  }
  return false
}

/**
 * Get next approval level label based on user role
 */
function getNextLevelLabel(userRole: UserRole): string {
  if (userRole === 'lead') return 'Head'
  if (userRole === 'head') return 'Finance'
  return 'Next Level'
}

/**
 * Get action button label based on user role
 */
function getActionLabel(userRole: UserRole): string {
  if (userRole === 'lead') return 'Submit to Head'
  if (userRole === 'head') return 'Submit to Finance'
  if (userRole === 'finance') return 'Approve'
  return 'Action'
}

/**
 * ApprovalTable component displays approval requests with same format as RequestTable
 * Shows only requests that have been approved at previous level
 * 
 * Requirements: 15.4, 15.5, 15.6, 15.8
 */
export function ApprovalTable({ 
  requests, 
  onViewDetail, 
  onApprove,
  onReject,
  onBatchSubmit,
  onSubmitSingle,
  onBatchApprove,
  loading = false 
}: ApprovalTableProps) {
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const itemsPerPage = 10

  // Check if user can take action (lead, head, or finance)
  const canApprove = user && ['head', 'finance', 'lead'].includes(user.role)
  
  // Get approvable requests (for checkbox selection)
  const approvableRequests = useMemo(() => {
    if (!user || !canApprove) return []
    return requests.filter(req => canUserApprove(user.role, req))
  }, [requests, user, canApprove])

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(approvableRequests.map(req => req.id))
      setSelectedRequests(newSelected)
    } else {
      setSelectedRequests(new Set())
    }
  }

  // Handle individual checkbox
  const handleSelectRequest = (requestId: string, checked: boolean) => {
    const newSelected = new Set(selectedRequests)
    if (checked) {
      newSelected.add(requestId)
    } else {
      newSelected.delete(requestId)
    }
    setSelectedRequests(newSelected)
  }

  // Toggle expanded row
  const toggleExpandRow = (requestId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId)
    } else {
      newExpanded.add(requestId)
    }
    setExpandedRows(newExpanded)
  }

  // Check if all approvable requests are selected
  const allSelected = approvableRequests.length > 0 && 
    approvableRequests.every(req => selectedRequests.has(req.id))

  // Check if some (but not all) are selected
  const someSelected = selectedRequests.size > 0 && !allSelected

  // Handle batch submit
  const handleBatchSubmit = () => {
    if (onBatchSubmit && selectedRequests.size > 0) {
      const selectedReqs = requests.filter(req => selectedRequests.has(req.id))
      onBatchSubmit(selectedReqs)
      setSelectedRequests(new Set())
    }
  }

  // Handle single submit (for lead/head to submit to next level)
  const handleSubmitSingle = (request: Reimbursement) => {
    if (onSubmitSingle) {
      onSubmitSingle(request)
    } else if (onBatchSubmit) {
      // Fallback to batch submit if onSubmitSingle not provided
      onBatchSubmit([request])
    }
  }

  // Handle batch approve
  const handleBatchApprove = () => {
    if (onBatchApprove && selectedRequests.size > 0) {
      const selectedReqs = requests.filter(req => selectedRequests.has(req.id))
      onBatchApprove(selectedReqs)
      setSelectedRequests(new Set())
    }
  }

  // Sort requests by date descending by default
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA // Descending order (newest first)
    })
  }, [requests])

  // Calculate pagination
  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRequests = sortedRequests.slice(startIndex, endIndex)

  // Reset to page 1 when requests change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [requests.length])

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-border rounded-lg">
        <p>No approval requests found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Batch Action Bar - Only show when items are selected */}
      {canApprove && selectedRequests.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <span className="text-sm font-medium">
            {selectedRequests.size} request{selectedRequests.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRequests(new Set())}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
            {user && (user.role === 'lead' || user.role === 'head') && (
              <Button
                size="sm"
                onClick={handleBatchSubmit}
                disabled={!onBatchSubmit}
              >
                <Send className="w-4 h-4 mr-1" />
                Submit to {getNextLevelLabel(user.role)}
              </Button>
            )}
            {user?.role === 'finance' && (
              <Button
                size="sm"
                onClick={handleBatchApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Batch Approve
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {/* Checkbox column */}
                {canApprove && (
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      title="Select all"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Tgl
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Transaksi
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Payment Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  View Detail
                </th>
                {/* Actions column */}
                {canApprove && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {currentRequests.map((request, index) => {
                const isApprovable = user && canUserApprove(user.role, request)
                const isSelected = selectedRequests.has(request.id)
                const isExpanded = expandedRows.has(request.id)
                
                return (
                  <React.Fragment key={request.id}>
                    <tr 
                      className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      {/* Checkbox */}
                      {canApprove && (
                        <td className="px-2 py-2 text-xs whitespace-nowrap">
                          {isApprovable ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectRequest(request.id, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {formatDate(request.date)}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {(request as any).transactionTime || '-'}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="max-w-[200px] truncate" title={request.description}>
                          {request.description || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {(request as any).paymentMethod || '-'}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap font-medium">
                        {formatAmount(request.amount)}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpandRow(request.id)}
                          className="h-7 px-2"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              Detail
                            </>
                          )}
                        </Button>
                      </td>
                      {/* Actions column */}
                      {canApprove && (
                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                          {isApprovable ? (
                            <div className="flex gap-1">
                              {user?.role === 'finance' ? (
                                // Finance: Approve button
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onApprove?.(request)}
                                  className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              ) : (
                                // Lead/Head: Submit button
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSubmitSingle(request)}
                                  className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                  title={`Submit to ${getNextLevelLabel(user!.role)}`}
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onReject?.(request)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                    {/* Expanded Row - Show additional details */}
                    {isExpanded && (
                      <tr className="bg-muted/20">
                        <td colSpan={canApprove ? 10 : 9} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground block">TRX ID</span>
                              <span className="font-mono font-medium max-w-[150px] truncate block" title={(request as any).transactionId || '-'}>{(request as any).transactionId || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Amount</span>
                              <span className="font-medium">{formatAmount((request as any).transactionAmount || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">B. Admin</span>
                              <span className="font-medium">{formatAmount((request as any).adminFee || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">B. Kirim</span>
                              <span className="font-medium">{formatAmount((request as any).shippingFee || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">B. Layanan</span>
                              <span className="font-medium">{formatAmount((request as any).serviceFee || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Diskon</span>
                              <span className="font-medium">{formatAmount((request as any).discount || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Login Status</span>
                              <span className="font-medium">{(request as any).loginStatus || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">By</span>
                              <span className="font-medium">{(request as any).by || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Employee</span>
                              <span className="font-medium max-w-[150px] truncate block" title={request.employeeName || '-'}>{request.employeeName || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Email</span>
                              <span className="font-medium max-w-[180px] truncate block" title={request.employeeEmail || '-'}>{request.employeeEmail || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Project</span>
                              <span className="font-medium max-w-[150px] truncate block" title={request.project || '-'}>{request.project || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Lead</span>
                              <span className="font-medium max-w-[150px] truncate block" title={request.leadName || '-'}>{request.leadName || '-'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground block">Folder Evidence</span>
                              <span className="font-medium max-w-[300px] truncate block" title={(request as any).folderEvidence || '-'}>
                                {(request as any).folderEvidence ? (
                                  ((request as any).folderEvidence.startsWith('http') || (request as any).folderEvidence.includes('drive.google.com')) ? (
                                    <a href={(request as any).folderEvidence} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                      <span className="inline-flex items-center justify-center w-4 h-4 bg-green-500 rounded-full text-[10px] font-bold text-black mr-1">1</span>
                                      Buka Folder
                                    </a>
                                  ) : (
                                    (request as any).folderEvidence
                                  )
                                ) : (
                                  '-'
                                )}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground block">Approved By Lead</span>
                              <span className="font-medium text-green-600">
                                {request.approvals?.lead?.by || '-'} 
                                {request.approvals?.lead?.date && ` (${formatDate(request.approvals.lead.date)})`}
                              </span>
                            </div>
                            {request.approvals?.head?.approved && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground block">Approved By Head</span>
                                <span className="font-medium text-green-600">
                                  {request.approvals?.head?.by || '-'} 
                                  {request.approvals?.head?.date && ` (${formatDate(request.approvals.head.date)})`}
                                </span>
                              </div>
                            )}
                            {request.rejectionReason && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground block">Rejection Reason</span>
                                <span className="font-medium text-red-600">{request.rejectionReason}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage = 
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1)
                
                const showEllipsis = 
                  (page === 2 && currentPage > 3) ||
                  (page === totalPages - 1 && currentPage < totalPages - 2)

                if (showEllipsis) {
                  return <span key={page} className="px-2 text-muted-foreground">...</span>
                }

                if (!showPage) return null

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="h-8 w-8 p-0"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
