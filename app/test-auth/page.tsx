'use client'

import { useAuth } from '@/providers/AuthProvider'
import { User } from '@/lib/types'

export default function TestAuthPage() {
  const { user, login, logout, isAuthenticated } = useAuth()

  const handleLogin = () => {
    const testUser: User = {
      id: 'test-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      picture: 'https://via.placeholder.com/150'
    }
    login(testUser)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Provider Test</h1>
      
      <div className="mb-4">
        <p className="mb-2">
          <strong>Authentication Status:</strong> {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
        </p>
        
        {user && (
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
        )}
      </div>

      <div className="space-x-4">
        <button
          onClick={handleLogin}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Login
        </button>
        
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Test Logout
        </button>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="font-bold mb-2">Test Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Test Login" to simulate a user login</li>
          <li>Verify user information appears</li>
          <li>Refresh the page - user should persist (hydration safety)</li>
          <li>Click "Test Logout" to clear the session</li>
          <li>Check browser console for any hydration errors</li>
        </ol>
      </div>
    </div>
  )
}
