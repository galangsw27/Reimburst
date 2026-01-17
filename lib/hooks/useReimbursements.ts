'use client'

import { useLocalStorage } from './useLocalStorage'
import { Reimbursement, ReimbursementStatus, ProjectType } from '@/lib/types'

/**
 * Custom hook for managing reimbursement data with localStorage persistence
 * 
 * Features:
 * - Persistent storage using localStorage
 * - CRUD operations for reimbursements
 * - Query methods for filtering by status and project
 * - Hydration-safe with mounted flag
 * 
 * @returns Object containing reimbursements array, CRUD methods, query methods, and mounted flag
 */
export function useReimbursements() {
  const [reimbursements, setReimbursements, mounted] = useLocalStorage<Reimbursement[]>(
    'reimbursements',
    []
  )

  /**
   * Add a new reimbursement to the collection
   * @param reimbursement - The reimbursement object to add
   */
  const addReimbursement = (reimbursement: Reimbursement) => {
    setReimbursements(prev => [...prev, reimbursement])
  }

  /**
   * Update an existing reimbursement by ID
   * @param id - The ID of the reimbursement to update
   * @param updates - Partial reimbursement object with fields to update
   */
  const updateReimbursement = (id: string, updates: Partial<Reimbursement>) => {
    setReimbursements(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    )
  }

  /**
   * Delete a reimbursement by ID
   * @param id - The ID of the reimbursement to delete
   */
  const deleteReimbursement = (id: string) => {
    setReimbursements(prev => prev.filter(r => r.id !== id))
  }

  /**
   * Get all reimbursements with a specific status
   * @param status - The status to filter by
   * @returns Array of reimbursements matching the status
   */
  const getByStatus = (status: ReimbursementStatus): Reimbursement[] => {
    return reimbursements.filter(r => r.status === status)
  }

  /**
   * Get all reimbursements for a specific project
   * @param project - The project to filter by
   * @returns Array of reimbursements matching the project
   */
  const getByProject = (project: ProjectType): Reimbursement[] => {
    return reimbursements.filter(r => r.project === project)
  }

  return {
    reimbursements,
    addReimbursement,
    updateReimbursement,
    deleteReimbursement,
    getByStatus,
    getByProject,
    mounted,
  }
}
