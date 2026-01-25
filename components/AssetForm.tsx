'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Save, AlertCircle, CheckCircle, Search } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Asset } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'
import { apiClient } from '@/lib/api/client'

interface AssetFormProps {
  asset?: Asset | null
  onSave: () => void
  onCancel: () => void
}

interface FormData {
  assetNumber: string
  description: string
  registrationDate: string
  status: 'ACTIVE' | 'INACTIVE'
}

interface FormErrors {
  assetNumber?: string
  description?: string
  registrationDate?: string
  status?: string
  general?: string
}

export const AssetForm: React.FC<AssetFormProps> = ({ asset, onSave, onCancel }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    assetNumber: '',
    description: '',
    registrationDate: '',
    status: 'ACTIVE'
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validatingAssetNumber, setValidatingAssetNumber] = useState(false)

  const isEditing = !!asset

  // Initialize form data when asset prop changes
  useEffect(() => {
    if (asset) {
      setFormData({
        assetNumber: asset.assetNumber,
        description: asset.description,
        registrationDate: new Date(asset.registrationDate).toISOString().split('T')[0],
        status: asset.status
      })
    } else {
      setFormData({
        assetNumber: '',
        description: '',
        registrationDate: '',
        status: 'ACTIVE'
      })
    }
    setErrors({})
    setSuccess(false)
  }, [asset])

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

  // Validate asset number uniqueness (only for new assets or when changing asset number)
  const validateAssetNumber = async (assetNumber: string): Promise<boolean> => {
    if (!assetNumber.trim()) return false
    
    // Skip validation if editing and asset number hasn't changed
    if (isEditing && asset && assetNumber === asset.assetNumber) {
      return true
    }

    try {
      setValidatingAssetNumber(true)
      const response = await apiClient.post('/api/assets/validate', 
        { assetNumber: assetNumber.trim() }
      )

      if (response.data.success) {
        return response.data.data.isUnique
      }
      return false
    } catch (error) {
      console.error('Error validating asset number:', error)
      return false
    } finally {
      setValidatingAssetNumber(false)
    }
  }

  // Validate form data
  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {}

    // Validate asset number
    if (!formData.assetNumber.trim()) {
      newErrors.assetNumber = 'Asset number is required'
    } else {
      const isUnique = await validateAssetNumber(formData.assetNumber)
      if (!isUnique) {
        newErrors.assetNumber = 'Asset number already exists'
      }
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = 'Asset description is required'
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Asset description must be at least 10 characters'
    }

    // Validate registration date
    if (!formData.registrationDate) {
      newErrors.registrationDate = 'Registration date is required'
    } else {
      const regDate = new Date(formData.registrationDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      if (regDate > today) {
        newErrors.registrationDate = 'Registration date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!(await validateForm())) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const payload = {
        assetNumber: formData.assetNumber.trim(),
        description: formData.description.trim(),
        registrationDate: formData.registrationDate,
        ...(isEditing && { status: formData.status })
      }

      if (isEditing && asset) {
        // Update existing asset
        await apiClient.put(`/api/assets/${asset.id}`, payload)
      } else {
        // Create new asset
        await apiClient.post('/api/assets', payload)
      }

      setSuccess(true)
      
      // Show success message briefly then close
      setTimeout(() => {
        onSave()
      }, 1000)

    } catch (error: any) {
      console.error('Error saving asset:', error)
      
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error
        
        if (errorMessage.includes('already exists') || errorMessage.includes('unique')) {
          setErrors({ assetNumber: 'Asset number already exists' })
        } else if (errorMessage.includes('required')) {
          setErrors({ general: errorMessage })
        } else if (errorMessage.includes('future')) {
          setErrors({ registrationDate: errorMessage })
        } else {
          setErrors({ general: errorMessage })
        }
      } else {
        setErrors({ general: 'Failed to save asset. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle asset matching via webhook (for description assistance)
  const handleAssetMatch = async () => {
    if (!formData.description.trim()) {
      setErrors({ description: 'Enter a description first to get asset suggestions' })
      return
    }

    try {
      const response = await apiClient.post('/api/assets/validate', 
        { description: formData.description.trim() }
      )

      if (response.data.success && response.data.data) {
        // This would integrate with the existing asset matching webhook
        // For now, we'll just show a success message
        console.log('Asset match result:', response.data.data)
      }
    } catch (error) {
      console.error('Error matching asset:', error)
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
        className="bg-background border border-border rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {isEditing ? 'Edit Asset' : 'Add New Asset'}
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
                <span>Asset {isEditing ? 'updated' : 'created'} successfully!</span>
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
              {/* Asset Number */}
              <div className="space-y-2">
                <Label htmlFor="assetNumber">
                  Asset Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="assetNumber"
                    placeholder="e.g., AST-001-2024"
                    value={formData.assetNumber}
                    onChange={(e) => handleChange('assetNumber', e.target.value)}
                    disabled={loading}
                    className={errors.assetNumber ? 'border-red-300 focus:border-red-500' : ''}
                  />
                  {validatingAssetNumber && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {errors.assetNumber && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.assetNumber}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter a unique asset number for identification
                </p>
              </div>

              {/* Asset Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Asset Description <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="Describe the asset (e.g., Laptop Dell Inspiron 15, Monitor Samsung 24 inch, etc.)"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    disabled={loading}
                    rows={3}
                    className={errors.description ? 'border-red-300 focus:border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAssetMatch}
                    className="absolute top-2 right-2"
                    disabled={loading || !formData.description.trim()}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                {errors.description && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Provide a detailed description. Click the search icon to get asset suggestions.
                </p>
              </div>

              {/* Registration Date */}
              <div className="space-y-2">
                <Label htmlFor="registrationDate">
                  Registration Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="registrationDate"
                  type="date"
                  value={formData.registrationDate}
                  onChange={(e) => handleChange('registrationDate', e.target.value)}
                  disabled={loading}
                  max={new Date().toISOString().split('T')[0]} // Prevent future dates
                  className={errors.registrationDate ? 'border-red-300 focus:border-red-500' : ''}
                />
                {errors.registrationDate && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.registrationDate}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Date when the asset was registered in the system
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
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only active assets are available for reimbursement validation
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
                  disabled={loading || success || validatingAssetNumber}
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
                      {isEditing ? 'Update' : 'Create'} Asset
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