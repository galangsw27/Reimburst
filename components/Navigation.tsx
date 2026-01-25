'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, CheckCircle, FileText, Home, FolderOpen, Package, Users } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '@/providers/AuthProvider'
import { hasPermission } from '@/lib/utils/permissions'

export default function Navigation() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Don't show navigation on login page or if not authenticated
  if (!isAuthenticated || pathname === '/login') {
    return null
  }

  // Don't show navigation for inactive users
  if (user && user.status === 'INACTIVE') {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  // Enhanced permission-based navigation visibility
  const canViewDashboard = hasPermission(user, 'nav.dashboard')
  const canViewRequest = hasPermission(user, 'nav.request')
  const canViewProjects = hasPermission(user, 'nav.projects')
  const canViewUsers = hasPermission(user, 'nav.users')
  const canViewApprovals = hasPermission(user, 'nav.approvals')
  const canViewReports = hasPermission(user, 'nav.reports')

  const isActive = (path: string) => pathname === path

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => handleNavigation('/dashboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <h1 className="text-2xl font-bold text-white glow-text">
              AIRism
            </h1>
          </button>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center gap-2">
            {canViewDashboard && (
              <Button
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('/dashboard')}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            )}

            {canViewRequest && (
              <Button
                variant={isActive('/requests') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('/requests')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Request
              </Button>
            )}

            {canViewProjects && (
              <Button
                variant={isActive('/projects') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('/projects')}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Projects
              </Button>
            )}

            {canViewUsers && (
              <Button
                variant={isActive('/users') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('/users')}
              >
                <Users className="w-4 h-4 mr-2" />
                Users
              </Button>
            )}

            {canViewApprovals && (
              <Button
                variant={isActive('/approvals') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('/approvals')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approval
              </Button>
            )}

            {canViewReports && (
              <Button
                variant={isActive('/reports') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('/reports')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Reports
              </Button>
            )}
          </nav>
        </div>

        {/* User Info and Logout */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                {user.status === 'INACTIVE' && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <nav className="container flex items-center gap-1 px-2 py-2 overflow-x-auto">
          {canViewDashboard && (
            <Button
              variant={isActive('/dashboard') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/dashboard')}
            >
              <Home className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          )}

          {canViewRequest && (
            <Button
              variant={isActive('/requests') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/requests')}
            >
              <FileText className="w-4 h-4 mr-1" />
              Request
            </Button>
          )}

          {canViewProjects && (
            <Button
              variant={isActive('/projects') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/projects')}
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              Projects
            </Button>
          )}

          {canViewUsers && (
            <Button
              variant={isActive('/users') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/users')}
            >
              <Users className="w-4 h-4 mr-1" />
              Users
            </Button>
          )}

          {canViewApprovals && (
            <Button
              variant={isActive('/approvals') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/approvals')}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approval
            </Button>
          )}

          {canViewReports && (
            <Button
              variant={isActive('/reports') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/reports')}
            >
              <FileText className="w-4 h-4 mr-1" />
              Reports
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}