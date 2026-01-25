'use client'

import React from 'react'
import { DataTable, ColumnDef } from './ui/data-table'
import { Project } from '@/lib/types'
import { Button } from './ui/button'
import { Eye } from 'lucide-react'
import { Badge } from './ui/badge'

/**
 * Props for the ProjectTable component
 */
export interface ProjectTableProps {
  /** Array of projects to display */
  projects: Project[]
  /** Callback when view detail button is clicked */
  onViewDetail: (project: Project) => void
  /** Optional callback when edit button is clicked */
  onEdit?: (project: Project) => void
  /** Optional callback when delete button is clicked */
  onDelete?: (project: Project) => void
  /** Whether the table is in a loading state */
  loading?: boolean
}

/**
 * Format date to DD/MM/YYYY format
 */
function formatDate(date: Date): string {
  try {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return '-'
  }
}

/**
 * ProjectTable component displays projects in a table format
 * Uses the DataTable component with custom column definitions
 * 
 * Requirements: 15.1, 15.5, 15.6, 15.8
 */
export function ProjectTable({ 
  projects, 
  onViewDetail, 
  onEdit, 
  onDelete, 
  loading = false 
}: ProjectTableProps) {
  // Define columns for the project table
  const columns: ColumnDef<Project>[] = [
    {
      key: 'projectId',
      label: 'Project ID',
      sortable: true,
      width: '150px',
      accessor: (row) => row.projectId,
    },
    {
      key: 'name',
      label: 'Project Name',
      sortable: true,
      width: '250px',
      accessor: (row) => row.name,
      render: (value) => (
        <div className="max-w-[250px] truncate" title={value}>
          {value || '-'}
        </div>
      ),
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
      key: 'createdAt',
      label: 'Created Date',
      sortable: true,
      width: '140px',
      accessor: (row) => row.createdAt,
      render: (value: Date) => formatDate(value),
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
            aria-label={`View details for project ${row.name}`}
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
              aria-label={`Edit project ${row.name}`}
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
              aria-label={`Delete project ${row.name}`}
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
      data={projects}
      columns={columns}
      loading={loading}
      emptyMessage="No projects found"
      keyboardNavigation={true}
    />
  )
}
