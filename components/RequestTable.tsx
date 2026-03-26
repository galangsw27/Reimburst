'use client'

import React, { useState, useMemo } from 'react'
import { Reimbursement, ReimbursementStatus, UserRole } from '@/lib/types'
import { Button } from './ui/button'
import { ChevronLeft, ChevronRight, Check, X, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Props for the RequestTable component
 */
export interface RequestTableProps {
  /** Array of reimbursement requests to display */
  requests: Reimbursement[]
  /** Callback when view detail button is clicked */
  onViewDetail: (request: Reimbursement) => void
  /** Whether the table is in a loading state */
  loading?: boolean
  /** Callback when approve button is clicked (for lead/head) */
  onApprove?: (request: Reimbursement) => void
  /** Callback when reject button is clicked (for lead/head) */
  onReject?: (request: Reimbursement) => void
  /** Callback when batch submit is clicked (for lead/head) */
  onBatchSubmit?: (requests: Reimbursement[]) => void
  /** Callback when batch approve is clicked (for lead/head) */
  onBatchApprove?: (requests: Reimbursement[]) => void
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
 * Check if user can approve/reject a request based on role and request status
 * 
 * New Flow:
 * - Lead can APPROVE pending requests from their assigned users -> becomes approved_by_lead
 * - Head can APPROVE submitted_to_head requests -> becomes approved_by_head
 * - Finance can APPROVE submitted_to_finance requests -> becomes approved_by_finance
 */
function canUserApprove(userRole: UserRole, request: Reimbursement): boolean {
  if (userRole === 'lead') {
    // Lead can approve pending requests from their assigned users
    return request.status === 'pending' && !request.approvals?.lead?.approved
  }
  if (userRole === 'head') {
    // Head can approve requests that have been submitted to head by lead
    return request.status === 'submitted_to_head' && !request.approvals?.head?.approved
  }
  if (userRole === 'finance') {
    // Finance can approve requests that have been submitted to finance by head
    return request.status === 'submitted_to_finance' && !request.approvals?.finance?.approved
  }
  return false
}

/**
 * RequestTable component displays reimbursement requests in a table format
 * with pagination support and approval actions for lead/head users
 */
export function RequestTable({ 
  requests, 
  onViewDetail, 
  loading = false,
  onApprove,
  onReject,
  onBatchSubmit,
  onBatchApprove
}: RequestTableProps) {
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const itemsPerPage = 10

  // Check if user is lead, head, or finance (can approve)
  const canApprove = user && (user.role === 'lead' || user.role === 'head' || user.role === 'finance')
  
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
            {onBatchApprove && (
              <Button
                size="sm"
                variant="default"
                onClick={handleBatchApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleBatchSubmit}
              disabled={!onBatchSubmit}
            >
              <Send className="w-4 h-4 mr-1" />
              Submit to {user?.role === 'lead' ? 'Head' : 'Finance'}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {/* Checkbox column for lead/head */}
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
                {/* Actions column for lead/head */}
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
                      {/* Checkbox for lead/head */}
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
                      {/* Actions column for lead/head */}
                      {canApprove && (
                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                          {isApprovable ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onApprove?.(request)}
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
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
                              <span className="text-muted-foreground block mb-1">Evidence Preview</span>
                              {request.receiptImage ? (
                                <div className="flex gap-2">
                                  <div onClick={() => setPreviewImage(request.receiptImage as string)} className="inline-block relative" title="Klik untuk memperbesar">
                                    <span className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black">1</span>
                                    <img 
                                      src={request.receiptImage} 
                                      alt="Evidence" 
                                      className="max-h-24 object-cover border rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                  </div>
                                  {(request as any).receiptImage2 && (
                                    <div onClick={() => setPreviewImage((request as any).receiptImage2)} className="inline-block relative" title="Evidence Pendukung - Klik untuk memperbesar">
                                      <span className="absolute -top-1 -left-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black">2</span>
                                      <img 
                                        src={(request as any).receiptImage2} 
                                        alt="Evidence 2" 
                                        className="max-h-24 object-cover border border-amber-500 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="font-medium block">-</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground block mb-1">Folder Evidence</span>
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
                              <span className="text-muted-foreground block">Remark</span>
                              <span className="font-medium max-w-[300px] truncate block" title={request.rejectionReason || '-'}>{request.rejectionReason || '-'}</span>
                            </div>
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
                // Show first page, last page, current page, and pages around current
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

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-12 right-0 text-white hover:bg-white/20 z-10"
                onClick={() => setPreviewImage(null)}
              >
                <X className="w-6 h-6" />
              </Button>
              <img
                src={previewImage}
                alt="Evidence Full View"
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
