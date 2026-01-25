'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Save, AlertCircle, CheckCircle, Eye, EyeOff, User as UserIcon, Crown, Shield, DollarSign } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { User, UserRole } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'
import { apiClient } from '@/lib/api/client'

interface UserFormProps {
  user?: User | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  name: string
  email: string
  password: string
  role: UserRole
  leadId: string
  status: 'ACTIVE' | 'INACTIVE'
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  role?: string
  leadId?: string
  status?: string
  general?: string
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSave, onCancel }) => {
  const { user: currentUser } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    role: 'tester',
    leadId: '',
    status: 'ACTIVE'
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [availableLeads, setAvailableLeads] = useState<User[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)

  const isEditing = !!user

  // Initialize form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't populate password for editing
        role: user.role,
        leadId: user.leadId || '',
        status: user.status
      })
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'tester',
        leadId: '',
        status: 'ACTIVE'
      })
    }
    setErrors({})
    setSuccess(false)
  }, [user])

  // Fetch available leads (users with role 'lead' or 'head')
  const fetchAvailableLeads = async () => {
    try {
      setLoadingLeads(true)
      const response = await apiClient.get('/api/users')
      const leads = response.data.filter((u: User) => 
        ['lead', 'head'].includes(u.role) && 
        u.status === 'ACTIVE' &&
        u.id !== user?.id // Don't allow self-assignment
      )
      setAvailableLeads(leads)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoadingLeads(false)
    }
  }

  // Load available leads when component mounts
  useEffect(() => {
    fetchAvailableLeads()
  }, [user?.id])

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    // Validate password (only for new users or when password is provided)
    if (!isEditing || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }
    }

    // Validate role
    if (!formData.role) {
      newErrors.role = 'Role is required'
    }

    // Validate lead assignment based on role hierarchy
    if (formData.leadId && formData.role === 'head') {
      // Heads typically don't have leads, but allow it for flexibility
      // Could add validation here if needed
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
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        leadId: formData.leadId && formData.leadId !== 'none' ? formData.leadId : null,
        ...(isEditing && { status: formData.status })
      }

      // Only include password if it's provided
      if (formData.password) {
        payload.password = formData.password
      }

      if (isEditing && user) {
        // Update existing user
        await apiClient.put(`/api/users/${user.id}`, payload)
      } else {
        // Create new user
        await apiClient.post('/api/users', payload)
      }

      setSuccess(true)
      
      // Show success message briefly then close
      setTimeout(() => {
        onSave()
      }, 1000)

    } catch (error: any) {
      console.error('Error saving user:', error)
      
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error
        
        if (errorMessage.includes('already exists') || errorMessage.includes('unique')) {
          setErrors({ email: 'User with this email already exists' })
        } else if (errorMessage.includes('email')) {
          setErrors({ email: errorMessage })
        } else if (errorMessage.includes('password')) {
          setErrors({ password: errorMessage })
        } else if (errorMessage.includes('role')) {
          setErrors({ role: errorMessage })
        } else if (errorMessage.includes('lead')) {
          setErrors({ leadId: errorMessage })
        } else {
          setErrors({ general: errorMessage })
        }
      } else {
        setErrors({ general: 'Failed to save user. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  // Get role icon and description
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'tester':
        return <UserIcon className="w-4 h-4" />
      case 'lead':
        return <Crown className="w-4 h-4" />
      case 'head':
        return <Shield className="w-4 h-4" />
      case 'finance':
        return <DollarSign className="w-4 h-4" />
      default:
        return <UserIcon className="w-4 h-4" />
    }
  }

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'tester':
        return 'Can create reimbursement requests and manage assets'
      case 'lead':
        return 'Can approve level 1, manage users/projects, and all tester permissions'
      case 'head':
        return 'Can approve level 2, manage users/projects, and all lead permissions'
      case 'finance':
        return 'Can do final approval and access reporting, but cannot manage users/projects'
      default:
        return ''
    }
  }

  // Check if current user can assign specific roles
  const canAssignRole = (role: UserRole): boolean => {
    if (!currentUser) return false
    
    // Only leads and heads can manage users
    if (!['lead', 'head'].includes(currentUser.role)) return false
    
    // Role assignment matrix based on requirements
    if (currentUser.role === 'lead') {
      // Leads can assign tester and lead roles
      return ['tester', 'lead'].includes(role)
    } else if (currentUser.role === 'head') {
      // Heads can assign all roles
      return true
    }
    
    return false
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
                {isEditing ? 'Edit User' : 'Add New User'}
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
                <span>User {isEditing ? 'updated' : 'created'} successfully!</span>
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
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
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

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={loading}
                  className={errors.email ? 'border-red-300 focus:border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {!isEditing && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isEditing ? 'Leave blank to keep current password' : 'Enter password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    disabled={loading}
                    className={errors.password ? 'border-red-300 focus:border-red-500 pr-10' : 'pr-10'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep current password
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => handleChange('role', value)}
                  disabled={loading}
                >
                  <SelectTrigger className={errors.role ? 'border-red-300 focus:border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['tester', 'lead', 'head', 'finance'] as UserRole[]).map((role) => (
                      <SelectItem 
                        key={role} 
                        value={role}
                        disabled={!canAssignRole(role)}
                      >
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role)}
                          <span className="capitalize">{role}</span>
                          {!canAssignRole(role) && (
                            <span className="text-xs text-muted-foreground">(Not allowed)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.role}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(formData.role)}
                </p>
              </div>

              {/* Lead Assignment */}
              <div className="space-y-2">
                <Label htmlFor="leadId">Assign Lead</Label>
                <Select 
                  value={formData.leadId} 
                  onValueChange={(value) => handleChange('leadId', value)}
                  disabled={loading || loadingLeads}
                >
                  <SelectTrigger className={errors.leadId ? 'border-red-300 focus:border-red-500' : ''}>
                    <SelectValue placeholder="Select a lead (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Lead</SelectItem>
                    {availableLeads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(lead.role)}
                          <span>{lead.name}</span>
                          <span className="text-xs text-muted-foreground">({lead.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.leadId && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.leadId}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Approval requests from this user will be sent to the assigned lead
                </p>
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
                    Inactive users cannot login or create requests
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
                      {isEditing ? 'Update' : 'Create'} User
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