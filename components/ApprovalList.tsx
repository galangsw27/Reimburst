'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
import axios from 'axios'

interface ApprovalListProps {
  onUpdate?: () => void
}

export const ApprovalList: React.FC<ApprovalListProps> = ({ onUpdate }) => {
  const { user } = useAuth()
  const { reimbursements, updateReimbursement, mounted } = useReimbursements()
  
  const [selectedRequest, setSelectedRequest] = useState<Reimbursement | null>(null)
  const [comment, setComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [isMatchingAsset, setIsMatchingAsset] = useState(false)
  const [assetMatchResult, setAssetMatchResult] = useState<AssetMatchResult | null>(null)
  const [checkedRequests, setCheckedRequests] = useState<Set<string>>(new Set())
  
  // Filters
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [leadFilter, setLeadFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Get pending requests based on user role
  const pendingRequests = useMemo(() => {
    if (!user || !mounted) return []
    
    const role = user.role
    
    if (role === 'head') {
      // Head sees all pending requests
      return reimbursements.filter(req => 
        req.status === 'pending' || 
        (req.status === 'approved_by_lead' && !req.approvals?.head)
      )
    }
    
    if (role === 'lead') {
      // Lead only sees requests from users assigned to them
      return reimbursements.filter(req => 
        req.leadId === user.id && (
          req.status === 'pending' || 
          (req.status === 'approved_by_head' && !req.approvals?.lead)
        )
      )
    }
    
    if (role === 'finance') {
      // Finance sees requests approved by both head and lead
      return reimbursements.filter(req => 
        (req.status === 'approved_by_head' && req.approvals?.head && req.approvals?.lead) ||
        (req.status === 'approved_by_lead' && req.approvals?.head && req.approvals?.lead)
      )
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


  // Handle approve action
  const handleApprove = async (requestId: string) => {
    if (!user) return
    
    const role = user.role
    
    // For finance, check if asset matching has been done
    if (role === 'finance') {
      if (!checkedRequests.has(requestId)) {
        alert('Silakan lakukan Check Asset terlebih dahulu sebelum approve!')
        return
      }
      
      if (!assetMatchResult || selectedRequest?.id !== requestId) {
        alert('Silakan lakukan Check Asset terlebih dahulu sebelum approve!')
        return
      }
      
      // Approve with asset match result
      const request = reimbursements.find(r => r.id === requestId)
      if (!request) return
      
      const approval = {
        approved: true,
        by: user.name,
        date: new Date().toISOString(),
        comment,
        assetMatch: assetMatchResult
      }
      
      updateReimbursement(requestId, {
        status: 'approved_by_finance',
        approvals: {
          ...request.approvals,
          finance: approval
        },
        asset: assetMatchResult.matched ? assetMatchResult.assetId : undefined
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
      // For head/lead, approve directly
      const request = reimbursements.find(r => r.id === requestId)
      if (!request) return
      
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
        // Check if lead also approved
        if (newApprovals.lead) {
          newStatus = 'approved_by_lead'
        } else {
          newStatus = 'approved_by_head'
        }
      } else if (role === 'lead') {
        newApprovals.lead = approval
        // Check if head also approved
        if (newApprovals.head) {
          newStatus = 'approved_by_head'
        } else {
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
  }


  // Handle asset matching check
  const handleCheckAsset = async (request: Reimbursement) => {
    setSelectedRequest(request)
    setIsMatchingAsset(true)
    
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL
      
      if (!webhookUrl) {
        throw new Error('Asset matching webhook URL not configured')
      }
      
      const response = await axios.post(webhookUrl, {
        msisdn_email: request.employeeEmail,
        timestamp: new Date().toISOString()
      })
      
      const data = response.data
      const isMSISDN = /^(\+62|62|0)8[1-9][0-9]{6,9}$/.test(request.employeeEmail)
      
      const matchResult: AssetMatchResult = {
        matched: data.matched || false,
        assetId: data.asset_id || undefined,
        assetName: data.asset_name || undefined,
        employeeName: data.employee_name || undefined,
        department: data.department || undefined,
        matchedBy: isMSISDN ? 'msisdn' : 'email',
        matchedValue: request.employeeEmail,
        confidence: data.confidence || 0,
        verifiedDate: new Date().toISOString()
      }
      
      setAssetMatchResult(matchResult)
      setCheckedRequests(prev => new Set(prev).add(request.id))
    } catch (error) {
      console.error('Matching error:', error)
      alert('Gagal melakukan asset matching. Silakan coba lagi.')
    } finally {
      setIsMatchingAsset(false)
    }
  }

  // Handle reject action
  const handleReject = (requestId: string) => {
    if (!user) return
    
    const request = reimbursements.find(r => r.id === requestId)
    if (!request) return
    
    const role = user.role
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
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      approved_by_head: 'bg-blue-500/20 text-blue-500',
      approved_by_lead: 'bg-blue-500/20 text-blue-500',
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
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
                >
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
                      onClick={() => handleApprove(request.id)}
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
                      onClick={() => {
                        setSelectedRequest(request)
                        setShowRejectModal(true)
                      }}
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
                            <div>
                              <span className="text-muted-foreground">Employee:</span>
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
                          <div className="flex items-center gap-2 text-yellow-500">
                            <AlertCircle className="w-4 h-4" />
                            <span>No matching asset found in database</span>
                          </div>
                          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-600">
                            ⚠ No asset match found. You can still approve if needed.
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
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
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
            <h3 className="text-xl font-bold mb-4">Reject Reimbursement</h3>
            <p className="text-muted-foreground mb-4">
              Request ID: {selectedRequest.id}
            </p>
            <div className="space-y-2 mb-4">
              <Label>Alasan Penolakan</Label>
              <Input
                placeholder="Masukkan alasan penolakan..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(selectedRequest.id)}
                disabled={!rejectReason.trim()}
              >
                Reject
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
