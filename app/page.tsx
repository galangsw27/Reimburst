'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      // Redirect unauthenticated users to login
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Show loading state while redirecting
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">AIRism</h1>
        <p className="text-xl text-muted-foreground">
          AI-powered Reimbursement System
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Loading...
        </p>
      </div>
    </main>
  )
}
