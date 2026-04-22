'use client'

import React, { useState, useMemo } from 'react'
import { ApprovalTable } from '@/components/ApprovalTable'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Reimbursement, ReimbursementStatus } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'
import { useReimbursements, invalidateReimbursementsCache } from '@/lib/hooks/useReimbursements'
import { Button } from '@/components/ui/button'
import { Filter, X, AlertCircle, Search, CheckCircle, Send, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { reimbursements, updateReimbursement, mounted } = useReimbursements()
  
  const [comment, setComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState<Reimbursement | null>(null)
  const [pendingSubmitRequests, setPendingSubmitRequests] = useState<Reimbursement[]>([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  
  // Filters
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Get pending requests based on user role
  // NEW FLOW:
  // - Lead sees approved_by_lead requests (their approved requests) to submit to Head
  // - Head sees approved_by_head requests (their approved requests) to submit to Finance  
  // - Finance sees submitted_to_finance requests to approve (final)
  const pendingRequests = useMemo(() => {
    if (!user || !mounted) return []
    
    const role = user.role
    
    if (role === 'lead') {
      // Lead sees their approved requests that need to be submitted to head
      return reimbursements.filter(req => {
        // Only show requests from their team members that they have approved
        return req.leadId === user.id &&
               req.status === 'approved_by_lead' && 
               req.approvals?.lead?.approved &&
               !req.approvals?.lead?.submittedToHead
      })
    }
    
    if (role === 'head') {
      // Head sees their approved requests that need to be submitted to finance
      return reimbursements.filter(req => {
        return req.status === 'approved_by_head' && 
               req.approvals?.head?.approved &&
               !req.approvals?.head?.submittedToFinance
      })
    }
    
    if (role === 'finance') {
      // Finance sees requests that have been submitted to finance for final approval
      return reimbursements.filter(req => {
        return req.status === 'submitted_to_finance' &&
               !req.approvals?.finance?.approved
      })
    }
    
    return []
  }, [reimbursements, user, mounted])

  // Apply filters
  const filteredRequests = useMemo(() => {
    return pendingRequests.filter(req => {
      const matchesProject = projectFilter === 'all' || req.project === projectFilter
      const matchesSearch = searchTerm === '' || 
        req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      let matchesDate = true
      if (dateFrom) {
        matchesDate = matchesDate && new Date(req.date) >= new Date(dateFrom)
      }
      if (dateTo) {
        matchesDate = matchesDate && new Date(req.date) <= new Date(dateTo)
      }
      
      return matchesProject && matchesSearch && matchesDate
    })
  }, [pendingRequests, projectFilter, searchTerm, dateFrom, dateTo])

  // Get unique projects
  const projects = useMemo(() => {
    const projectSet = new Set<string>()
    reimbursements.forEach(req => {
      if (req.project) projectSet.add(req.project)
    })
    return Array.from(projectSet)
  }, [reimbursements])

  // Handle approve - only for Finance on this page
  // Lead and Head use this page to SUBMIT, not approve
  const handleApprove = async (request: Reimbursement) => {
    if (user?.role === 'finance') {
      setPendingApprovalRequest(request)
      setShowApproveModal(true)
    }
  }

  const confirmApprove = () => {
    if (!pendingApprovalRequest || !user) return
    
    const approval = {
      approved: true,
      by: user.name,
      date: new Date().toISOString(),
      comment: comment
    }
    
    // Only finance can approve on this page
    if (user.role === 'finance') {
      const newApprovals = { ...pendingApprovalRequest.approvals }
      newApprovals.finance = approval
      
      updateReimbursement(pendingApprovalRequest.id, {
        status: 'approved_by_finance',
        approvals: newApprovals
      })
    }
    
    setShowApproveModal(false)
    setPendingApprovalRequest(null)
    setComment('')
  }

  // Handle batch submit - Show confirmation modal first
  const handleBatchSubmit = (requests: Reimbursement[]) => {
    if (!user || requests.length === 0) return
    setPendingSubmitRequests(requests)
    setShowSubmitModal(true)
  }

  // Handle single submit - Show confirmation modal for single request
  const handleSubmitSingle = (request: Reimbursement) => {
    if (!user) return
    setPendingSubmitRequests([request])
    setShowSubmitModal(true)
  }

  // Confirm batch submit - Lead submits to Head, Head submits to Finance
  const confirmBatchSubmit = async () => {
    if (!user || pendingSubmitRequests.length === 0) return
    
    setIsBatchProcessing(true)
    try {
      const ids = pendingSubmitRequests.map(r => r.id)
      const role = user.role
      const approvalDate = new Date().toISOString()
      
      // Prepare batch data based on role
      let batchData: any = {
        status: '',
        approvals: {}
      }

      if (role === 'lead') {
        batchData.status = 'submitted_to_head'
        batchData.approvals = {
          lead: {
            approved: true,
            by: user.name,
            date: approvalDate,
            submittedToHead: true,
            submittedDate: approvalDate
          }
        }
      } else if (role === 'head') {
        batchData.status = 'submitted_to_finance'
        batchData.approvals = {
          head: {
            approved: true,
            by: user.name,
            date: approvalDate,
            submittedToFinance: true,
            submittedDate: approvalDate
          }
        }
      } else if (role === 'finance') {
        batchData.status = 'approved_by_finance'
        batchData.approvals = {
          finance: {
            approved: true,
            by: user.name,
            date: approvalDate,
            comment: 'Batch approved'
          }
        }
      }

      const response = await fetch('/api/reimbursements/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'approve',
          ids,
          data: batchData
        })
      })

      if (response.ok) {
        // Invalidate cache and force refresh
        invalidateReimbursementsCache()
        window.location.reload()
      } else {
        const errorData = await response.json()
        alert(`Batch operation failed: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Batch operation error:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsBatchProcessing(false)
      setShowSubmitModal(false)
      setPendingSubmitRequests([])
    }
  }

  // Handle reject
  const handleReject = (request: Reimbursement) => {
    setPendingApprovalRequest(request)
    setShowRejectModal(true)
  }

  const confirmReject = () => {
    if (!pendingApprovalRequest || !user || !rejectReason.trim()) return
    
    const rejection = {
      approved: false,
      by: user.name,
      date: new Date().toISOString(),
      comment: rejectReason
    }
    
    const newApprovals = { ...pendingApprovalRequest.approvals }
    
    if (user.role === 'head') {
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

  // Handle view detail - now handled by expandable row in table
  const handleViewDetail = (request: Reimbursement) => {
    // Detail is shown in expandable row, no modal needed
    console.log('View detail clicked for request:', request.id)
  }

  // Clear filters
  const clearFilters = () => {
    setProjectFilter('all')
    setSearchTerm('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <ProtectedRoute requiredRoles={['finance', 'head', 'lead']}>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Approval Management</h1>
            <p className="text-muted-foreground mt-2">
              Review and approve reimbursement requests ({filteredRequests.length} pending)
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
                {(projectFilter !== 'all' || searchTerm || dateFrom || dateTo) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearFilters}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Project Filter */}
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Table */}
          <ApprovalTable
            requests={filteredRequests}
            onViewDetail={handleViewDetail}
            onApprove={handleApprove}
            onReject={handleReject}
            onBatchSubmit={handleBatchSubmit}
            onSubmitSingle={handleSubmitSingle}
            loading={!mounted}
          />

          {/* Approve Modal */}
          {showApproveModal && pendingApprovalRequest && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowApproveModal(false)}
            >
              <motion.div
                className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">Approve Request</h3>
                <p className="text-muted-foreground mb-4">
                  Are you sure you want to approve this request?
                </p>
                <div className="space-y-2 mb-4">
                  <Label>Comment (Optional)</Label>
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowApproveModal(false)} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmApprove}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Reject Modal */}
          {showRejectModal && pendingApprovalRequest && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowRejectModal(false)}
            >
              <motion.div
                className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  Reject Request
                </h3>
                <p className="text-muted-foreground mb-4">
                  Please provide a reason for rejecting this request.
                </p>
                <div className="space-y-2 mb-4">
                  <Label>Rejection Reason *</Label>
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRejectModal(false)} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmReject}
                    disabled={!rejectReason}
                    className="flex-1"
                  >
                    Reject
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
                  Konfirmasi Submit to {user?.role === 'lead' ? 'Head' : user?.role === 'head' ? 'Finance' : 'Approve'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {user?.role === 'finance' 
                    ? `Apakah Anda yakin ingin approve ${pendingSubmitRequests.length} reimbursement?`
                    : `Apakah Anda yakin ingin submit ${pendingSubmitRequests.length} reimbursement ke ${user?.role === 'lead' ? 'Head' : 'Finance'}?`
                  }
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
                    disabled={isBatchProcessing}
                  >
                    {isBatchProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : user?.role === 'finance' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Ya, Approve
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Ya, Submit
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
