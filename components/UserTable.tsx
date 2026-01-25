'use client'

import React from 'react'
import { DataTable, ColumnDef } from './ui/data-table'
import { User } from '@/lib/types'
import { Button } from './ui/button'
import { Eye } from 'lucide-react'
import { Badge } from './ui/badge'

/**
 * Props for the UserTable component
 */
export interface UserTableProps {
  /** Array of users to display */
  users: User[]
  /** Callback when view detail button is clicked */
  onViewDetail: (user: User) => void
  /** Optional callback when edit button is clicked */
  onEdit?: (user: User) => void
  /** Optional callback when delete button is clicked */
  onDelete?: (user: User) => void
  /** Whether the table is in a loading state */
  loading?: boolean
}

/**
 * Get role badge variant based on user role
 */
function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'finance':
      return 'default' // Green
    case 'head':
      return 'secondary' // Blue/Gray
    case 'lead':
      return 'outline' // Yellow/Outline
    case 'tester':
    default:
      return 'outline'
  }
}

/**
 * Get human-readable role label
 */
function getRoleLabel(role: string): string {
  switch (role) {
    case 'finance':
      return 'Finance'
    case 'head':
      return 'Head'
    case 'lead':
      return 'Lead'
    case 'tester':
      return 'Tester'
    default:
      return role
  }
}

/**
 * UserTable component displays users in a table format
 * Uses the DataTable component with custom column definitions
 * 
 * Requirements: 15.2, 15.5, 15.6, 15.8
 */
export function UserTable({ 
  users, 
  onViewDetail, 
  onEdit, 
  onDelete, 
  loading = false 
}: UserTableProps) {
  // Define columns for the user table
  const columns: ColumnDef<User>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '180px',
      accessor: (row) => row.name,
      render: (value) => (
        <div className="max-w-[180px] truncate" title={value}>
          {value || '-'}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      width: '220px',
      accessor: (row) => row.email,
      render: (value) => (
        <div className="max-w-[220px] truncate" title={value}>
          {value || '-'}
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      width: '120px',
      accessor: (row) => row.role,
      render: (value: string) => (
        <Badge variant={getRoleBadgeVariant(value)}>
          {getRoleLabel(value)}
        </Badge>
      ),
    },
    {
      key: 'leadName',
      label: 'Lead',
      sortable: true,
      width: '150px',
      accessor: (row) => row.leadName || '-',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '120px',
      accessor: (row) => row.status,
      render: (value: 'ACTIVE' | 'INACTIVE') => (
        <Badge variant={value === 'ACTIVE' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      width: '200px',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetail(row)
            }}
            data-testid="view-detail-button"
            aria-label={`View details for user ${row.name}`}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Detail
          </Button>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row)
              }}
              aria-label={`Edit user ${row.name}`}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row)
              }}
              className="text-destructive hover:text-destructive"
              aria-label={`Delete user ${row.name}`}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={users}
      columns={columns}
      loading={loading}
      emptyMessage="No users found"
      keyboardNavigation={true}
    />
  )
}
