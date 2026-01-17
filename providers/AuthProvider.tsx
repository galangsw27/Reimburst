'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthContextType } from '@/lib/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load user from localStorage after mount (avoid hydration mismatch)
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error)
    }
    setMounted(true)
  }, [])

  const login = (user: User) => {
    setUser(user)
    try {
      localStorage.setItem('user', JSON.stringify(user))
    } catch (error) {
      console.error('Error saving user to localStorage:', error)
    }
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem('user')
    } catch (error) {
      console.error('Error removing user from localStorage:', error)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
