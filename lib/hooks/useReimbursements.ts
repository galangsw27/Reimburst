'use client'

import { useState, useEffect } from 'react'
import { Reimbursement, ReimbursementStatus, ProjectType } from '@/lib/types'

/**
 * Get JWT token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Get authorization headers with JWT token
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

/**
 * Custom hook for managing reimbursement data with database API
 * 
 * Features:
 * - Fetch data from database API with JWT authentication
 * - CRUD operations via API endpoints
 * - Query methods for filtering by status and project
 * - Hydration-safe with mounted flag
 * 
 * @returns Object containing reimbursements array, CRUD methods, query methods, and mounted flag
 */
export function useReimbursements() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([])
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch reimbursements from API on mount
  useEffect(() => {
    const fetchReimbursements = async () => {
      try {
        const response = await fetch('/api/reimbursements', {
          headers: getAuthHeaders(),
        })
        if (response.ok) {
          const data = await response.json()
          setReimbursements(data)
        } else if (response.status === 401) {
          console.error('Unauthorized - please login again')
          // Optionally redirect to login
        }
      } catch (error) {
        console.error('Failed to fetch reimbursements:', error)
      } finally {
        setLoading(false)
        setMounted(true)
      }
    }

    fetchReimbursements()
  }, [])

  /**
   * Add a new reimbursement via API
   * @param reimbursement - The reimbursement object to add
   */
  const addReimbursement = async (reimbursement: Reimbursement) => {
    try {
      const response = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reimbursement),
      })

      if (response.ok) {
        const created = await response.json()
        setReimbursements(prev => [...prev, created])
      } else {
        console.error('Failed to create reimbursement')
      }
    } catch (error) {
      console.error('Error creating reimbursement:', error)
    }
  }

  /**
   * Update an existing reimbursement by ID via API
   * @param id - The ID of the reimbursement to update
   * @param updates - Partial reimbursement object with fields to update
   */
  const updateReimbursement = async (id: string, updates: Partial<Reimbursement>) => {
    try {
      const response = await fetch(`/api/reimbursements/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updated = await response.json()
        setReimbursements(prev =>
          prev.map(r => (r.id === id ? updated : r))
        )
      } else {
        console.error('Failed to update reimbursement')
      }
    } catch (error) {
      console.error('Error updating reimbursement:', error)
    }
  }

  /**
   * Delete a reimbursement by ID via API
   * @param id - The ID of the reimbursement to delete
   */
  const deleteReimbursement = async (id: string) => {
    try {
      const response = await fetch(`/api/reimbursements/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        setReimbursements(prev => prev.filter(r => r.id !== id))
      } else {
        console.error('Failed to delete reimbursement')
      }
    } catch (error) {
      console.error('Error deleting reimbursement:', error)
    }
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
    loading,
  }
}
