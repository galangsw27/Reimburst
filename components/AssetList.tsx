'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Search, Filter, X, AlertCircle, CheckCircle, Package } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useAuth } from '@/providers/AuthProvider'
import { Asset } from '@/lib/types'
import { AssetForm } from '@/components/AssetForm'
import { apiClient } from '@/lib/api/client'

interface AssetListProps {
  onUpdate?: () => void
}

export const AssetList: React.FC<AssetListProps> = ({ onUpdate }) => {
  const { user } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Asset | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')

  // Check if user can manage assets (tester, lead, head - not finance)
  const canManageAssets = user && ['tester', 'lead', 'head'].includes(user.role)

  // Fetch assets from API
  const fetchAssets = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      const response = await apiClient.get(`/api/assets?${params.toString()}`)
      
      if (response.data.success) {
        setAssets(response.data.data)
      } else {
        throw new Error(response.data.error || 'Failed to fetch assets')
      }
    } catch (err: any) {
      console.error('Error fetching assets:', err)
      setError(err.response?.data?.error || 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  // Load assets on component mount and when filters change
  useEffect(() => {
    fetchAssets()
  }, [statusFilter])

  // Filter assets based on search term
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = searchTerm === '' || 
        asset.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [assets, searchTerm])

  // Handle asset creation/update
  const handleAssetSaved = () => {
    setShowForm(false)
    setEditingAsset(null)
    fetchAssets()
    onUpdate?.()
  }

  // Handle asset deletion
  const handleDelete = async (asset: Asset) => {
    try {
      await apiClient.delete(`/api/assets/${asset.id}`)
      setDeleteConfirm(null)
      fetchAssets()
      onUpdate?.()
    } catch (err: any) {
      console.error('Error deleting asset:', err)
      setError(err.response?.data?.error || 'Failed to delete asset')
    }
  }

  // Handle edit asset
  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset)
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

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assets ({filteredAssets.length})</h2>
          <p className="text-muted-foreground">
            Manage asset database for reimbursement validation
          </p>
        </div>
        
        {canManageAssets && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
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
                onClick={fetchAssets}
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
              <Label>Search Assets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by asset number or description..."
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

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {assets.length === 0 ? 'No Assets Yet' : 'No Assets Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {assets.length === 0 
                ? 'Get started by creating your first asset.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {canManageAssets && assets.length === 0 && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Asset
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" title={asset.assetNumber}>
                        {asset.assetNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2" title={asset.description}>
                        {asset.description}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(asset.status)}`}>
                      {asset.status}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div>
                      <span>Registration Date:</span>{' '}
                      {formatDate(asset.registrationDate)}
                    </div>
                    <div>
                      <span>Created:</span>{' '}
                      {formatDate(asset.createdAt)}
                    </div>
                    <div>
                      <span>Updated:</span>{' '}
                      {formatDate(asset.updatedAt)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canManageAssets && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(asset)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(asset)}
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

      {/* Asset Form Modal */}
      {showForm && (
        <AssetForm
          asset={editingAsset}
          onSave={handleAssetSaved}
          onCancel={() => {
            setShowForm(false)
            setEditingAsset(null)
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
              Delete Asset
            </h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this asset? This action cannot be undone.
            </p>
            <div className="space-y-2 mb-6 p-4 bg-muted/50 rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Asset Number:</span>
                <p className="font-medium">{deleteConfirm.assetNumber}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Description:</span>
                <p className="font-medium line-clamp-2">{deleteConfirm.description}</p>
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
                Delete Asset
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}