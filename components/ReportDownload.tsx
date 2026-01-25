'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, Eye, RefreshCw, AlertCircle, CheckCircle, Calendar, Users, Building, BarChart3 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ReportFilters as IReportFilters, ReportSummary } from '@/lib/services/types'
import { useAuth } from '@/providers/AuthProvider'
import { apiClient } from '@/lib/api/client'

interface ReportDownloadProps {
  filters: IReportFilters
  className?: string
}

export const ReportDownload: React.FC<ReportDownloadProps> = ({
  filters,
  className = ''
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastDownload, setLastDownload] = useState<Date | null>(null)

  // Check if user can download reports (lead, head, finance)
  const canDownload = user && ['lead', 'head', 'finance'].includes(user.role)

  // Fetch report summary for preview
  const fetchReportSummary = async () => {
    if (!canDownload) return

    try {
      setPreviewLoading(true)
      setError(null)

      const response = await apiClient.post('/api/reports/summary', {
        filters: {
          ...filters,
          dateFrom: filters.dateFrom?.toISOString(),
          dateTo: filters.dateTo?.toISOString()
        }
      })

      if (response.data.success) {
        setSummary(response.data.summary)
      } else {
        setError('Failed to load report summary')
      }
    } catch (err: any) {
      console.error('Error fetching report summary:', err)
      setError(err.response?.data?.error || 'Failed to load report summary')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Load summary when filters change
  useEffect(() => {
    if (canDownload) {
      fetchReportSummary()
    }
  }, [filters, canDownload])

  // Handle Excel download
  const handleDownloadExcel = async () => {
    if (!canDownload) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await apiClient.post('/api/reports', {
        filters: {
          ...filters,
          dateFrom: filters.dateFrom?.toISOString(),
          dateTo: filters.dateTo?.toISOString()
        },
        format: 'excel'
      }, {
        responseType: 'blob'
      })

      // Create download link
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      link.download = `reimbursement_report_${timestamp}.xlsx`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSuccess('Report downloaded successfully!')
      setLastDownload(new Date())

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)

    } catch (err: any) {
      console.error('Error downloading report:', err)
      setError(err.response?.data?.error || 'Failed to download report')
    } finally {
      setLoading(false)
    }
  }

  // Handle JSON preview
  const handlePreviewData = async () => {
    if (!canDownload) return

    try {
      setPreviewLoading(true)
      setError(null)

      const response = await apiClient.post('/api/reports', {
        filters: {
          ...filters,
          dateFrom: filters.dateFrom?.toISOString(),
          dateTo: filters.dateTo?.toISOString()
        },
        format: 'json'
      })

      if (response.data.success) {
        // Open preview in new window/tab
        const previewWindow = window.open('', '_blank')
        if (previewWindow) {
          previewWindow.document.write(`
            <html>
              <head>
                <title>Report Preview</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                  .data { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                  pre { white-space: pre-wrap; word-wrap: break-word; }
                </style>
              </head>
              <body>
                <h1>Reimbursement Report Preview</h1>
                <div class="summary">
                  <h2>Summary</h2>
                  <p><strong>Total Reimbursements:</strong> ${response.data.summary.totalReimbursements}</p>
                  <p><strong>Total Amount:</strong> Rp ${response.data.summary.totalAmount.toLocaleString('id-ID')}</p>
                </div>
                <div class="data">
                  <h2>Data (${response.data.data.length} records)</h2>
                  <pre>${JSON.stringify(response.data.data, null, 2)}</pre>
                </div>
              </body>
            </html>
          `)
          previewWindow.document.close()
        }
      } else {
        setError('Failed to preview report data')
      }
    } catch (err: any) {
      console.error('Error previewing report:', err)
      setError(err.response?.data?.error || 'Failed to preview report data')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Format filter summary for display
  const getFilterSummary = () => {
    const parts: string[] = []
    
    if (filters.projectId) parts.push('Project filtered')
    if (filters.userName) parts.push('User filtered')
    if (filters.leadName) parts.push('Lead filtered')
    if (filters.status && filters.status.length > 0) parts.push(`${filters.status.length} status(es)`)
    if (filters.dateFrom || filters.dateTo) parts.push('Date range')
    
    return parts.length > 0 ? parts.join(', ') : 'No filters applied'
  }

  if (!canDownload) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            Only Lead, Head, and Finance roles can download reports.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Report
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Report Summary Preview */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              Report Preview
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{summary.totalReimbursements}</div>
                <div className="text-xs text-muted-foreground">Total Requests</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  Rp {summary.totalAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-muted-foreground">Total Amount</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.statusBreakdown.approved_by_finance}</div>
                <div className="text-xs text-muted-foreground">Approved</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{summary.statusBreakdown.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Status Breakdown:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                  count > 0 && (
                    <Badge key={status} variant="secondary" className="text-xs">
                      {status.replace(/_/g, ' ')}: {count}
                    </Badge>
                  )
                ))}
              </div>
            </div>

            {/* Project Breakdown (if available) */}
            {Object.keys(summary.projectBreakdown).length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Top Projects:</div>
                <div className="space-y-1">
                  {Object.entries(summary.projectBreakdown)
                    .sort(([, a], [, b]) => b.amount - a.amount)
                    .slice(0, 3)
                    .map(([project, data]) => (
                      <div key={project} className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {project}
                        </span>
                        <span className="text-muted-foreground">
                          {data.count} requests • Rp {data.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Filter Summary */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Calendar className="w-4 h-4" />
            Applied Filters
          </div>
          <div className="text-sm text-muted-foreground">
            {getFilterSummary()}
          </div>
          {filters.dateFrom && (
            <div className="text-xs text-muted-foreground mt-1">
              From: {filters.dateFrom.toLocaleDateString('id-ID')}
              {filters.dateTo && ` to ${filters.dateTo.toLocaleDateString('id-ID')}`}
            </div>
          )}
        </div>

        {/* Download Actions */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadExcel}
              disabled={loading || previewLoading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download Excel
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handlePreviewData}
              disabled={loading || previewLoading}
            >
              {previewLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Last Download Info */}
          {lastDownload && (
            <div className="text-xs text-muted-foreground text-center">
              Last downloaded: {lastDownload.toLocaleString('id-ID')}
            </div>
          )}
        </div>

        {/* Loading State */}
        {previewLoading && !summary && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading report preview...</p>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Excel reports include detailed data with formatting and summary statistics</p>
          <p>• Preview shows a sample of the data that will be included in the report</p>
          <p>• Reports are generated based on your current filter settings</p>
        </div>
      </CardContent>
    </Card>
  )
}