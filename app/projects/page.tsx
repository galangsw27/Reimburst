'use client'

import React, { useState, useEffect } from 'react'
import { ProjectTable } from '@/components/ProjectTable'
import { Project } from '@/lib/types'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, X, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/providers/AuthProvider'
import { ProjectForm } from '@/components/ProjectForm'
import { motion } from 'framer-motion'

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null)
  const [viewDetailProject, setViewDetailProject] = useState<Project | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')

  // Check if user can manage projects (lead, head, finance)
  const canManageProjects = user && ['lead', 'head', 'finance'].includes(user.role)

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      const response = await apiClient.get(`/api/projects?${params.toString()}`)
      setProjects(response.data)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  // Load projects on component mount and when filters change
  useEffect(() => {
    fetchProjects()
  }, [statusFilter])

  // Filter projects based on search term
  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = searchTerm === '' || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectId.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [projects, searchTerm])

  // Handle project creation/update
  const handleProjectSaved = () => {
    setShowForm(false)
    setEditingProject(null)
    fetchProjects()
  }

  // Handle project deletion
  const handleDelete = async (project: Project) => {
    try {
      await apiClient.delete(`/api/projects/${project.id}`)
      setDeleteConfirm(null)
      fetchProjects()
    } catch (err) {
      console.error('Error deleting project:', err)
      setError('Failed to delete project')
    }
  }

  // Handle edit project
  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setShowForm(true)
  }

  // Handle view detail
  const handleViewDetail = (project: Project) => {
    setViewDetailProject(project)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Project Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage projects for reimbursement requests ({filteredProjects.length} projects)
            </p>
          </div>
          
          {canManageProjects && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchProjects}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {(searchTerm || statusFilter !== 'all') && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search Projects</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'ACTIVE' | 'INACTIVE')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || statusFilter !== 'all') && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {searchTerm && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Search: "{searchTerm}"
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Status: {statusFilter}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Table */}
        <ProjectTable
          projects={filteredProjects}
          onViewDetail={handleViewDetail}
          onEdit={canManageProjects ? handleEdit : undefined}
          onDelete={canManageProjects ? (project) => setDeleteConfirm(project) : undefined}
          loading={loading}
        />

        {/* Project Form Modal */}
        {showForm && (
          <ProjectForm
            project={editingProject}
            onSave={handleProjectSaved}
            onCancel={() => {
              setShowForm(false)
              setEditingProject(null)
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                Delete Project
              </h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete this project? This action cannot be undone.
              </p>
              <div className="space-y-2 mb-6 p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Project Name:</span>
                  <p className="font-medium">{deleteConfirm.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Project ID:</span>
                  <p className="font-medium font-mono">{deleteConfirm.projectId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirm(null)} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1"
                >
                  Delete Project
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* View Detail Modal */}
        {viewDetailProject && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setViewDetailProject(null)}
          >
            <motion.div
              className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Project Details</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Project ID:</span>
                  <p className="font-medium font-mono">{viewDetailProject.projectId}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Project Name:</span>
                  <p className="font-medium">{viewDetailProject.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <p className="font-medium">{viewDetailProject.status}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Created At:</span>
                  <p className="font-medium">{new Date(viewDetailProject.createdAt).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Updated At:</span>
                  <p className="font-medium">{new Date(viewDetailProject.updatedAt).toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setViewDetailProject(null)} 
                  className="flex-1"
                >
                  Close
                </Button>
                {canManageProjects && (
                  <Button
                    onClick={() => {
                      setViewDetailProject(null)
                      handleEdit(viewDetailProject)
                    }}
                    className="flex-1"
                  >
                    Edit Project
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}