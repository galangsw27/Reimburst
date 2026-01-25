'use client'

import { Project, Reimbursement } from '@/lib/types'
import { Button } from './ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RequestTable } from './RequestTable'

/**
 * Props for the RequestPanel component
 */
export interface RequestPanelProps {
  /** Currently selected project (null if no project selected) */
  selectedProject: Project | null
  /** Array of requests to display */
  requests: Reimbursement[]
  /** Whether the requests are loading */
  loading?: boolean
  /** Callback when Add Request button is clicked */
  onAddRequest: () => void
  /** Callback when view detail button is clicked */
  onViewDetail: (request: Reimbursement) => void
  /** Callback when approve button is clicked (for lead/head) */
  onApprove?: (request: Reimbursement) => void
  /** Callback when reject button is clicked (for lead/head) */
  onReject?: (request: Reimbursement) => void
  /** Callback when batch submit is clicked (for lead/head) */
  onBatchSubmit?: (requests: Reimbursement[]) => void
  /** Optional custom class name */
  className?: string
}

/**
 * Props for the EmptyState component
 */
interface EmptyStateProps {
  message: string
  icon?: React.ReactNode
}

/**
 * EmptyState component for when no project is selected
 */
function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {icon && (
        <div className="w-16 h-16 mb-4 bg-muted rounded-full flex items-center justify-center">
          {icon}
        </div>
      )}
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

/**
 * Loading skeleton for request table
 */
function RequestTableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="p-4 rounded-lg border border-border">
          <div className="h-4 bg-muted animate-pulse rounded mb-3" />
          <div className="h-3 bg-muted animate-pulse rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

/**
 * RequestPanel Component
 * 
 * Right panel displaying requests table or empty state when no project is selected.
 * 
 * Features:
 * - Shows empty state with message when no project is selected
 * - Displays RequestTable when project is selected
 * - Shows loading state with skeleton loaders
 * - Includes prominent "Add Request" button
 * - Styled as flex-1 to fill remaining space
 * 
 * Requirements: 2.4, 2.8, 5.1
 */
export function RequestPanel({
  selectedProject,
  requests,
  loading = false,
  onAddRequest,
  onViewDetail,
  onApprove,
  onReject,
  onBatchSubmit,
  className,
}: RequestPanelProps) {
  return (
    <div
      className={cn(
        'flex-1 flex flex-col h-full bg-background',
        className
      )}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty state when no project is selected */}
        {!selectedProject && (
          <EmptyState
            message="Silahkan klik project terlebih dahulu untuk melihat request list"
            icon={
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
          />
        )}

        {/* Loading state */}
        {selectedProject && loading && <RequestTableSkeleton />}

        {/* Empty state when project is selected but no requests */}
        {selectedProject && !loading && requests.length === 0 && (
          <EmptyState
            message="No requests found for this project"
            icon={
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
            }
          />
        )}

        {/* Request table - will be implemented in task 5.1 */}
        {selectedProject && !loading && requests.length > 0 && (
          <div className="p-6">
            <RequestTable 
              requests={requests} 
              onViewDetail={onViewDetail}
              onApprove={onApprove}
              onReject={onReject}
              onBatchSubmit={onBatchSubmit}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  )
}
