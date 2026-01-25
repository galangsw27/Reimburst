'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { hasRequiredRole, canAccessRoute } from '@/lib/utils/permissions'
import { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  requiredPermissions?: string[]
  fallbackPath?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRoles, 
  requiredPermissions,
  fallbackPath = '/dashboard'
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Check if user is inactive
    if (user && user.status === 'INACTIVE') {
      router.push('/login')
      return
    }

    // Enhanced permission checking - prefer permissions over roles
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!canAccessRoute(user, requiredPermissions)) {
        router.push(fallbackPath)
        return
      }
    } else if (requiredRoles && requiredRoles.length > 0) {
      // Legacy role-based checking for backward compatibility
      if (!hasRequiredRole(user, requiredRoles)) {
        router.push(fallbackPath)
        return
      }
    }
  }, [isAuthenticated, user, requiredRoles, requiredPermissions, router, fallbackPath])

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Check if user is inactive
  if (user && user.status === 'INACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Account inactive. Redirecting...</p>
        </div>
      </div>
    )
  }

  // Enhanced permission checking
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!canAccessRoute(user, requiredPermissions)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      )
    }
  } else if (requiredRoles && requiredRoles.length > 0) {
    // Legacy role-based checking
    if (!hasRequiredRole(user, requiredRoles)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
