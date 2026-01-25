'use client'

import React, { useState } from 'react'
import { Project } from '@/lib/types'
import { useProjects } from '@/lib/hooks/useProjects'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Props for the ProjectPanel component
 */
export interface ProjectPanelProps {
  /** Currently selected project */
  selectedProject: Project | null
  /** Callback when a project is selected */
  onSelectProject: (project: Project) => void
  /** Optional custom class name */
  className?: string
}

/**
 * Props for individual project items
 */
interface ProjectItemProps {
  project: Project
  isSelected: boolean
  onClick: () => void
}

/**
 * Individual project item component
 */
function ProjectItem({ project, isSelected, onClick }: ProjectItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-lg transition-all',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary',
        isSelected && 'bg-primary/10 border-l-4 border-primary'
      )}
      aria-pressed={isSelected}
      aria-label={`Select project ${project.name}`}
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm">{project.name}</span>
        <span className="text-xs text-muted-foreground">{project.projectId}</span>
      </div>
    </button>
  )
}

/**
 * Loading skeleton for project list
 */
function ProjectListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="px-4 py-3 rounded-lg">
          <div className="h-4 bg-muted animate-pulse rounded mb-2" />
          <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

/**
 * Error state component with retry button
 */
interface ErrorStateProps {
  error: string
  onRetry: () => void
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="text-sm font-semibold mb-2">Failed to Load Projects</h3>
      <p className="text-xs text-muted-foreground mb-4">{error}</p>
      <Button
        onClick={onRetry}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </Button>
    </div>
  )
}

/**
 * ProjectPanel Component
 * 
 * Left panel displaying a list of active projects for filtering requests.
 * 
 * Features:
 * - Fetches and displays all active projects from the database
 * - Shows loading state with skeleton loaders
 * - Shows error state with retry button
 * - Displays project name and project ID for each project
 * - Implements project selection with visual feedback
 * - Scrollable when project list exceeds panel height
 * - Selected state styling with bg-primary/10 and border-l-4
 * 
 * Requirements: 2.2, 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8
 */
export function ProjectPanel({
  selectedProject,
  onSelectProject,
  className,
}: ProjectPanelProps) {
  const { activeProjects, loading, error, refetch } = useProjects()
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <div
      className={cn(
        'bg-muted/30 border-r border-border flex flex-col h-full transition-all duration-300',
        isMinimized ? 'w-[60px]' : 'w-[300px]',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isMinimized && (
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Projects</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select a project to view requests
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(!isMinimized)}
          className="h-8 w-8 p-0"
          title={isMinimized ? 'Expand panel' : 'Minimize panel'}
        >
          {isMinimized ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto">
          {loading && <ProjectListSkeleton />}

          {error && !loading && (
            <ErrorState error={error} onRetry={refetch} />
          )}

          {!loading && !error && activeProjects.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No active projects found
              </p>
            </div>
          )}

          {!loading && !error && activeProjects.length > 0 && (
            <div className="space-y-1 p-4">
              {activeProjects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  isSelected={selectedProject?.id === project.id}
                  onClick={() => onSelectProject(project)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Minimized state - show selected project indicator */}
      {isMinimized && selectedProject && (
        <div className="flex-1 flex items-start justify-center pt-4">
          <div className="w-2 h-8 bg-primary rounded-full" title={selectedProject.name} />
        </div>
      )}
    </div>
  )
}
