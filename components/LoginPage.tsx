'use client'

/**
 * LoginPage Component for Next.js 16 Migration
 * 
 * This component provides the login interface with email/password authentication.
 * It integrates with the useAuth hook for authentication state management.
 * 
 * Requirements: 3.1, 3.2
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { useAuth } from '@/providers/AuthProvider'
import { determineRole } from '@/lib/services/authService'
import { useRouter } from 'next/navigation'

/**
 * Mock users for demo authentication
 * In production, this would be replaced with actual Google OAuth
 */
const MOCK_USERS = [
  // Management Roles
  { id: 'head-1', name: 'Sarah Manager', email: 'head@company.com', role: 'head' as const },
  { id: 'finance-1', name: 'Alice Finance', email: 'finance@company.com', role: 'finance' as const },
  
  // Lead Team
  { id: 'lead-1', name: 'Ahmad Rizki', email: 'lead1@company.com', role: 'lead' as const },
  { id: 'lead-2', name: 'Budi Santoso', email: 'lead2@company.com', role: 'lead' as const },
  { id: 'lead-3', name: 'Citra Dewi', email: 'lead3@company.com', role: 'lead' as const },
  
  // Users under Lead 1 (Ahmad Rizki) - 4 users
  { id: 'user-1', name: 'Doni Pratama', email: 'user1@company.com', role: 'user' as const, leadId: 'lead-1', leadName: 'Ahmad Rizki' },
  { id: 'user-2', name: 'Eka Putri', email: 'user2@company.com', role: 'user' as const, leadId: 'lead-1', leadName: 'Ahmad Rizki' },
  { id: 'user-3', name: 'Fajar Nugroho', email: 'user3@company.com', role: 'user' as const, leadId: 'lead-1', leadName: 'Ahmad Rizki' },
  { id: 'user-4', name: 'Gita Sari', email: 'user4@company.com', role: 'user' as const, leadId: 'lead-1', leadName: 'Ahmad Rizki' },
  
  // Users under Lead 2 (Budi Santoso) - 5 users
  { id: 'user-5', name: 'Hendra Wijaya', email: 'user5@company.com', role: 'user' as const, leadId: 'lead-2', leadName: 'Budi Santoso' },
  { id: 'user-6', name: 'Indah Permata', email: 'user6@company.com', role: 'user' as const, leadId: 'lead-2', leadName: 'Budi Santoso' },
  { id: 'user-7', name: 'Joko Susilo', email: 'user7@company.com', role: 'user' as const, leadId: 'lead-2', leadName: 'Budi Santoso' },
  { id: 'user-8', name: 'Kartika Sari', email: 'user8@company.com', role: 'user' as const, leadId: 'lead-2', leadName: 'Budi Santoso' },
  { id: 'user-9', name: 'Lukman Hakim', email: 'user9@company.com', role: 'user' as const, leadId: 'lead-2', leadName: 'Budi Santoso' },
  
  // Users under Lead 3 (Citra Dewi) - 4 users
  { id: 'user-10', name: 'Maya Anggraini', email: 'user10@company.com', role: 'user' as const, leadId: 'lead-3', leadName: 'Citra Dewi' },
  { id: 'user-11', name: 'Nanda Pratama', email: 'user11@company.com', role: 'user' as const, leadId: 'lead-3', leadName: 'Citra Dewi' },
  { id: 'user-12', name: 'Oki Setiawan', email: 'user12@company.com', role: 'user' as const, leadId: 'lead-3', leadName: 'Citra Dewi' },
  { id: 'user-13', name: 'Putri Ayu', email: 'user13@company.com', role: 'user' as const, leadId: 'lead-3', leadName: 'Citra Dewi' },
]

/**
 * LoginPage component
 * 
 * Provides email/password authentication interface with:
 * - Form validation
 * - Error handling for failed logins
 * - Integration with useAuth hook
 * - Automatic redirect to dashboard on successful login
 * - Framer Motion animations
 * 
 * @returns JSX.Element - The login page component
 */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { login } = useAuth()
  const router = useRouter()

  /**
   * Handle form submission
   * 
   * Validates credentials against mock users and logs in the user.
   * On success, redirects to dashboard. On failure, displays error message.
   * 
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Simulate network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock authentication - find user by email
      const user = MOCK_USERS.find(u => u.email === email)
      
      if (user && password) {
        // Login successful - use the useAuth hook
        login(user)
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        // Login failed
        setError('Email atau password salah')
      }
    } catch (err) {
      // Handle unexpected errors
      setError('Terjadi kesalahan saat login. Silakan coba lagi.')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white glow-text">
            AIRism
          </h1>
          <p className="text-muted-foreground text-lg">
            AI Reimbursement System
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Silakan login untuk melanjutkan
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Masukkan kredensial Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-destructive text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                <LogIn className="w-4 h-4" />
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 font-semibold">Demo Accounts:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• User: user1@company.com</p>
                <p>• Head: head@company.com</p>
                <p>• Lead: lead1@company.com</p>
                <p>• Finance: finance@company.com</p>
                <p className="mt-2 italic">Password: any</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
