'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Download, Eye, CheckCircle, XCircle, Clock, FileText, Upload, ExternalLink, Loader2, Filter, Calendar, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { useReimbursements } from '@/lib/hooks/useReimbursements'
import { googleSheetsService } from '@/lib/services/googleSheetsService'
import { Reimbursement, ReimbursementStatus } from '@/lib/types'

interface HistoryListProps {
  showDownload?: boolean
}

export const HistoryList: React.FC<HistoryListProps> = ({ showDownload = false }) => {
  const { user } = useAuth()
  const { reimbursements, mounted } = useReimbursements()
  
  const [selectedRequest, setSelectedRequest] = useState<Reimbursement | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [leadFilter, setLeadFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<string>('')

  // Get requests based on user role and showDownload flag
  const requests = useMemo(() => {
    if (!mounted || !user) return []
    
    let filtered = [...reimbursements]
    
    // Filter by approval status if showDownload is true
    if (showDownload) {
      filtered = filtered.filter(r => r.status === 'approved_by_finance')
    }
    
    // Filter by user if regular user role
    if (user.role === 'user') {
      filtered = filtered.filter(r => r.userId === user.id)
    }
    
    // Sort from oldest to newest
    return filtered.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [reimbursements, user, mounted, showDownload])

  // Get unique projects from requests
  const projectsWithData = useMemo(() => {
    const projects = new Set<string>()
    requests.forEach(req => {
      if (req.project) {
        projects.add(req.project)
      }
    })
    return Array.from(projects).sort()
  }, [requests])

  // Get unique leads from requests
  const leadsWithData = useMemo(() => {
    const leads = new Set<string>()
    requests.forEach(req => {
      if (req.leadName) {
        leads.add(req.leadName)
      }
    })
    return Array.from(leads).sort()
  }, [requests])

  // Apply filters
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Status filter
      let statusMatch = true
      if (filter === 'pending') {
        statusMatch = req.status === 'pending' || 
                     req.status === 'approved_by_head' || 
                     req.status === 'approved_by_lead'
      } else if (filter === 'approved') {
        statusMatch = req.status === 'approved_by_finance'
      } else if (filter === 'rejected') {
        statusMatch = req.status === 'rejected'
      }
      
      // Project filter
      const projectMatch = projectFilter === 'all' || req.project === projectFilter
      
      // Lead filter
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
      
      return statusMatch && projectMatch && leadMatch && dateMatch
    })
  }, [requests, filter, projectFilter, leadFilter, dateFrom, dateTo])

  // Handle CSV download
  const handleDownloadCSV = () => {
    const dataToExport = projectFilter === 'all' ? filteredRequests : filteredRequests.filter(r => r.project === projectFilter)
    const formatted = googleSheetsService.formatForExport(dataToExport)
    
    // Convert to CSV
    const csvContent = formatted.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const filename = projectFilter === 'all' 
      ? `reimbursement_all_${new Date().toISOString().split('T')[0]}.csv`
      : `reimbursement_${projectFilter}_${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle Google Sheets export
  const handleExportToGoogleSheets = async () => {
    if (projectFilter === 'all') {
      alert('Please select a specific project to export to Google Sheets')
      return
    }

    setIsExporting(true)
    setExportMessage('')
    
    try {
      const projectRequests = filteredRequests.filter(r => r.project === projectFilter)
      const result = await googleSheetsService.exportToSheets(projectRequests, projectFilter)
      setExportMessage(result.message)
      
      if (result.success) {
        setTimeout(() => setExportMessage(''), 5000)
      }
    } catch (error: any) {
      setExportMessage(`Error: ${error.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle download Excel from Google Sheets
  const handleDownloadProjectExcel = () => {
    if (projectFilter === 'all') {
      alert('Please select a specific project to download Excel')
      return
    }

    try {
      googleSheetsService.downloadExcelFromSheet(projectFilter)
    } catch (error: any) {
      alert(`Error downloading ${projectFilter}: ${error.message}`)
    }
  }

  // Handle open in Google Sheets
  const handleOpenInGoogleSheets = () => {
    if (projectFilter === 'all') {
      alert('Please select a specific project to open in Google Sheets')
      return
    }

    const url = googleSheetsService.getSpreadsheetUrl(projectFilter)
    if (url) {
      window.open(url, '_blank')
    } else {
      alert(`Google Sheet not configured for ${projectFilter}`)
    }
  }

  // Get status badge styling
  const getStatusBadge = (status: ReimbursementStatus) => {
    const badges = {
      pending: { class: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
      approved_by_head: { class: 'bg-blue-500/20 text-blue-500', icon: CheckCircle },
      approved_by_lead: { class: 'bg-blue-500/20 text-blue-500', icon: CheckCircle },
      approved_by_finance: { class: 'bg-green-500/20 text-green-500', icon: CheckCircle },
      rejected: { class: 'bg-red-500/20 text-red-500', icon: XCircle },
    }
    return badges[status] || badges.pending
  }

  // Don't render until mounted
  if (!mounted || !user) {
    return null
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {showDownload ? 'Approved Reimbursements' : 'History'} ({filteredRequests.length})
            </CardTitle>
            {showDownload && requests.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={handleDownloadCSV} variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>
            )}
          </div>
          
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

          {/* Google Sheets Actions (for Download Excel view) */}
          {showDownload && requests.length > 0 && projectFilter !== 'all' && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="text-sm font-semibold">Google Sheets Actions for {projectFilter}:</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleExportToGoogleSheets}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Export to Google Sheets
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownloadProjectExcel}
                >
                  <Download className="w-4 h-4" />
                  Download Excel from Sheets
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenInGoogleSheets}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Google Sheets
                </Button>
              </div>
            </div>
          )}

          {exportMessage && (
            <div className={`mt-2 p-3 rounded-lg text-sm ${
              exportMessage.includes('Error') 
                ? 'bg-red-500/10 text-red-500 border border-red-500/30' 
                : 'bg-green-500/10 text-green-500 border border-green-500/30'
            }`}>
              {exportMessage}
            </div>
          )}
          
          {!showDownload && (
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={filter === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilter('approved')}
              >
                Approved
              </Button>
              <Button
                size="sm"
                variant={filter === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilter('rejected')}
              >
                Rejected
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada data reimbursement</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const statusInfo = getStatusBadge(request.status)
                const StatusIcon = statusInfo.icon
                
                return (
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
                          {request.employeeName} • {new Date(request.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.class}`}>
                        <StatusIcon className="w-3 h-3" />
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
                        <p className="font-medium text-green-500">Rp {request.amount.toLocaleString('id-ID')}</p>
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

                    {/* Approval Status */}
                    <div className="flex gap-4 mb-4 text-xs">
                      <div className={`flex items-center gap-1 ${request.approvals?.head ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {request.approvals?.head ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Head: {request.approvals?.head?.by || 'Pending'}
                      </div>
                      <div className={`flex items-center gap-1 ${request.approvals?.lead ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {request.approvals?.lead ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Lead: {request.approvals?.lead?.by || 'Pending'}
                      </div>
                      <div className={`flex items-center gap-1 ${request.approvals?.finance ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {request.approvals?.finance ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Finance: {request.approvals?.finance?.by || 'Pending'}
                      </div>
                    </div>

                    {request.rejectionReason && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-500">
                          <strong>Rejection Reason:</strong> {request.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Asset Match Result (if available) */}
                    {request.approvals?.finance?.assetMatch && (
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <strong className="text-sm">Asset Matched</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Asset ID:</span>
                            <p className="font-medium">{request.approvals.finance.assetMatch.assetId}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Employee:</span>
                            <p className="font-medium">{request.approvals.finance.assetMatch.employeeName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Department:</span>
                            <p className="font-medium">{request.approvals.finance.assetMatch.department}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Confidence:</span>
                            <p className="font-medium">{((request.approvals.finance.assetMatch.confidence || 0) * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                    >
                      <Eye className="w-4 h-4" />
                      {selectedRequest?.id === request.id ? 'Hide Details' : 'View Details'}
                    </Button>

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
                          {request.receiptImage && (
                            <div>
                              <span className="text-muted-foreground">Receipt Image:</span>
                              <img
                                src={request.receiptImage}
                                alt="Receipt"
                                className="mt-2 w-48 h-48 object-cover rounded-lg cursor-pointer hover:opacity-80"
                                onClick={() => window.open(request.receiptImage, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
