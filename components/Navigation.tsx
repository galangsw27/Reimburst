'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, Upload, CheckCircle, Clock, Download, FileText, Home } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '@/providers/AuthProvider'

export default function Navigation() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Don't show navigation on login page or if not authenticated
  if (!isAuthenticated || pathname === '/login') {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const canUpload = user && ['user', 'head', 'lead'].includes(user.role)
  const canApprove = user && ['head', 'lead', 'finance'].includes(user.role)
  const canDownload = user && user.role === 'finance'

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
            <Button
              variant={isActive('/dashboard') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/dashboard')}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            {canUpload && (
              <Button
                variant={isActive('/upload') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('/upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            )}

            {canApprove && (
              <Button
                variant={isActive('/approvals') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('/approvals')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approval
              </Button>
            )}

            <Button
              variant={isActive('/history') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/history')}
            >
              <Clock className="w-4 h-4 mr-2" />
              History
            </Button>
          </nav>
        </div>

        {/* User Info and Logout */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
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
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleNavigation('/dashboard')}
          >
            <Home className="w-4 h-4 mr-1" />
            Dashboard
          </Button>

          {canUpload && (
            <Button
              variant={isActive('/upload') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/upload')}
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          )}

          {canApprove && (
            <Button
              variant={isActive('/approvals') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation('/approvals')}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approval
            </Button>
          )}

          <Button
            variant={isActive('/history') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleNavigation('/history')}
          >
            <Clock className="w-4 h-4 mr-1" />
            History
          </Button>
        </nav>
      </div>
    </header>
  )
}
