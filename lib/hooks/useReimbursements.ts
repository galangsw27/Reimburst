'use client'

import { useState, useEffect } from 'react'
import { Reimbursement, ReimbursementStatus, ProjectType } from '@/lib/types'

/**
 * Cache configuration
 */
const CACHE_KEY = 'reimbursements_cache'
const CACHE_EXPIRATION_MS = 2 * 60 * 1000 // 2 minutes (shorter than projects since data changes more frequently)

interface CacheData {
  reimbursements: Reimbursement[]
  timestamp: number
}

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
 * Get cached reimbursements if not expired
 */
function getCachedReimbursements(): Reimbursement[] | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const cacheData: CacheData = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache is expired
    if (now - cacheData.timestamp > CACHE_EXPIRATION_MS) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return cacheData.reimbursements
  } catch (error) {
    console.error('Error reading reimbursements cache:', error)
    return null
  }
}

/**
 * Save reimbursements to cache
 */
function setCachedReimbursements(reimbursements: Reimbursement[]): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheData: CacheData = {
      reimbursements,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Error saving reimbursements cache:', error)
  }
}

/**
 * Invalidate reimbursements cache - call this after mutations
 */
export function invalidateReimbursementsCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}

/**
 * Custom hook for managing reimbursement data with database API
 * 
 * Features:
 * - Fetch data from database API with JWT authentication
 * - CRUD operations via API endpoints
 * - Query methods for filtering by status and project
 * - Hydration-safe with mounted flag
 * - Caching with 2-minute expiration to reduce duplicate API calls
 * 
 * @returns Object containing reimbursements array, CRUD methods, query methods, and mounted flag
 */
export function useReimbursements() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([])
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch reimbursements from API with caching
  const fetchReimbursements = async (useCache: boolean = true) => {
    try {
      // Try to use cached data first
      if (useCache) {
        const cachedData = getCachedReimbursements()
        if (cachedData) {
          setReimbursements(cachedData)
          setLoading(false)
          setMounted(true)
          return
        }
      }

      const response = await fetch('/api/reimbursements', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setReimbursements(data)
        // Cache the fetched data
        setCachedReimbursements(data)
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

  // Fetch on mount
  useEffect(() => {
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
        const updated = [...reimbursements, created]
        setReimbursements(updated)
        // Update cache with new data
        setCachedReimbursements(updated)
      } else {
        const errorData = await response.json()
        console.error('Failed to create reimbursement:', errorData)
        throw new Error(errorData.error || 'Failed to create reimbursement')
      }
    } catch (error) {
      console.error('Error creating reimbursement:', error)
      throw error // Re-throw to be caught by caller
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
        const updatedItem = await response.json()
        const updated = reimbursements.map(r => (r.id === id ? updatedItem : r))
        setReimbursements(updated)
        // Update cache with new data
        setCachedReimbursements(updated)
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
        const updated = reimbursements.filter(r => r.id !== id)
        setReimbursements(updated)
        // Update cache with new data
        setCachedReimbursements(updated)
      } else {
        console.error('Failed to delete reimbursement')
      }
    } catch (error) {
      console.error('Error deleting reimbursement:', error)
    }
  }

  /**
   * Force refresh data from API (bypass cache)
   */
  const refetch = () => fetchReimbursements(false)

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
    refetch, // Force refresh bypassing cache
  }
}
