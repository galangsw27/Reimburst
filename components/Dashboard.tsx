'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, XCircle, DollarSign, FileText, Filter, ArrowUpDown, CheckCircle, Upload, BarChart3, Users, Building } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useAuth } from '@/providers/AuthProvider'
import { useReimbursements } from '@/lib/hooks/useReimbursements'
import { useProjects } from '@/lib/hooks/useProjects'
import { ProjectType, ReimbursementStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { hasPermission } from '@/lib/utils/permissions'

type DashboardView = 'overview' | 'upload' | 'approval' | 'history' | 'download'

interface DashboardStats {
  totalRequests: number
  pendingApproval: number
  approved: number
  rejected: number
  totalAmount: number
  byProject: Record<string, { count: number; total: number }>
  // New statistics for enhanced features
  totalProjects: number
  activeProjects: number
}

type SortField = 'date' | 'amount' | 'status' | 'project'
type SortOrder = 'asc' | 'desc'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { reimbursements, mounted } = useReimbursements()
  const { projects, activeProjects, mounted: projectsMounted } = useProjects()
  
  const [view] = useState<DashboardView>('overview')
  const [filterStatus, setFilterStatus] = useState<ReimbursementStatus | 'all'>('all')
  const [filterProject, setFilterProject] = useState<ProjectType | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Calculate dashboard statistics
  const stats = useMemo<DashboardStats>(() => {
    if (!mounted || !user) {
      return {
        totalRequests: 0,
        pendingApproval: 0,
        approved: 0,
        rejected: 0,
        totalAmount: 0,
        byProject: {},
        totalProjects: 0,
        activeProjects: 0,
      }
    }

    // Filter reimbursements by user if they're a regular user
    const userReimbursements = user.role === 'tester' 
      ? reimbursements.filter(r => r.userId === user.id)
      : reimbursements

    // Calculate reimbursement statistics
    const totalRequests = userReimbursements.length
    const pendingApproval = userReimbursements.filter(
      r => r.status === 'pending' || 
           r.status === 'approved_by_head' || 
           r.status === 'approved_by_lead'
    ).length
    const approved = userReimbursements.filter(r => r.status === 'approved_by_finance').length
    const rejected = userReimbursements.filter(r => r.status === 'rejected').length
    const totalAmount = userReimbursements.reduce((sum, r) => sum + r.amount, 0)

    // Group by project
    const byProject: Record<string, { count: number; total: number }> = {}
    userReimbursements.forEach(r => {
      const project = r.project || 'Unknown'
      if (!byProject[project]) {
        byProject[project] = { count: 0, total: 0 }
      }
      byProject[project].count++
      byProject[project].total += r.amount
    })

    // Calculate project statistics
    const totalProjects = projectsMounted ? projects.length : 0
    const activeProjectsCount = projectsMounted ? activeProjects.length : 0

    return {
      totalRequests,
      pendingApproval,
      approved,
      rejected,
      totalAmount,
      byProject,
      totalProjects,
      activeProjects: activeProjectsCount,
    }
  }, [reimbursements, user, mounted, projects, activeProjects, projectsMounted])

  // Filter and sort reimbursements
  const filteredAndSortedReimbursements = useMemo(() => {
    if (!mounted) return []

    let filtered = [...reimbursements]

    // Apply user filter for regular users
    if (user?.role === 'tester') {
      filtered = filtered.filter(r => r.userId === user.id)
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus)
    }

    // Apply project filter
    if (filterProject !== 'all') {
      filtered = filtered.filter(r => r.project === filterProject)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'project':
          comparison = a.project.localeCompare(b.project)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [reimbursements, filterStatus, filterProject, sortField, sortOrder, user, mounted])

  const getRoleTitle = () => {
    if (!user) return 'Dashboard'
    switch (user.role) {
      case 'tester': return 'Tester Dashboard'
      case 'head': return 'Head Dashboard'
      case 'lead': return 'Lead Dashboard'
      case 'finance': return 'Finance Dashboard'
      default: return 'Dashboard'
    }
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const canUpload = hasPermission(user, 'reimbursement.create')
  const canApprove = hasPermission(user, 'approval.level1') || hasPermission(user, 'approval.level2') || hasPermission(user, 'approval.final')
  const canAccessReports = hasPermission(user, 'report.read')
  const canManageUsers = hasPermission(user, 'user.read')
  const canManageProjects = hasPermission(user, 'project.read')

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div>
            <h2 className="text-2xl font-bold">
              {getRoleTitle()}
            </h2>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user.name}
            </p>
          </div>
        </header>

        {/* Content */}
        {view === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRequests}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                  <Clock className="w-4 h-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">{stats.pendingApproval}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="w-4 h-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
                </CardContent>
              </Card>

              {/* New Project Statistics - Only visible to users who can manage projects */}
              {canManageProjects && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                      <Building className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-500">{stats.totalProjects}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.activeProjects} active
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card className="md:col-span-2 lg:col-span-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    Rp {stats.totalAmount.toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {canUpload && (
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => handleNavigation('/upload')}
                    >
                      <Upload className="w-6 h-6 text-primary" />
                      <div className="text-center">
                        <div className="font-medium">Upload Request</div>
                        <div className="text-xs text-muted-foreground">Submit new reimbursement</div>
                      </div>
                    </Button>
                  )}

                  {canApprove && (
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => handleNavigation('/approvals')}
                    >
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div className="text-center">
                        <div className="font-medium">Approvals</div>
                        <div className="text-xs text-muted-foreground">Review pending requests</div>
                      </div>
                    </Button>
                  )}

                  {canAccessReports && (
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => handleNavigation('/reports')}
                    >
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                      <div className="text-center">
                        <div className="font-medium">Reports</div>
                        <div className="text-xs text-muted-foreground">Generate & download reports</div>
                      </div>
                    </Button>
                  )}

                  {canManageUsers && (
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => handleNavigation('/users')}
                    >
                      <Users className="w-6 h-6 text-purple-600" />
                      <div className="text-center">
                        <div className="font-medium">Manage Users</div>
                        <div className="text-xs text-muted-foreground">User & role management</div>
                      </div>
                    </Button>
                  )}

                  {canManageProjects && (
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => handleNavigation('/projects')}
                    >
                      <Building className="w-6 h-6 text-orange-600" />
                      <div className="text-center">
                        <div className="font-medium">Manage Projects</div>
                        <div className="text-xs text-muted-foreground">Project configuration</div>
                      </div>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => handleNavigation('/history')}
                  >
                    <FileText className="w-6 h-6 text-gray-600" />
                    <div className="text-center">
                      <div className="font-medium">History</div>
                      <div className="text-xs text-muted-foreground">View all requests</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Project Grouping */}
            {Object.keys(stats.byProject).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Breakdown by Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.byProject)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([project, data]) => (
                        <motion.div
                          key={project}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                        >
                          <div>
                            <h3 className="font-semibold text-lg">{project}</h3>
                            <p className="text-sm text-muted-foreground">{data.count} requests</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">Rp {data.total.toLocaleString('id-ID')}</p>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filtering and Sorting Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter & Sort Reimbursements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as ReimbursementStatus | 'all')}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved_by_head">Approved by Head</SelectItem>
                        <SelectItem value="approved_by_lead">Approved by Lead</SelectItem>
                        <SelectItem value="approved_by_finance">Approved by Finance</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Project</label>
                    <Select value={filterProject} onValueChange={(value) => setFilterProject(value as ProjectType | 'all')}>
                      <SelectTrigger>
                        <SelectValue placeholder="All projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        <SelectItem value="MaxStream">MaxStream</SelectItem>
                        <SelectItem value="MyOrbit">MyOrbit</SelectItem>
                        <SelectItem value="Dunia Games">Dunia Games</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Order</label>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </Button>
                  </div>
                </div>

                {/* Filtered Results Summary */}
                <div className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedReimbursements.length} of {stats.totalRequests} reimbursements
                </div>
              </CardContent>
            </Card>

            {/* Recent Reimbursements Preview */}
            {filteredAndSortedReimbursements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reimbursements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredAndSortedReimbursements.slice(0, 5).map((reimbursement) => (
                      <motion.div
                        key={reimbursement.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{reimbursement.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {reimbursement.project} • {new Date(reimbursement.date).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">Rp {reimbursement.amount.toLocaleString('id-ID')}</p>
                          <p className={`text-xs ${
                            reimbursement.status === 'approved_by_finance' ? 'text-green-500' :
                            reimbursement.status === 'rejected' ? 'text-red-500' :
                            'text-yellow-500'
                          }`}>
                            {reimbursement.status.replace(/_/g, ' ').toUpperCase()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {filteredAndSortedReimbursements.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => handleNavigation('/history')}
                    >
                      View All Reimbursements
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {stats.totalRequests === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Reimbursements Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {canUpload 
                      ? "Get started by uploading your first reimbursement request."
                      : "No reimbursement requests to display."}
                  </p>
                  {canUpload && (
                    <Button onClick={() => handleNavigation('/upload')}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Reimbursement
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
