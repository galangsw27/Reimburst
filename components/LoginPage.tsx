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
import { useRouter } from 'next/navigation'

/**
 * LoginPage component
 * 
 * Provides email/password authentication interface with:
 * - Form validation
 * - Error handling for failed logins
 * - Integration with useAuth hook
 * - Automatic redirect to dashboard on successful login
 * - Framer Motion animations
 * - Fetches users from database API
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
   * Validates credentials by calling authentication API with password verification.
   * Stores JWT token in localStorage on successful authentication.
   * On success, redirects to dashboard. On failure, displays error message.
   * 
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Call login API with email and password
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Store JWT token in localStorage
        localStorage.setItem('token', data.token)
        
        // Login successful - use the useAuth hook
        login(data.user)
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        // Login failed - show error message from API
        setError(data.error || 'Email atau password salah')
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
              <p className="text-xs text-muted-foreground mb-2 font-semibold">Akun Existing:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Tester:</p>
                <p>• alice.tester@airism.com</p>
                <p>• bob.tester@airism.com</p>
                <p className="font-medium text-foreground mt-2">Lead:</p>
                <p>• john.lead@airism.com</p>
                <p>• sarah.lead@airism.com</p>
                <p className="font-medium text-foreground mt-2">Head:</p>
                <p>• michael.head@airism.com</p>
                <p className="font-medium text-foreground mt-2">Finance:</p>
                <p>• lisa.finance@airism.com</p>
                <p className="mt-2 italic">Password: password123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
