'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Search, Filter, X, AlertCircle, CheckCircle, User as UserIcon, Crown, Shield, DollarSign } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useAuth } from '@/providers/AuthProvider'
import { User, UserRole } from '@/lib/types'
import { UserForm } from './UserForm'
import { apiClient } from '@/lib/api/client'

interface UserListProps {
  onUpdate?: () => void
}

export const UserList: React.FC<UserListProps> = ({ onUpdate }) => {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')

  // Check if user can manage users (lead, head - not finance or tester)
  const canManageUsers = user && ['lead', 'head'].includes(user.role)

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
  const filteredUsers = useMemo(() => {
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
    onUpdate?.()
  }

  // Handle user deletion
  const handleDelete = async (userToDelete: User) => {
    try {
      await apiClient.delete(`/api/users/${userToDelete.id}`)
      setDeleteConfirm(null)
      fetchUsers()
      onUpdate?.()
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

  // Handle status toggle
  const handleStatusToggle = async (userToUpdate: User) => {
    try {
      const newStatus = userToUpdate.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      await apiClient.put(`/api/users/${userToUpdate.id}`, { status: newStatus })
      fetchUsers()
      onUpdate?.()
    } catch (err) {
      console.error('Error updating user status:', err)
      setError('Failed to update user status')
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('all')
    setStatusFilter('all')
  }

  // Get role icon and styling
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

  const getRoleBadge = (role: UserRole) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1'
    switch (role) {
      case 'tester':
        return `${baseClasses} bg-blue-500/20 text-blue-500`
      case 'lead':
        return `${baseClasses} bg-purple-500/20 text-purple-500`
      case 'head':
        return `${baseClasses} bg-orange-500/20 text-orange-500`
      case 'finance':
        return `${baseClasses} bg-green-500/20 text-green-500`
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-500`
    }
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
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users ({filteredUsers.length})</h2>
          <p className="text-muted-foreground">
            Manage users and their roles in the system
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

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {users.length === 0 ? 'No Users Yet' : 'No Users Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {users.length === 0 
                ? 'Get started by creating your first user.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {canManageUsers && users.length === 0 && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First User
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((userItem) => (
            <motion.div
              key={userItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate flex items-center gap-2" title={userItem.name}>
                        {getRoleIcon(userItem.role)}
                        {userItem.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate" title={userItem.email}>
                        {userItem.email}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(userItem.status)}`}>
                        {userItem.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-4">
                    {/* Role Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Role:</span>
                      <span className={getRoleBadge(userItem.role)}>
                        {getRoleIcon(userItem.role)}
                        {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                      </span>
                    </div>

                    {/* Lead Information */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Lead:</span>
                      <span className="text-sm font-medium">
                        {userItem.leadName || 'No Lead'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canManageUsers && (
                    <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(userItem)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteConfirm(userItem)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Status Toggle */}
                      <Button
                        size="sm"
                        variant={userItem.status === 'ACTIVE' ? 'destructive' : 'default'}
                        onClick={() => handleStatusToggle(userItem)}
                        className="w-full"
                      >
                        {userItem.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

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
              <div>
                <span className="text-sm text-muted-foreground">Role:</span>
                <p className="font-medium">{deleteConfirm.role}</p>
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
    </div>
  )
}