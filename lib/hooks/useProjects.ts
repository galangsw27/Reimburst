/**
 * React hook for managing project data with caching
 * 
 * This hook provides project data fetching and state management for React components.
 * It handles loading states, error handling, automatic data refresh, and caching.
 * 
 * Requirements: 2.1, 11.6
 */

import { useState, useEffect } from 'react'
import { Project } from '@/lib/types'

/**
 * Cache configuration
 */
const CACHE_KEY = 'projects_cache'
const CACHE_EXPIRATION_MS = 5 * 60 * 1000 // 5 minutes

interface CacheData {
  projects: Project[]
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
 * Get cached projects if not expired
 */
function getCachedProjects(): Project[] | null {
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
    
    return cacheData.projects
  } catch (error) {
    console.error('Error reading cache:', error)
    return null
  }
}

/**
 * Save projects to cache
 */
function setCachedProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheData: CacheData = {
      projects,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Error saving cache:', error)
  }
}

/**
 * Invalidate projects cache
 */
export function invalidateProjectsCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}

interface UseProjectsReturn {
  projects: Project[]
  activeProjects: Project[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  mounted: boolean
}

/**
 * Hook to fetch and manage project data with caching
 * 
 * @returns Object containing projects data, loading state, and utility functions
 */
export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchProjects = async (useCache: boolean = true) => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to use cached data first
      if (useCache) {
        const cachedProjects = getCachedProjects()
        if (cachedProjects) {
          setProjects(cachedProjects)
          setLoading(false)
          return
        }
      }
      
      const response = await fetch('/api/projects', {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      // Projects API returns array directly
      const projectsData = Array.isArray(data) ? data : []
      setProjects(projectsData)
      
      // Cache the fetched data
      setCachedProjects(projectsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching projects:', err)
      setProjects([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchProjects()
  }, [])

  // Compute active projects from all projects
  const activeProjects = projects.filter(project => project.status === 'ACTIVE')

  return {
    projects,
    activeProjects,
    loading,
    error,
    refetch: () => fetchProjects(false), // Force refresh without cache
    mounted
  }
}