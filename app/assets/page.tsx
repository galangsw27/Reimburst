'use client'

import React, { useState, useEffect } from 'react'
import { AssetTable } from '@/components/AssetTable'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Asset } from '@/lib/types'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, X, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/providers/AuthProvider'
import { AssetForm } from '@/components/AssetForm'
import { motion } from 'framer-motion'

export default function AssetsPage() {
  const { user } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Asset | null>(null)
  const [viewDetailAsset, setViewDetailAsset] = useState<Asset | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')

  // Check if user can manage assets (tester, lead, head)
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
  const filteredAssets = React.useMemo(() => {
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
  }

  // Handle asset deletion
  const handleDelete = async (asset: Asset) => {
    try {
      await apiClient.delete(`/api/assets/${asset.id}`)
      setDeleteConfirm(null)
      fetchAssets()
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

  // Handle view detail
  const handleViewDetail = (asset: Asset) => {
    setViewDetailAsset(asset)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Asset Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage asset database for reimbursement validation ({filteredAssets.length} assets)
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

          {/* Asset Table */}
          <AssetTable
            assets={filteredAssets}
            onViewDetail={handleViewDetail}
            onEdit={canManageAssets ? handleEdit : undefined}
            onDelete={canManageAssets ? (asset) => setDeleteConfirm(asset) : undefined}
            loading={loading}
          />

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
                    <p className="font-medium">{deleteConfirm.description}</p>
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

          {/* View Detail Modal */}
          {viewDetailAsset && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setViewDetailAsset(null)}
            >
              <motion.div
                className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">Asset Details</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Asset Number:</span>
                    <p className="font-medium">{viewDetailAsset.assetNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Description:</span>
                    <p className="font-medium">{viewDetailAsset.description}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Registration Date:</span>
                    <p className="font-medium">{new Date(viewDetailAsset.registrationDate).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <p className="font-medium">{viewDetailAsset.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Created By:</span>
                    <p className="font-medium">{viewDetailAsset.createdBy}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Created At:</span>
                    <p className="font-medium">{new Date(viewDetailAsset.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewDetailAsset(null)} 
                    className="flex-1"
                  >
                    Close
                  </Button>
                  {canManageAssets && (
                    <Button
                      onClick={() => {
                        setViewDetailAsset(null)
                        handleEdit(viewDetailAsset)
                      }}
                      className="flex-1"
                    >
                      Edit Asset
                    </Button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}