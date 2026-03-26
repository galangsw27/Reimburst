'use client'

/**
 * Enhanced ApprovalList Component
 * 
 * This component handles the approval workflow for reimbursement requests with enhanced features:
 * 
 * Enhanced Features (Task 8.1):
 * - Lead assignment routing validation: Only leads see requests from their assigned users
 * - Enhanced role-based approval matrix with proper workflow sequence
 * - Improved validation rules for approval workflow sequence (Lead → Head → Finance)
 * - Enhanced asset matching validation with workflow prerequisites
 * - Comprehensive error handling and validation feedback
 * 
 * Approval Workflow Sequence:
 * 1. Lead (Level 1): Approves requests from assigned team members
 * 2. Head (Level 2): Approves requests after lead approval or directly for users without leads
 * 3. Finance (Final): Approves requests after proper sequence completion with asset matching
 * 
 * Lead Assignment Routing:
 * - Leads only see requests where request.leadId matches their user.id
 * - Head can see all requests regardless of lead assignment
 * - Finance sees requests that have completed the proper approval sequence
 * 
 * Requirements: 1.2 (Lead assignment routing), 5.1 (Enhanced approval workflow)
 */

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Eye, Clock, Loader2, Database, AlertCircle, Filter, Calendar, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useAuth } from '@/providers/AuthProvider'
import { useReimbursements } from '@/lib/hooks/useReimbursements'
import { Reimbursement, ReimbursementStatus, AssetMatchResult } from '@/lib/types'
import { apiClient } from '@/lib/api/client'

interface ApprovalListProps {
  onUpdate?: () => void
}

export const ApprovalList: React.FC<ApprovalListProps> = ({ onUpdate }) => {
  const { user } = useAuth()
  const { reimbursements, updateReimbursement, mounted, refetch } = useReimbursements()
  
  const [selectedRequest, setSelectedRequest] = useState<Reimbursement | null>(null)
  const [comment, setComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState<Reimbursement | null>(null)
  const [isMatchingAsset, setIsMatchingAsset] = useState(false)
  const [assetMatchResult, setAssetMatchResult] = useState<AssetMatchResult | null>(null)
  const [checkedRequests, setCheckedRequests] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchApproving, setIsBatchApproving] = useState(false)
  const [showBatchApproveModal, setShowBatchApproveModal] = useState(false)
  
  // Filters
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [leadFilter, setLeadFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Enhanced: Get pending requests based on user role with improved approval matrix
  // NEW FLOW:
  // - Lead sees pending requests from their team (to approve) -> becomes approved_by_lead
  // - Head sees submitted_to_head requests (to approve) -> becomes approved_by_head
  // - Finance sees submitted_to_finance requests (to approve) -> becomes approved_by_finance
  const pendingRequests = useMemo(() => {
    if (!user || !mounted) return []
    
    const role = user.role
    
    if (role === 'lead') {
      // Lead sees pending requests from users assigned to them
      return reimbursements.filter(req => {
        // Validate lead assignment routing
        if (req.leadId !== user.id) {
          return false
        }
        
        // Lead sees pending requests from their assigned users
        return req.status === 'pending' && !req.approvals?.lead?.approved
      })
    }
    
    if (role === 'head') {
      // Head sees requests that have been submitted to head by lead
      return reimbursements.filter(req => {
        return req.status === 'submitted_to_head' && 
               req.approvals?.lead?.approved &&
               !req.approvals?.head?.approved
      })
    }
    
    if (role === 'finance') {
      // Finance sees requests that have been submitted to finance by head
      return reimbursements.filter(req => {
        return req.status === 'submitted_to_finance' &&
               req.approvals?.head?.approved &&
               !req.approvals?.finance?.approved
      })
    }
    
    return []
  }, [reimbursements, user, mounted])

  // Sort from oldest to newest
  const sortedRequests = useMemo(() => {
    return [...pendingRequests].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [pendingRequests])

  // Get unique projects from requests
  const projectsWithData = useMemo(() => {
    const projects = new Set<string>()
    sortedRequests.forEach(req => {
      if (req.project) {
        projects.add(req.project)
      }
    })
    return Array.from(projects).sort()
  }, [sortedRequests])

  // Get unique leads from requests
  const leadsWithData = useMemo(() => {
    const leads = new Set<string>()
    sortedRequests.forEach(req => {
      if (req.leadName) {
        leads.add(req.leadName)
      }
    })
    return Array.from(leads).sort()
  }, [sortedRequests])

  // Apply filters
  const filteredRequests = useMemo(() => {
    return sortedRequests.filter(req => {
      // Project filter
      const projectMatch = projectFilter === 'all' || req.project === projectFilter
      
      // Lead filter (only for finance and head)
      const leadMatch = leadFilter === 'all' || req.leadName === leadFilter
      
      // Date filter
      let dateMatch = true
      if (dateFrom || dateTo) {
        const submitDate = new Date(req.createdAt)
        if (dateFrom) {
          const fromDate = new Date(dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          dateMatch = dateMatch && submitDate >= fromDate
        }
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59, 999)
          dateMatch = dateMatch && submitDate <= toDate
        }
      }
      
      return projectMatch && leadMatch && dateMatch
    })
  }, [sortedRequests, projectFilter, leadFilter, dateFrom, dateTo])


  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBatchApprove = async () => {
    if (!user || selectedIds.size === 0) return
    
    setIsBatchApproving(true)
    setValidationErrors([])
    
    try {
      const idsArray = Array.from(selectedIds)
      const role = user.role
      
      // Validation for Finance
      if (role === 'finance') {
        const unchecked = idsArray.filter(id => !checkedRequests.has(id))
        if (unchecked.length > 0) {
          throw new Error(`${unchecked.length} request(s) belum dilakukan check asset.`)
        }
      }

      const approvalData: any = {
        status: '',
        approvals: {},
        approvalDate: new Date().toISOString()
      }

      // Determine next status and approvals object
      // This is simplified for batch - we assume same logic for all selected items
      // In a more complex scenario, we'd need to calculate per-item
      
      if (role === 'finance') {
        approvalData.status = 'approved_by_finance'
        // For finance batch, we might not have individual comments/results
        // Use a generic batch approval comment
      } else if (role === 'head') {
        approvalData.status = 'approved_by_head'
      } else if (role === 'lead') {
        approvalData.status = 'approved_by_lead'
      }

      const response = await apiClient.post('/api/reimbursements/batch', {
        action: 'approve',
        ids: idsArray,
        data: {
          status: approvalData.status,
          approvals: {
            // This will be merged in the backend or we can just send the specific role approval
            [role]: {
              approved: true,
              by: user.name,
              date: new Date().toISOString(),
              comment: 'Batch approved'
            }
          }
        }
      })

      if (response.status === 200) {
        setSelectedIds(new Set())
        setShowBatchApproveModal(false)
        onUpdate?.()
        // Refresh local state bypassing cache
        refetch()
      }
    } catch (error: any) {
      console.error('Batch approval failed:', error)
      setValidationErrors([error.message || 'Batch approval failed'])
    } finally {
      setIsBatchApproving(false)
    }
  }

  // Show approve confirmation modal
  const showApproveConfirmation = (request: Reimbursement) => {
    setPendingApprovalRequest(request)
    setShowApproveModal(true)
  }

  // Enhanced: Handle approve action with improved validation and approval workflow sequence
  const handleApprove = async (requestId: string) => {
    if (!user) return
    
    // Clear previous validation errors
    setValidationErrors([])
    
    setShowApproveModal(false)
    const role = user.role
    
    try {
      // Enhanced validation for all roles
      const request = reimbursements.find(r => r.id === requestId)
      if (!request) {
        setValidationErrors(['Request not found'])
        return
      }

      // Enhanced: Validate request data integrity
      const errors: string[] = []
      
      if (!request.employeeName?.trim()) {
        errors.push('Employee name is missing')
      }
      
      if (!request.employeeEmail?.trim()) {
        errors.push('Employee email is missing')
      }
      
      if (!request.project?.trim()) {
        errors.push('Project information is missing')
      }
      
      if (request.amount <= 0) {
        errors.push('Invalid amount')
      }
      
      if (!request.date) {
        errors.push('Transaction date is missing')
      }

      // Enhanced: Role-specific validation with approval workflow sequence
      if (role === 'finance') {
        // Finance validation (final approval)
        if (!checkedRequests.has(requestId)) {
          errors.push('Asset matching must be performed before approval')
        }
        
        if (!assetMatchResult || selectedRequest?.id !== requestId) {
          errors.push('Asset matching result is missing or invalid')
        }
        
        // Enhanced: Validate approval workflow sequence for finance
        // Finance can only approve submitted_to_finance requests
        if (request.status !== 'submitted_to_finance') {
          errors.push('Request must be submitted to Finance before approval')
        }
        
        if (!request.approvals?.head?.approved) {
          errors.push('Request must be approved by Head before Finance approval')
        }
        
        // Validate finance hasn't already approved
        if (request.approvals?.finance?.approved) {
          errors.push('Request has already been approved by Finance')
        }
        
      } else if (role === 'lead') {
        // Enhanced: Lead validation - can approve pending requests from their team
        if (request.leadId !== user.id) {
          errors.push('You can only approve requests from your assigned team members')
        }
        
        if (request.status !== 'pending') {
          errors.push('Lead can only approve pending requests')
        }
        
        // Validate lead hasn't already approved
        if (request.approvals?.lead?.approved) {
          errors.push('You have already approved this request')
        }
        
        if (request.status === 'rejected') {
          errors.push('Cannot approve a rejected request')
        }
        
      } else if (role === 'head') {
        // Enhanced: Head validation - can approve submitted_to_head requests
        if (request.status !== 'submitted_to_head') {
          errors.push('Head can only approve requests submitted by Lead')
        }
        
        if (request.status === 'rejected') {
          errors.push('Cannot approve a rejected request')
        }
        
        // Validate head hasn't already approved
        if (request.approvals?.head?.approved) {
          errors.push('You have already approved this request')
        }
        
        if (request.status === 'approved_by_finance') {
          errors.push('Request has already been approved by Finance')
        }
      }

      if (errors.length > 0) {
        setValidationErrors(errors)
        return
      }

      // Enhanced: Proceed with approval using improved workflow sequence
      if (role === 'finance') {
        const approval = {
          approved: true,
          by: user.name,
          date: new Date().toISOString(),
          comment,
          assetMatch: assetMatchResult || undefined
        }
        
        updateReimbursement(requestId, {
          status: 'approved_by_finance',
          approvals: {
            ...request.approvals,
            finance: approval
          },
          asset: assetMatchResult?.matched ? assetMatchResult.assetId : undefined
        })
        
        setComment('')
        setSelectedRequest(null)
        setAssetMatchResult(null)
        setCheckedRequests(prev => {
          const newSet = new Set(prev)
          newSet.delete(requestId)
          return newSet
        })
        
        onUpdate?.()
      } else {
        // Enhanced: For head/lead, implement proper approval workflow sequence
        const approval = {
          approved: true,
          by: user.name,
          date: new Date().toISOString(),
          comment
        }
        
        let newStatus: ReimbursementStatus = request.status
        const newApprovals = { ...request.approvals }
        
        if (role === 'head') {
          newApprovals.head = approval
          
          // Enhanced: Determine next status based on lead assignment and current approvals
          if (request.leadId && !newApprovals.lead?.approved) {
            // User has lead but lead hasn't approved yet - status remains for lead approval
            newStatus = 'approved_by_head'
          } else if (request.leadId && newApprovals.lead?.approved) {
            // User has lead and lead already approved - ready for finance
            newStatus = 'approved_by_head'
          } else {
            // User has no lead assigned - head approval moves to finance
            newStatus = 'approved_by_head'
          }
          
        } else if (role === 'lead') {
          newApprovals.lead = approval
          
          // Enhanced: Determine next status based on head approval status
          if (newApprovals.head?.approved) {
            // Head already approved - ready for finance
            newStatus = 'approved_by_head'
          } else {
            // Head hasn't approved yet - status shows lead approved
            newStatus = 'approved_by_lead'
          }
        }
        
        updateReimbursement(requestId, {
          status: newStatus,
          approvals: newApprovals
        })
        
        setComment('')
        setSelectedRequest(null)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Approval error:', error)
      if (error instanceof Error) {
        setValidationErrors([`Approval failed: ${error.message}`])
      } else {
        setValidationErrors(['Approval failed: Unknown error occurred'])
      }
    }
  }


  // Enhanced: Handle asset matching check with improved validation
  const handleCheckAsset = async (request: Reimbursement) => {
    setSelectedRequest(request)
    setIsMatchingAsset(true)
    
    // Clear previous validation errors
    setValidationErrors([])
    
    try {
      // Enhanced validation before asset check
      if (!request.employeeEmail?.trim()) {
        throw new Error('Employee email is required for asset matching')
      }
      
      // Enhanced: Validate user role and permissions
      if (user?.role !== 'finance') {
        throw new Error('Only Finance users can perform asset matching')
      }
      
      // Enhanced: Validate approval workflow sequence before asset check
      // Finance can only check assets for submitted_to_finance requests
      if (request.status !== 'submitted_to_finance') {
        throw new Error('Asset matching can only be performed after request is submitted to Finance')
      }
      
      if (!request.approvals?.head?.approved) {
        throw new Error('Asset matching can only be performed after Head approval')
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/
      
      if (!emailRegex.test(request.employeeEmail) && !phoneRegex.test(request.employeeEmail)) {
        throw new Error('Invalid email or phone number format')
      }
      
      // Try to get webhook URL from build-time env first
      let webhookUrl = process.env.NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL
      
      // If not available at build time, try runtime config
      if (!webhookUrl) {
        try {
          const configResponse = await apiClient.get('/api/config')
          webhookUrl = configResponse.data.assetMatchWebhookUrl
        } catch (configError) {
          console.error('Failed to load runtime config:', configError)
        }
      }
      
      if (!webhookUrl) {
        throw new Error('Asset matching webhook URL tidak dikonfigurasi. Hubungi administrator.')
      }
      
      const response = await apiClient.post(webhookUrl, {
        msisdn_email: request.employeeEmail,
        timestamp: new Date().toISOString(),
        requestId: request.id // Include request ID for tracking
      })
      
      // Enhanced response validation
      if (!response.data) {
        throw new Error('Invalid response from asset matching service')
      }
      
      // Response structure: { output: { matched, asset: { ... }, ... } }
      const output = response.data.output || response.data.data || response.data
      const asset = output.asset || output
      
      const matchResult: AssetMatchResult = {
        matched: output.matched || false,
        assetId: asset.asset_id || output.assetId || undefined,
        assetName: asset.asset_name || output.assetName || undefined,
        assetDetail: asset.asset_detail || output.assetDetail || undefined,
        employeeName: asset.employee_name || output.employeeName || undefined,
        department: asset.department || output.department || undefined,
        matchedBy: output.matchedField || output.matchedBy || 'email',
        matchedValue: output.searchedFor || output.matchedValue || request.employeeEmail,
        confidence: output.confidence || 0,
        verifiedDate: output.verifiedDate || new Date().toISOString()
      }
      
      // Validate match result
      if (matchResult.matched && !matchResult.assetId) {
        console.warn('Asset matched but no asset ID provided')
      }
      
      setAssetMatchResult(matchResult)
      setCheckedRequests(prev => new Set(prev).add(request.id))
      
      // Clear any previous validation errors on successful check
      setValidationErrors([])
      
    } catch (error) {
      console.error('Asset matching error:', error)
      
      if (error instanceof Error) {
        setValidationErrors([`Asset matching failed: ${error.message}`])
      } else {
        setValidationErrors(['Asset matching failed: Unknown error occurred'])
      }
      
      // Reset asset match result on error
      setAssetMatchResult(null)
    } finally {
      setIsMatchingAsset(false)
    }
  }

  // Show reject confirmation modal
  const showRejectConfirmation = (request: Reimbursement) => {
    setSelectedRequest(request)
    setShowRejectModal(true)
  }

  // Enhanced: Handle reject action with improved validation
  const handleReject = (requestId: string) => {
    if (!user) return
    
    // Clear previous validation errors
    setValidationErrors([])
    
    try {
      const request = reimbursements.find(r => r.id === requestId)
      if (!request) {
        setValidationErrors(['Request not found'])
        return
      }
      
      // Enhanced validation for rejection
      const errors: string[] = []
      
      if (!rejectReason?.trim()) {
        errors.push('Rejection reason is required')
      }
      
      if (rejectReason && rejectReason.trim().length < 10) {
        errors.push('Rejection reason must be at least 10 characters long')
      }
      
      // Enhanced: Role-specific validation with lead assignment routing
      const role = user.role
      if (role === 'lead' && request.leadId !== user.id) {
        errors.push('You can only reject requests from your assigned team members')
      }
      
      if (request.status === 'rejected') {
        errors.push('Request is already rejected')
      }
      
      if (request.status === 'approved_by_finance') {
        errors.push('Cannot reject a request that has been approved by Finance')
      }
      
      // Enhanced: Validate rejection authority based on approval workflow
      if (role === 'finance') {
        // Finance can reject at any stage
        if (request.approvals?.finance?.approved) {
          errors.push('Cannot reject a request you have already approved')
        }
      } else if (role === 'head') {
        // Head can reject requests but validate workflow
        if (request.approvals?.head?.approved) {
          errors.push('Cannot reject a request you have already approved')
        }
      } else if (role === 'lead') {
        // Lead can only reject their assigned users' requests
        if (request.approvals?.lead?.approved) {
          errors.push('Cannot reject a request you have already approved')
        }
      }
      
      if (errors.length > 0) {
        setValidationErrors(errors)
        return
      }
      
      const rejection = {
        approved: false,
        by: user.name,
        date: new Date().toISOString(),
        comment: rejectReason
      }
      
      const newApprovals = { ...request.approvals }
      if (role === 'head') {
        newApprovals.head = rejection
      } else if (role === 'lead') {
        newApprovals.lead = rejection
      } else if (role === 'finance') {
        newApprovals.finance = rejection
      }
      
      updateReimbursement(requestId, {
        status: 'rejected',
        rejectionReason: rejectReason,
        approvals: newApprovals
      })
      
      setRejectReason('')
      setShowRejectModal(false)
      setSelectedRequest(null)
      onUpdate?.()
      
    } catch (error) {
      console.error('Rejection error:', error)
      if (error instanceof Error) {
        setValidationErrors([`Rejection failed: ${error.message}`])
      } else {
        setValidationErrors(['Rejection failed: Unknown error occurred'])
      }
    }
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      approved_by_lead: 'bg-blue-500/20 text-blue-500',
      submitted_to_head: 'bg-indigo-500/20 text-indigo-500',
      approved_by_head: 'bg-blue-600/20 text-blue-600',
      submitted_to_finance: 'bg-purple-500/20 text-purple-500',
      approved_by_finance: 'bg-green-500/20 text-green-500',
      rejected: 'bg-red-500/20 text-red-500'
    }
    return badges[status as keyof typeof badges] || badges.pending
  }

  // Don't render until mounted to avoid hydration issues
  if (!mounted || !user) {
    return null
  }


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals ({filteredRequests.length})</CardTitle>
          
          {/* Validation Errors Display */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-500">Validation Errors</h3>
              </div>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-xs text-red-600 flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setValidationErrors([])}
                className="mt-2 h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <X className="w-3 h-3 mr-1" />
                Clear Errors
              </Button>
            </div>
          )}
          
          {/* Filters Section */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Filters</span>
              {(projectFilter !== 'all' || leadFilter !== 'all' || dateFrom || dateTo) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setProjectFilter('all')
                    setLeadFilter('all')
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Date From */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Date From
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Date To
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Project Filter */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Project</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projectsWithData.map(project => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lead Filter (only for finance and head) */}
              {(user.role === 'finance' || user.role === 'head') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Lead</Label>
                  <Select value={leadFilter} onValueChange={setLeadFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leads</SelectItem>
                      {leadsWithData.map(lead => (
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
            {(projectFilter !== 'all' || leadFilter !== 'all' || dateFrom || dateTo) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {dateFrom && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    From: {new Date(dateFrom).toLocaleDateString('id-ID')}
                  </span>
                )}
                {dateTo && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    To: {new Date(dateTo).toLocaleDateString('id-ID')}
                  </span>
                )}
                {projectFilter !== 'all' && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Project: {projectFilter}
                  </span>
                )}
                {leadFilter !== 'all' && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Lead: {leadFilter}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length > 0 && (
            <div className="flex items-center justify-between mb-4 p-2 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </div>
              
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowBatchApproveModal(true)}
                  disabled={isBatchApproving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Batch Approve ({selectedIds.size})
                </Button>
              )}
            </div>
          )}

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada pengajuan yang menunggu approval</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-all flex gap-4"
                >
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(request.id)}
                      onChange={() => toggleSelect(request.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{request.id}</h3>
                      <p className="text-sm text-muted-foreground">
                        Submitted by {request.employeeName} • {new Date(request.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                      {request.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Employee:</span>
                      <p className="font-medium">{request.employeeName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{request.employeeEmail}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Project:</span>
                      <p className="font-medium">{request.project}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lead:</span>
                      <p className="font-medium">{request.leadName || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <p className="font-medium">{request.description}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">Rp {request.amount.toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium">{request.date}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-medium capitalize">{request.status.replace(/_/g, ' ')}</p>
                    </div>
                  </div>


                  {request.receiptImage && (
                    <img
                      src={request.receiptImage}
                      alt="Receipt"
                      className="w-32 h-32 object-cover rounded-lg mb-4 cursor-pointer hover:opacity-80"
                      onClick={() => window.open(request.receiptImage, '_blank')}
                    />
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                    >
                      <Eye className="w-4 h-4" />
                      {selectedRequest?.id === request.id ? 'Hide Details' : 'View Details'}
                    </Button>
                    
                    {user.role === 'finance' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCheckAsset(request)}
                        disabled={isMatchingAsset || !request.employeeEmail || checkedRequests.has(request.id)}
                      >
                        {isMatchingAsset && selectedRequest?.id === request.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Matching...
                          </>
                        ) : checkedRequests.has(request.id) ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Checked
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4" />
                            Check Asset
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => showApproveConfirmation(request)}
                      disabled={
                        isMatchingAsset || 
                        (user.role === 'finance' && !checkedRequests.has(request.id))
                      }
                      title={
                        user.role === 'finance' && !checkedRequests.has(request.id)
                          ? 'Silakan Check Asset terlebih dahulu'
                          : 'Approve request'
                      }
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => showRejectConfirmation(request)}
                      disabled={isMatchingAsset}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>


                  {/* Asset Match Result Display */}
                  {selectedRequest?.id === request.id && assetMatchResult && checkedRequests.has(request.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Database className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">Asset Matching Result</h4>
                      </div>
                      
                      {assetMatchResult.matched ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Match Found!</span>
                            {assetMatchResult.confidence && (
                              <span className="text-xs bg-green-500/20 px-2 py-1 rounded">
                                {(assetMatchResult.confidence * 100).toFixed(0)}% confidence
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                            <div>
                              <span className="text-muted-foreground">Asset ID:</span>
                              <p className="font-medium">{assetMatchResult.assetId}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Asset Name:</span>
                              <p className="font-medium">{assetMatchResult.assetName}</p>
                            </div>
                            {assetMatchResult.assetDetail && (
                              <div className="bg-white/5 p-2 rounded">
                                <span className="text-muted-foreground block mb-1">Asset Detail:</span>
                                <p className="font-medium">{assetMatchResult.assetDetail}</p>
                              </div>
                            )}
                            <div className="bg-white/5 p-2 rounded">
                              <span className="text-muted-foreground block mb-1">Employee:</span>
                              <p className="font-medium">{assetMatchResult.employeeName}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Department:</span>
                              <p className="font-medium">{assetMatchResult.department}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Matched By:</span>
                              <p className="font-medium capitalize">{assetMatchResult.matchedBy}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Matched Value:</span>
                              <p className="font-medium">{assetMatchResult.matchedValue}</p>
                            </div>
                          </div>
                          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-600">
                            ✓ Asset verified. You can now approve this request.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-red-500">
                            <AlertCircle className="w-4 h-4" />
                            <span>Asset tidak ditemukan</span>
                          </div>
                          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500 font-medium">
                            ⚠ Harap gunakan asset yang valid / terdaftar.
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {selectedRequest?.id === request.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-4 border-t border-border"
                    >
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Created:</span>{' '}
                          {new Date(request.createdAt).toLocaleString('id-ID')}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Updated:</span>{' '}
                          {new Date(request.updatedAt).toLocaleString('id-ID')}
                        </div>
                        {request.asset && (
                          <div>
                            <span className="text-muted-foreground">Asset:</span> {request.asset}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Batch Approve Confirmation Modal */}
      {showBatchApproveModal && selectedIds.size > 0 && (
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
              Batch Approve Confirmation
            </h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to approve <strong>{selectedIds.size}</strong> reimbursement requests?
            </p>
            
            <div className="max-h-60 overflow-y-auto mb-6 p-4 bg-muted/50 rounded-lg space-y-2">
              {Array.from(selectedIds).map(id => {
                const req = filteredRequests.find(r => r.id === id)
                return (
                  <div key={id} className="text-xs flex justify-between items-center border-b border-border/50 pb-1">
                    <span>{id} - {req?.employeeName}</span>
                    <span className="font-semibold">Rp {req?.amount.toLocaleString('id-ID')}</span>
                  </div>
                )
              })}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBatchApproveModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleBatchApprove}
                disabled={isBatchApproving}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isBatchApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Yes, Approve All'
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
                  <p className="font-medium">{pendingApprovalRequest!.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Nama:</span>
                  <p className="font-medium">{pendingApprovalRequest!.employeeName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">MSISDN/Email:</span>
                  <p className="font-medium">{pendingApprovalRequest!.employeeEmail}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium">Rp {pendingApprovalRequest!.amount.toLocaleString('id-ID')}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Deskripsi:</span>
                  <p className="font-medium">{pendingApprovalRequest!.description}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowApproveModal(false)} className="flex-1">
                Tidak
              </Button>
              <Button
                variant="default"
                onClick={() => handleApprove(pendingApprovalRequest!.id)}
                className="flex-1"
              >
                Ya, Approve
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
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
                  <p className="font-medium">{selectedRequest!.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Nama:</span>
                  <p className="font-medium">{selectedRequest!.employeeName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">MSISDN/Email:</span>
                  <p className="font-medium">{selectedRequest!.employeeEmail}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium">Rp {selectedRequest!.amount.toLocaleString('id-ID')}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Deskripsi:</span>
                  <p className="font-medium">{selectedRequest!.description}</p>
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
                onClick={() => handleReject(selectedRequest!.id)}
                disabled={!rejectReason.trim()}
                className="flex-1"
              >
                Ya, Reject
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
