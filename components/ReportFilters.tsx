'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Filter, X, Calendar, User, Building, BarChart3, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { ReimbursementStatus } from '@/lib/types'
import { ReportFilters as IReportFilters } from '@/lib/services/types'
import { apiClient } from '@/lib/api/client'

interface Project {
  id: string
  name: string
  projectId: string
  status: 'ACTIVE' | 'INACTIVE'
}

interface ReportFiltersProps {
  filters: IReportFilters
  onFiltersChange: (filters: IReportFilters) => void
  onApplyFilters: () => void
  loading?: boolean
  className?: string
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  loading = false,
  className = ''
}) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Local state for form inputs
  const [localFilters, setLocalFilters] = useState<IReportFilters>(filters)

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // Fetch projects for dropdown
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const response = await apiClient.get('/api/projects?status=ACTIVE')
      setProjects(response.data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Load projects on component mount
  useEffect(() => {
    fetchProjects()
  }, [])

  // Handle local filter changes
  const handleFilterChange = (field: keyof IReportFilters, value: any) => {
    const newFilters = { ...localFilters, [field]: value }
    setLocalFilters(newFilters)
  }

  // Apply filters (update parent state)
  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    onApplyFilters()
  }

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters: IReportFilters = {}
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    onApplyFilters()
  }

  // Check if any filters are active
  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== undefined && value !== null && value !== '' && 
    (Array.isArray(value) ? value.length > 0 : true)
  )

  // Format date for input
  const formatDateForInput = (date?: Date): string => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  // Parse date from input
  const parseDateFromInput = (dateString: string): Date | undefined => {
    if (!dateString) return undefined
    return new Date(dateString)
  }

  // Get status options
  const statusOptions: { value: ReimbursementStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved_by_lead', label: 'Approved by Lead' },
    { value: 'approved_by_head', label: 'Approved by Head' },
    { value: 'approved_by_finance', label: 'Approved by Finance' },
    { value: 'rejected', label: 'Rejected' }
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Report Filters
            {hasActiveFilters && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {Object.values(localFilters).filter(v => 
                  v !== undefined && v !== null && v !== '' && 
                  (Array.isArray(v) ? v.length > 0 : true)
                ).length} active
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearFilters}
                disabled={loading}
                className="h-8 px-2 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <motion.div
          initial={false}
          animate={{ height: isExpanded ? 'auto' : 'auto' }}
          className="space-y-4"
        >
          {/* First Row - Most Common Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Project Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building className="w-3 h-3" />
                Project
              </Label>
              <Select
                value={localFilters.projectId || ''}
                onValueChange={(value) => handleFilterChange('projectId', value || undefined)}
                disabled={loading || loadingProjects}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span>{project.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {project.projectId}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Name Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="w-3 h-3" />
                User Name
              </Label>
              <Input
                placeholder="Search by user name..."
                value={localFilters.userName || ''}
                onChange={(e) => handleFilterChange('userName', e.target.value || undefined)}
                disabled={loading}
              />
            </div>

            {/* Lead Name Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Lead Name
              </Label>
              <Input
                placeholder="Search by lead name..."
                value={localFilters.leadName || ''}
                onChange={(e) => handleFilterChange('leadName', e.target.value || undefined)}
                disabled={loading}
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={localFilters.status?.join(',') || ''}
                onValueChange={(value) => {
                  const statuses = value ? value.split(',') as ReimbursementStatus[] : undefined
                  handleFilterChange('status', statuses)
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second Row - Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date From */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Date From
              </Label>
              <Input
                type="date"
                value={formatDateForInput(localFilters.dateFrom)}
                onChange={(e) => handleFilterChange('dateFrom', parseDateFromInput(e.target.value))}
                disabled={loading}
                max={formatDateForInput(localFilters.dateTo) || new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Date To
              </Label>
              <Input
                type="date"
                value={formatDateForInput(localFilters.dateTo)}
                onChange={(e) => handleFilterChange('dateTo', parseDateFromInput(e.target.value))}
                disabled={loading}
                min={formatDateForInput(localFilters.dateFrom)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-border">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                
                {localFilters.projectId && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Project: {projects.find(p => p.id === localFilters.projectId)?.name || 'Selected'}
                  </span>
                )}
                
                {localFilters.userName && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    User: {localFilters.userName}
                  </span>
                )}
                
                {localFilters.leadName && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    Lead: {localFilters.leadName}
                  </span>
                )}
                
                {localFilters.status && localFilters.status.length > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    Status: {localFilters.status.length} selected
                  </span>
                )}
                
                {localFilters.dateFrom && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    From: {localFilters.dateFrom.toLocaleDateString('id-ID')}
                  </span>
                )}
                
                {localFilters.dateTo && (
                  <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                    To: {localFilters.dateTo.toLocaleDateString('id-ID')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleApplyFilters}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4 mr-2" />
                  Apply Filters
                </>
              )}
            </Button>
            
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}