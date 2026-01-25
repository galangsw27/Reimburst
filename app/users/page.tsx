'use client'

import React, { useState, useEffect } from 'react'
import { UserTable } from '@/components/UserTable'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { User, UserRole } from '@/lib/types'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, X, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/providers/AuthProvider'
import { UserForm } from '@/components/UserForm'
import { motion } from 'framer-motion'

/**
 * Users Management Page
 * 
 * This page provides the user management interface for the system.
 * It displays a list of all users with filtering, search, and CRUD operations.
 * 
 * Access Control:
 * - Only users with 'lead' or 'head' roles can access this page
 * - Based on the role matrix from requirements 1.1 and 1.2
 * 
 * Features:
 * - User listing with status indicators
 * - Role-based filtering and search
 * - Lead assignment interface
 * - Status management (ACTIVE/INACTIVE)
 * - Role matrix enforcement in UI
 * 
 * Requirements: 1.1, 1.2, 15.2, 15.9, 15.13, 15.14
 */
export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  const [viewDetailUser, setViewDetailUser] = useState<User | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')

  // Check if user can manage users (lead, head)
  const canManageUsers = currentUser && ['lead', 'head'].includes(currentUser.role)

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get('/api/users')
      setUsers(response.data)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Load users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users based on search term, role, and status
  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.leadName && user.leadName.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  // Handle user creation/update
  const handleUserSaved = () => {
    setShowForm(false)
    setEditingUser(null)
    fetchUsers()
  }

  // Handle user deletion
  const handleDelete = async (userToDelete: User) => {
    try {
      await apiClient.delete(`/api/users/${userToDelete.id}`)
      setDeleteConfirm(null)
      fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      setError('Failed to delete user')
    }
  }

  // Handle edit user
  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit)
    setShowForm(true)
  }

  // Handle view detail
  const handleViewDetail = (user: User) => {
    setViewDetailUser(user)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('all')
    setStatusFilter('all')
  }

  return (
    <ProtectedRoute requiredRoles={['lead', 'head']}>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage users and their roles ({filteredUsers.length} users)
              </p>
            </div>
            
            {canManageUsers && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
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
                    onClick={fetchUsers}
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
                {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or lead..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as 'all' | UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="tester">Tester</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="head">Head</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
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
              {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">Active filters:</span>
                  {searchTerm && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {roleFilter !== 'all' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Role: {roleFilter}
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

          {/* User Table */}
          <UserTable
            users={filteredUsers}
            onViewDetail={handleViewDetail}
            onEdit={canManageUsers ? handleEdit : undefined}
            onDelete={canManageUsers ? (user) => setDeleteConfirm(user) : undefined}
            loading={loading}
          />

          {/* User Form Modal */}
          {showForm && (
            <UserForm
              user={editingUser}
              onSave={handleUserSaved}
              onCancel={() => {
                setShowForm(false)
                setEditingUser(null)
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
                  Delete User
                </h3>
                <p className="text-muted-foreground mb-4">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
                <div className="space-y-2 mb-6 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <p className="font-medium">{deleteConfirm.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium">{deleteConfirm.email}</p>
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
                    Delete User
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* View Detail Modal */}
          {viewDetailUser && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setViewDetailUser(null)}
            >
              <motion.div
                className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">User Details</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <p className="font-medium">{viewDetailUser.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium">{viewDetailUser.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <p className="font-medium capitalize">{viewDetailUser.role}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Lead:</span>
                    <p className="font-medium">{viewDetailUser.leadName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <p className="font-medium">{viewDetailUser.status}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewDetailUser(null)} 
                    className="flex-1"
                  >
                    Close
                  </Button>
                  {canManageUsers && (
                    <Button
                      onClick={() => {
                        setViewDetailUser(null)
                        handleEdit(viewDetailUser)
                      }}
                      className="flex-1"
                    >
                      Edit User
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