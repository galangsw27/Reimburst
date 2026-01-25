'use client'

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Card, CardContent } from './card'

/**
 * Column definition for the data table
 * @template T - The type of data being displayed in the table
 */
export interface ColumnDef<T> {
  /** Unique key for the column */
  key: string
  /** Display label for the column header */
  label: string
  /** Whether the column is sortable */
  sortable?: boolean
  /** Optional width for the column (e.g., '200px', '20%') */
  width?: string
  /** Custom render function for the cell content */
  render?: (value: any, row: T, index: number) => React.ReactNode
  /** Accessor function to get the value from the row */
  accessor?: (row: T) => any
}

/**
 * Props for the DataTable component
 * @template T - The type of data being displayed in the table
 */
export interface DataTableProps<T> {
  /** Array of data to display in the table */
  data: T[]
  /** Column definitions */
  columns: ColumnDef<T>[]
  /** Whether the table is in a loading state */
  loading?: boolean
  /** Message to display when the table is empty */
  emptyMessage?: string
  /** Callback when a row is clicked */
  onRowClick?: (row: T, index: number) => void
  /** Custom class name for the table container */
  className?: string
  /** Whether to enable keyboard navigation */
  keyboardNavigation?: boolean
}

type SortDirection = 'asc' | 'desc' | null

/**
 * Generic data table component with sorting, loading states, and keyboard navigation
 * @template T - The type of data being displayed in the table
 */
export function DataTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  keyboardNavigation = true,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1)
  const tableRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])

  // Reset focused row when data changes
  useEffect(() => {
    setFocusedRowIndex(-1)
    rowRefs.current = []
  }, [data])

  // Get value from row using accessor or key
  const getCellValue = (row: T, column: ColumnDef<T>): any => {
    if (column.accessor) {
      return column.accessor(row)
    }
    return (row as any)[column.key]
  }

  // Handle column header click for sorting
  const handleSort = (column: ColumnDef<T>) => {
    if (!column.sortable) return

    if (sortColumn === column.key) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortColumn(null)
      }
    } else {
      setSortColumn(column.key)
      setSortDirection('asc')
    }
  }

  // Sort data based on current sort state
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return data
    }

    const column = columns.find(col => col.key === sortColumn)
    if (!column) return data

    return [...data].sort((a, b) => {
      const aValue = getCellValue(a, column)
      const bValue = getCellValue(b, column)

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1

      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === 'asc' ? comparison : -comparison
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime() 
          : bValue.getTime() - aValue.getTime()
      }

      // Default string comparison
      const aStr = String(aValue)
      const bStr = String(bValue)
      const comparison = aStr.localeCompare(bStr)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortColumn, sortDirection, columns])

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!keyboardNavigation || sortedData.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedRowIndex(prev => {
          const next = Math.min(prev + 1, sortedData.length - 1)
          rowRefs.current[next]?.focus()
          return next
        })
        break

      case 'ArrowUp':
        event.preventDefault()
        setFocusedRowIndex(prev => {
          const next = Math.max(prev - 1, 0)
          rowRefs.current[next]?.focus()
          return next
        })
        break

      case 'Enter':
        event.preventDefault()
        if (focusedRowIndex >= 0 && focusedRowIndex < sortedData.length && onRowClick) {
          onRowClick(sortedData[focusedRowIndex], focusedRowIndex)
        }
        break

      case 'Home':
        event.preventDefault()
        setFocusedRowIndex(0)
        rowRefs.current[0]?.focus()
        break

      case 'End':
        event.preventDefault()
        const lastIndex = sortedData.length - 1
        setFocusedRowIndex(lastIndex)
        rowRefs.current[lastIndex]?.focus()
        break
    }
  }

  // Handle row click
  const handleRowClick = (row: T, index: number) => {
    setFocusedRowIndex(index)
    onRowClick?.(row, index)
  }

  // Render sort icon
  const renderSortIcon = (column: ColumnDef<T>) => {
    if (!column.sortable) return null

    if (sortColumn !== column.key) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-muted-foreground" />
    }

    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4 ml-1 text-primary" />
    }

    return <ChevronDown className="w-4 h-4 ml-1 text-primary" />
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={`w-full overflow-x-auto ${className}`}>
        <div className="min-w-full">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-4 py-3 text-left text-sm font-semibold text-foreground"
                        style={{ width: column.width }}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-4">
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Empty state
  if (sortedData.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Data</h3>
            <p className="text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Data table
  return (
    <div
      ref={tableRef}
      className={`w-full overflow-x-auto ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={keyboardNavigation ? 0 : undefined}
    >
      <div className="min-w-full">
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 text-left text-sm font-semibold text-foreground ${
                        column.sortable ? 'cursor-pointer hover:bg-muted/70 transition-colors' : ''
                      }`}
                      style={{ width: column.width }}
                      onClick={() => handleSort(column)}
                      role={column.sortable ? 'button' : undefined}
                      aria-sort={
                        sortColumn === column.key
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <div className="flex items-center">
                        {column.label}
                        {renderSortIcon(column)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    ref={(el) => {
                      rowRefs.current[rowIndex] = el
                    }}
                    className={`
                      border-b border-border last:border-0 
                      transition-colors
                      ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                      ${focusedRowIndex === rowIndex ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''}
                    `}
                    onClick={() => handleRowClick(row, rowIndex)}
                    tabIndex={keyboardNavigation ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    aria-label={onRowClick ? `Row ${rowIndex + 1}` : undefined}
                  >
                    {columns.map((column) => {
                      const value = getCellValue(row, column)
                      const content = column.render
                        ? column.render(value, row, rowIndex)
                        : value != null
                        ? String(value)
                        : '-'

                      return (
                        <td
                          key={column.key}
                          className="px-4 py-4 text-sm text-foreground"
                        >
                          {content}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
