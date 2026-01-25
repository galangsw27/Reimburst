/**
 * React hook for managing asset data
 * 
 * This hook provides asset data fetching and state management for React components.
 * It handles loading states, error handling, and automatic data refresh.
 * 
 * Requirements: 3.1
 */

import { useState, useEffect } from 'react'
import { Asset } from '@/lib/services/database/assetService'

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

interface UseAssetsReturn {
  assets: Asset[]
  activeAssets: Asset[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  mounted: boolean
}

/**
 * Hook to fetch and manage asset data
 * 
 * @returns Object containing assets data, loading state, and utility functions
 */
export function useAssets(): UseAssetsReturn {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchAssets = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/assets', {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }
      
      const result = await response.json()
      // Handle both response formats: { success: true, data: [...] } or [...]
      const assetsData = result.success ? result.data : result
      setAssets(Array.isArray(assetsData) ? assetsData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching assets:', err)
      setAssets([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchAssets()
  }, [])

  // Compute active assets from all assets
  const activeAssets = assets.filter(asset => asset.status === 'ACTIVE')

  return {
    assets,
    activeAssets,
    loading,
    error,
    refetch: fetchAssets,
    mounted
  }
}