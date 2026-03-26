'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ProjectPanel } from '@/components/ProjectPanel'
import { RequestPanel } from '@/components/RequestPanel'
import { RequestModal } from '@/components/RequestModal'
import { Project, Reimbursement, ReimbursementStatus } from '@/lib/types'
import { useReimbursements, invalidateReimbursementsCache } from '@/lib/hooks/useReimbursements'
import { useAuth } from '@/providers/AuthProvider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Filter, Calendar, X, Plus, CheckCircle, XCircle, Send, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Filter state interface
 */
interface FilterState {
  status: ReimbursementStatus | 'all'
  dateFrom: string
  dateTo: string
  lead: string
}

/**
 * RequestListPage Component
 * 
 * Main page for the Request module with split-view layout.
 * 
 * Features:
 * - Split-view layout with ProjectPanel and RequestPanel
 * - Project selection handler
 * - Fetch requests based on selected project
 * - Filter state management (status, date range, lead)
 * - Only show filters after project is selected
 * - Filter combination with AND logic
 * - ProtectedRoute wrapper
 * - View detail handler (prepared for modal integration)
 * 
 * Requirements: 2.1, 2.3, 6.1, 6.2, 6.6, 14.1, 14.2, 14.3, 14.9
 */
export default function RequestListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { reimbursements, updateReimbursement, loading: reimbursementsLoading, mounted, refetch } = useReimbursements()
  
  // Refresh data when component mounts (for when user returns from upload)
  React.useEffect(() => {
    if (mounted) {
      // Force refresh data from cache or API
      refetch()
    }
  }, []) // Run only on mount
  
  // State management
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    lead: 'all',
  })
  
  // Approval modal state
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showBatchApproveModal, setShowBatchApproveModal] = useState(false)
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState<Reimbursement | null>(null)
  const [pendingSubmitRequests, setPendingSubmitRequests] = useState<Reimbursement[]>([])
  const [pendingBatchApproveRequests, setPendingBatchApproveRequests] = useState<Reimbursement[]>([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approvalComment, setApprovalComment] = useState('')

  // Get unique leads from all reimbursements
  const availableLeads = useMemo(() => {
    const leads = new Set<string>()
    reimbursements.forEach(req => {
      if (req.leadName) {
        leads.add(req.leadName)
      }
    })
    return Array.from(leads).sort()
  }, [reimbursements])

  // Filter requests based on selected project and filters
  const filteredRequests = useMemo(() => {
    if (!selectedProject) return []

    let filtered = reimbursements.filter(req => {
      // Project filter (primary filter)
      return req.project === selectedProject.name
    })

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(req => req.status === filters.status)
    }

    // Apply lead filter (only for finance and head roles)
    if (filters.lead !== 'all' && (user?.role === 'finance' || user?.role === 'head')) {
      filtered = filtered.filter(req => req.leadName === filters.lead)
    }

    // Apply date range filter
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(req => {
        const reqDate = new Date(req.date)
        let dateMatch = true

        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          dateMatch = dateMatch && reqDate >= fromDate
        }

        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo)
          toDate.setHours(23, 59, 59, 999)
          dateMatch = dateMatch && reqDate <= toDate
        }

        return dateMatch
      })
    }

    return filtered
  }, [reimbursements, selectedProject, filters, user])

  // Handle project selection
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    // Reset filters when changing project
    setFilters({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      lead: 'all',
    })
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      lead: 'all',
    })
  }

  // Check if any filters are active
  const hasActiveFilters = filters.status !== 'all' || 
                          filters.dateFrom !== '' || 
                          filters.dateTo !== '' || 
                          filters.lead !== 'all'

  // Handle add request - open modal with selected project
  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  // Handle request created - invalidate cache, refresh list and close modal
  const handleRequestCreated = () => {
    // Invalidate cache so new data appears
    invalidateReimbursementsCache()
    // Force refetch data
    refetch()
    // Close modal
    setIsModalOpen(false)
  }

  // Handle view detail (placeholder for modal integration)
  const handleViewDetail = (request: Reimbursement) => {
    // TODO: Open DetailModal (Task 25)
    console.log('View detail clicked for request:', request.id)
  }

  // Handle approve request - show confirmation modal
  const handleApprove = (request: Reimbursement) => {
    setPendingApprovalRequest(request)
    setShowApproveModal(true)
  }

  // Confirm approve
  // New Flow:
  // - Lead approves pending -> becomes approved_by_lead (stays in Lead's approval section for submit)
  // - Head approves submitted_to_head -> becomes approved_by_head (stays in Head's approval section for submit)
  // - Finance approves submitted_to_finance -> becomes approved_by_finance (finished)
  const confirmApprove = () => {
    if (!pendingApprovalRequest || !user) return
    
    const approval = {
      approved: true,
      by: user.name,
      date: new Date().toISOString(),
      comment: approvalComment
    }
    
    let newStatus: ReimbursementStatus = pendingApprovalRequest.status
    const newApprovals = { ...pendingApprovalRequest.approvals }
    
    if (user.role === 'lead') {
      newApprovals.lead = approval
      newStatus = 'approved_by_lead'
    } else if (user.role === 'head') {
      newApprovals.head = approval
      newStatus = 'approved_by_head'
    } else if (user.role === 'finance') {
      newApprovals.finance = approval
      newStatus = 'approved_by_finance'
    }
    
    updateReimbursement(pendingApprovalRequest.id, {
      status: newStatus,
      approvals: newApprovals
    })
    
    setShowApproveModal(false)
    setPendingApprovalRequest(null)
    setApprovalComment('')
  }

  // Handle reject request - show rejection modal
  const handleReject = (request: Reimbursement) => {
    setPendingApprovalRequest(request)
    setShowRejectModal(true)
  }

  // Confirm reject
  const confirmReject = () => {
    if (!pendingApprovalRequest || !user || !rejectReason.trim()) return
    
    const rejection = {
      approved: false,
      by: user.name,
      date: new Date().toISOString(),
      comment: rejectReason
    }
    
    const newApprovals = { ...pendingApprovalRequest.approvals }
    
    if (user.role === 'lead') {
      newApprovals.lead = rejection
    } else if (user.role === 'head') {
      newApprovals.head = rejection
    } else if (user.role === 'finance') {
      newApprovals.finance = rejection
    }
    
    updateReimbursement(pendingApprovalRequest.id, {
      status: 'rejected',
      rejectionReason: rejectReason,
      approvals: newApprovals
    })
    
    setShowRejectModal(false)
    setPendingApprovalRequest(null)
    setRejectReason('')
  }

  // Handle batch submit - Show confirmation modal first
  const handleBatchSubmit = (requests: Reimbursement[]) => {
    if (!user || requests.length === 0) return
    setPendingSubmitRequests(requests)
    setShowSubmitModal(true)
  }

  // Handle batch approve - Show confirmation modal first
  const handleBatchApprove = (requests: Reimbursement[]) => {
    if (!user || requests.length === 0) return
    setPendingBatchApproveRequests(requests)
    setShowBatchApproveModal(true)
  }

  // Confirm batch approve
  const confirmBatchApprove = async () => {
    if (!user || pendingBatchApproveRequests.length === 0) return
    
    setIsBatchProcessing(true)
    try {
      const ids = pendingBatchApproveRequests.map(r => r.id)
      const role = user.role
      
      let newStatus: ReimbursementStatus = 'pending'
      if (role === 'lead') newStatus = 'approved_by_lead'
      else if (role === 'head') newStatus = 'approved_by_head'
      else if (role === 'finance') newStatus = 'approved_by_finance'

      const response = await fetch('/api/reimbursements/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'approve',
          ids,
          data: {
            status: newStatus,
            approvals: {
              [role]: {
                approved: true,
                by: user.name,
                date: new Date().toISOString(),
                comment: 'Batch approved'
              }
            }
          }
        })
      })

      if (response.ok) {
        refetch()
        setShowBatchApproveModal(false)
        setPendingBatchApproveRequests([])
      } else {
        const errorData = await response.json()
        alert(`Batch approval failed: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Batch approval error:', error)
      alert('An unexpected error occurred during batch approval')
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Confirm batch submit - Lead submits to Head, Head submits to Finance
  const confirmBatchSubmit = () => {
    if (!user || pendingSubmitRequests.length === 0) return
    
    pendingSubmitRequests.forEach(request => {
      const approvalDate = new Date().toISOString()
      let newStatus: ReimbursementStatus = request.status
      const newApprovals = { ...request.approvals }
      
      if (user.role === 'lead' && request.status === 'approved_by_lead') {
        // Lead submits to head
        if (newApprovals.lead) {
          newApprovals.lead = {
            ...newApprovals.lead,
            submittedToHead: true,
            submittedDate: approvalDate
          }
        }
        newStatus = 'submitted_to_head'
      } else if (user.role === 'head' && request.status === 'approved_by_head') {
        // Head submits to finance
        if (newApprovals.head) {
          newApprovals.head = {
            ...newApprovals.head,
            submittedToFinance: true,
            submittedDate: approvalDate
          }
        }
        newStatus = 'submitted_to_finance'
      }
      
      if (newStatus !== request.status) {
        updateReimbursement(request.id, {
          status: newStatus,
          approvals: newApprovals
        })
      }
    })
    
    setShowSubmitModal(false)
    setPendingSubmitRequests([])
  }

  // Don't render until mounted
  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        {/* Left Panel - Project List */}
        <ProjectPanel
          selectedProject={selectedProject}
          onSelectProject={handleProjectSelect}
        />

        {/* Right Panel - Request List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with Add Request button - Always visible */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-background">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedProject ? selectedProject.name : 'Requests'}
              </h2>
              {selectedProject && (
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            <Button
              onClick={handleOpenModal}
              className="gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Request
            </Button>
          </div>

          {/* Filters Section - Only show when project is selected */}
          {selectedProject && (
            <div className="border-b border-border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Filters</span>
                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearFilters}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Status Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved_by_lead">Approved by Lead</SelectItem>
                      <SelectItem value="submitted_to_head">Submitted to Head</SelectItem>
                      <SelectItem value="approved_by_head">Approved by Head</SelectItem>
                      <SelectItem value="submitted_to_finance">Submitted to Finance</SelectItem>
                      <SelectItem value="approved_by_finance">Approved by Finance</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date From
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Date To Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date To
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Lead Filter - Only for finance and head */}
                {(user.role === 'finance' || user.role === 'head') && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Lead</Label>
                    <Select 
                      value={filters.lead} 
                      onValueChange={(value) => handleFilterChange('lead', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        {availableLeads.map(lead => (
                          <SelectItem key={lead} value={lead}>
                            {lead}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Active filters:</span>
                  {filters.status !== 'all' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Status: {filters.status.replace(/_/g, ' ')}
                    </span>
                  )}
                  {filters.dateFrom && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      From: {new Date(filters.dateFrom).toLocaleDateString('id-ID')}
                    </span>
                  )}
                  {filters.dateTo && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      To: {new Date(filters.dateTo).toLocaleDateString('id-ID')}
                    </span>
                  )}
                  {filters.lead !== 'all' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Lead: {filters.lead}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Request Panel */}
          <RequestPanel
            selectedProject={selectedProject}
            requests={filteredRequests}
            loading={reimbursementsLoading}
            onAddRequest={handleOpenModal}
            onViewDetail={handleViewDetail}
            onApprove={handleApprove}
            onReject={handleReject}
            onBatchSubmit={handleBatchSubmit}
            onBatchApprove={handleBatchApprove}
          />
        </div>

        {/* Request Modal */}
        <RequestModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleRequestCreated}
          initialProject={selectedProject?.name}
        />

        {/* Batch Approve Confirmation Modal */}
        {showBatchApproveModal && pendingBatchApproveRequests.length > 0 && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowBatchApproveModal(false)}
          >
            <motion.div
              className="bg-background border border-border rounded-lg p-6 max-w-lg w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                Konfirmasi Batch Approve
              </h3>
              <p className="text-muted-foreground mb-4">
                Apakah Anda yakin ingin approve {pendingBatchApproveRequests.length} reimbursement sekaligus?
              </p>
              <div className="space-y-3 mb-6 p-4 bg-muted/50 rounded-lg max-h-60 overflow-y-auto">
                {pendingBatchApproveRequests.map((req, index) => (
                  <div key={req.id} className="grid grid-cols-2 gap-3 text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <span className="text-muted-foreground">#{index + 1} - </span>
                      <span className="font-medium">{req.employeeName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">Rp {req.amount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total ({pendingBatchApproveRequests.length} request)</span>
                    <span>Rp {pendingBatchApproveRequests.reduce((sum, r) => sum + r.amount, 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowBatchApproveModal(false)} className="flex-1">
                  Batal
                </Button>
                <Button
                  variant="default"
                  onClick={confirmBatchApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isBatchProcessing}
                >
                  {isBatchProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Ya, Approve Semua
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Approve Confirmation Modal */}
        {showApproveModal && pendingApprovalRequest && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowApproveModal(false)}
          >
            <motion.div
              className="bg-background border border-border rounded-lg p-6 max-w-lg w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                Konfirmasi Approve
              </h3>
              <p className="text-muted-foreground mb-4">
                Apakah Anda yakin ingin approve reimbursement ini?
              </p>
              <div className="space-y-3 mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Request ID:</span>
                    <p className="font-medium">{pendingApprovalRequest.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nama:</span>
                    <p className="font-medium">{pendingApprovalRequest.employeeName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-medium">Rp {pendingApprovalRequest.amount.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Project:</span>
                    <p className="font-medium">{pendingApprovalRequest.project}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <Label>Comment (Optional)</Label>
                <Input
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Add a comment..."
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowApproveModal(false)} className="flex-1">
                  Tidak
                </Button>
                <Button
                  variant="default"
                  onClick={confirmApprove}
                  className="flex-1"
                >
                  Ya, Approve
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Reject Confirmation Modal */}
        {showRejectModal && pendingApprovalRequest && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              className="bg-background border border-border rounded-lg p-6 max-w-lg w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                Konfirmasi Reject
              </h3>
              <p className="text-muted-foreground mb-4">
                Apakah Anda yakin ingin reject reimbursement ini?
              </p>
              <div className="space-y-3 mb-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Request ID:</span>
                    <p className="font-medium">{pendingApprovalRequest.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nama:</span>
                    <p className="font-medium">{pendingApprovalRequest.employeeName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-medium">Rp {pendingApprovalRequest.amount.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Project:</span>
                    <p className="font-medium">{pendingApprovalRequest.project}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <Label>Alasan Penolakan <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Masukkan alasan penolakan..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">
                  Tidak
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1"
                >
                  Ya, Reject
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitModal && pendingSubmitRequests.length > 0 && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              className="bg-background border border-border rounded-lg p-6 max-w-lg w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Send className="w-6 h-6 text-blue-500" />
                Konfirmasi Submit to {user?.role === 'lead' ? 'Head' : 'Finance'}
              </h3>
              <p className="text-muted-foreground mb-4">
                Apakah Anda yakin ingin submit {pendingSubmitRequests.length} reimbursement ke {user?.role === 'lead' ? 'Head' : 'Finance'}?
              </p>
              <div className="space-y-3 mb-6 p-4 bg-muted/50 rounded-lg max-h-60 overflow-y-auto">
                {pendingSubmitRequests.map((req, index) => (
                  <div key={req.id} className="grid grid-cols-2 gap-3 text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <span className="text-muted-foreground">#{index + 1} - </span>
                      <span className="font-medium">{req.employeeName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">Rp {req.amount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total ({pendingSubmitRequests.length} request)</span>
                    <span>Rp {pendingSubmitRequests.reduce((sum, r) => sum + r.amount, 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSubmitModal(false)} className="flex-1">
                  Batal
                </Button>
                <Button
                  variant="default"
                  onClick={confirmBatchSubmit}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Ya, Submit
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </ProtectedRoute>
  )
}
