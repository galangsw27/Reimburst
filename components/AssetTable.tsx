'use client'

import React from 'react'
import { DataTable, ColumnDef } from './ui/data-table'
import { Asset } from '@/lib/types'
import { Button } from './ui/button'
import { Eye } from 'lucide-react'
import { Badge } from './ui/badge'

/**
 * Props for the AssetTable component
 */
export interface AssetTableProps {
  /** Array of assets to display */
  assets: Asset[]
  /** Callback when view detail button is clicked */
  onViewDetail: (asset: Asset) => void
  /** Optional callback when edit button is clicked */
  onEdit?: (asset: Asset) => void
  /** Optional callback when delete button is clicked */
  onDelete?: (asset: Asset) => void
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
 * AssetTable component displays assets in a table format
 * Uses the DataTable component with custom column definitions
 * 
 * Requirements: 15.3, 15.5, 15.6, 15.8
 */
export function AssetTable({ 
  assets, 
  onViewDetail, 
  onEdit, 
  onDelete, 
  loading = false 
}: AssetTableProps) {
  // Define columns for the asset table
  const columns: ColumnDef<Asset>[] = [
    {
      key: 'assetNumber',
      label: 'Asset Number',
      sortable: true,
      width: '150px',
      accessor: (row) => row.assetNumber,
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      accessor: (row) => row.description,
      render: (value) => (
        <div className="max-w-md truncate" title={value}>
          {value || '-'}
        </div>
      ),
    },
    {
      key: 'registrationDate',
      label: 'Registration Date',
      sortable: true,
      width: '160px',
      accessor: (row) => row.registrationDate,
      render: (value: Date) => formatDate(value),
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
            aria-label={`View details for asset ${row.assetNumber}`}
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
              aria-label={`Edit asset ${row.assetNumber}`}
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
              aria-label={`Delete asset ${row.assetNumber}`}
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
      data={assets}
      columns={columns}
      loading={loading}
      emptyMessage="No assets found"
      keyboardNavigation={true}
    />
  )
}
