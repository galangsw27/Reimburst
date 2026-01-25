'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Project } from '@/lib/types'
import { apiClient } from '@/lib/api/client'

interface ProjectFormProps {
  project?: Project | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  projectId: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
}

interface FormErrors {
  projectId?: string
  name?: string
  status?: string
  general?: string
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    projectId: '',
    name: '',
    status: 'ACTIVE'
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const isEditing = !!project

  // Initialize form data when project prop changes
  useEffect(() => {
    if (project) {
      setFormData({
        projectId: project.projectId,
        name: project.name,
        status: project.status
      })
    } else {
      setFormData({
        projectId: '',
        name: '',
        status: 'ACTIVE'
      })
    }
    setErrors({})
    setSuccess(false)
  }, [project])

  // Validate project ID format (X-XXX-XXX)
  const validateProjectId = (projectId: string): boolean => {
    const pattern = /^\d-\d{3}-\d{3}$/
    return pattern.test(projectId)
  }

  // Handle form field changes
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear general error
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }))
    }
  }

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate project ID
    if (!formData.projectId.trim()) {
      newErrors.projectId = 'Project ID is required'
    } else if (!validateProjectId(formData.projectId)) {
      newErrors.projectId = 'Invalid format. Expected: X-XXX-XXX (e.g., 5-002-079)'
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Project name must be at least 3 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const payload = {
        projectId: formData.projectId.trim(),
        name: formData.name.trim(),
        ...(isEditing && { status: formData.status })
      }

      if (isEditing && project) {
        // Update existing project
        await apiClient.put(`/api/projects/${project.id}`, payload)
      } else {
        // Create new project
        await apiClient.post('/api/projects', payload)
      }

      setSuccess(true)
      
      // Show success message briefly then close
      setTimeout(() => {
        onSave()
      }, 1000)

    } catch (error: any) {
      console.error('Error saving project:', error)
      
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error
        
        if (errorMessage.includes('already exists') || errorMessage.includes('unique')) {
          setErrors({ projectId: 'Project ID already exists' })
        } else if (errorMessage.includes('format') || errorMessage.includes('Invalid')) {
          setErrors({ projectId: errorMessage })
        } else {
          setErrors({ general: errorMessage })
        }
      } else {
        setErrors({ general: 'Failed to save project. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle project ID input formatting
  const handleProjectIdChange = (value: string) => {
    // Remove any non-digit or non-dash characters
    let formatted = value.replace(/[^\d-]/g, '')
    
    // Auto-format as user types (X-XXX-XXX)
    if (formatted.length >= 2 && !formatted.includes('-')) {
      formatted = formatted.charAt(0) + '-' + formatted.slice(1)
    }
    if (formatted.length >= 6 && formatted.split('-').length === 2) {
      const parts = formatted.split('-')
      formatted = parts[0] + '-' + parts[1].slice(0, 3) + '-' + parts[1].slice(3)
    }
    
    // Limit to correct length
    if (formatted.length <= 9) {
      handleChange('projectId', formatted)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-background border border-border rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {isEditing ? 'Edit Project' : 'Add New Project'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Project {isEditing ? 'updated' : 'created'} successfully!</span>
              </motion.div>
            )}

            {/* General Error */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project ID */}
              <div className="space-y-2">
                <Label htmlFor="projectId">
                  Project ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="projectId"
                  placeholder="e.g., 5-002-079"
                  value={formData.projectId}
                  onChange={(e) => handleProjectIdChange(e.target.value)}
                  disabled={loading}
                  className={errors.projectId ? 'border-red-300 focus:border-red-500' : ''}
                />
                {errors.projectId && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.projectId}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Format: X-XXX-XXX (e.g., 5-002-079)
                </p>
              </div>

              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={loading}
                  className={errors.name ? 'border-red-300 focus:border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Status (only for editing) */}
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleChange('status', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only active projects appear in reimbursement forms
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? 'Update' : 'Create'} Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}