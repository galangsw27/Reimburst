'use client'

/**
 * Login Page Route
 * 
 * This page provides the login interface for the application.
 * It wraps the LoginPage component with GoogleOAuthProvider for authentication.
 * 
 * Requirements: 2.1, 2.4, 3.1
 */

import { GoogleOAuthProvider } from '@react-oauth/google'
import LoginPage from '@/components/LoginPage'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Login() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Get Google Client ID from environment variables
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  // Don't render login page if already authenticated
  if (isAuthenticated) {
    return null
  }

  // Wrap LoginPage with GoogleOAuthProvider
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <LoginPage />
    </GoogleOAuthProvider>
  )
}
