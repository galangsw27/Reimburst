'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, FileSpreadsheet, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ReportFilters } from '@/components/ReportFilters'
import { ReportDownload } from '@/components/ReportDownload'
import { ReportFilters as IReportFilters } from '@/lib/services/types'
import { useAuth } from '@/providers/AuthProvider'

export default function ReportsPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<IReportFilters>({})
  const [loading, setLoading] = useState(false)

  // Handle filter changes
  const handleFiltersChange = (newFilters: IReportFilters) => {
    setFilters(newFilters)
  }

  // Handle apply filters
  const handleApplyFilters = () => {
    setLoading(true)
    // Simulate loading delay
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  // Check if user can access reports
  const canAccessReports = user && ['lead', 'head', 'finance'].includes(user.role)

  return (
    <ProtectedRoute requiredRoles={['lead', 'head', 'finance']}>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Reports & Analytics</h1>
                <p className="text-muted-foreground">
                  Generate and download reimbursement reports with advanced filtering
                </p>
              </div>
            </div>
            
            {/* Role-based welcome message */}
            {user && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    Welcome, {user.name} ({user.role})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {user.role === 'finance' && 'You have full access to all reporting features including Excel export.'}
                  {user.role === 'head' && 'You can generate reports for your division and download Excel files.'}
                  {user.role === 'lead' && 'You can generate reports for your team and download Excel files.'}
                </p>
              </div>
            )}
          </motion.header>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Report Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ReportFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onApplyFilters={handleApplyFilters}
                loading={loading}
              />
            </motion.div>

            {/* Report Download */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ReportDownload
                filters={filters}
              />
            </motion.div>

            {/* Additional Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Report Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Report Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Excel Export</p>
                      <p className="text-xs text-muted-foreground">
                        Download formatted Excel files with summary statistics and detailed data
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Advanced Filtering</p>
                      <p className="text-xs text-muted-foreground">
                        Filter by project, user, lead, status, and date range
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Real-time Preview</p>
                      <p className="text-xs text-muted-foreground">
                        See report summary before downloading
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Role-based Access</p>
                      <p className="text-xs text-muted-foreground">
                        Access controls based on your role and permissions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Usage Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Best Practices:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Use date ranges to limit report size for better performance</li>
                      <li>• Apply specific filters to focus on relevant data</li>
                      <li>• Preview reports before downloading to verify data</li>
                      <li>• Download during off-peak hours for large reports</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Report Formats:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• <strong>Excel:</strong> Formatted spreadsheet with charts and summaries</li>
                      <li>• <strong>Preview:</strong> JSON data view in browser</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Data Included:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Employee details and lead assignments</li>
                      <li>• Reimbursement amounts and descriptions</li>
                      <li>• Project associations and status tracking</li>
                      <li>• Approval workflow and timestamps</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}