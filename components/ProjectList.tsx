'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Search, Filter, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useAuth } from '@/providers/AuthProvider'
import { Project } from '@/lib/types'
import { ProjectForm } from '@/components/ProjectForm'
import { apiClient } from '@/lib/api/client'

interface ProjectListProps {
  onUpdate?: () => void
}

export const ProjectList: React.FC<ProjectListProps> = ({ onUpdate }) => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null)
  
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
  const filteredProjects = useMemo(() => {
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
    onUpdate?.()
  }

  // Handle project deletion
  const handleDelete = async (project: Project) => {
    try {
      await apiClient.delete(`/api/projects/${project.id}`)
      setDeleteConfirm(null)
      fetchProjects()
      onUpdate?.()
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

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE' 
      ? 'bg-green-500/20 text-green-500' 
      : 'bg-red-500/20 text-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects ({filteredProjects.length})</h2>
          <p className="text-muted-foreground">
            Manage projects for reimbursement requests
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

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {projects.length === 0 ? 'No Projects Yet' : 'No Projects Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {projects.length === 0 
                ? 'Get started by creating your first project.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {canManageProjects && projects.length === 0 && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" title={project.name}>
                        {project.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {project.projectId}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div>
                      <span>Created:</span>{' '}
                      {new Date(project.createdAt).toLocaleDateString('id-ID')}
                    </div>
                    <div>
                      <span>Updated:</span>{' '}
                      {new Date(project.updatedAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canManageProjects && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(project)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(project)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

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
    </div>
  )
}