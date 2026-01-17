'use client'

/**
 * Test page for authService verification
 * 
 * This page allows manual testing of the authService functionality
 * including JWT parsing and role determination.
 */

import { useEffect, useState } from 'react'
import { verifyGoogleToken, determineRole } from '@/lib/services/authService'
import { User } from '@/lib/types'
import { runAllTests, createMockJWT } from '@/lib/services/authService.test'

export default function TestAuthServicePage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [testUser, setTestUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Run automated tests on mount
  useEffect(() => {
    const runTests = async () => {
      const results: string[] = []
      
      // Capture console output
      const originalLog = console.log
      const originalAssert = console.assert
      const originalError = console.error
      
      console.log = (...args) => {
        results.push(args.join(' '))
        originalLog(...args)
      }
      
      console.assert = (condition, ...args) => {
        if (!condition) {
          results.push(`❌ ASSERTION FAILED: ${args.join(' ')}`)
        }
        originalAssert(condition, ...args)
      }
      
      console.error = (...args) => {
        results.push(`❌ ERROR: ${args.join(' ')}`)
        originalError(...args)
      }
      
      // Run all tests
      await runAllTests()
      
      // Restore console
      console.log = originalLog
      console.assert = originalAssert
      console.error = originalError
      
      setTestResults(results)
    }
    
    runTests()
  }, [])

  // Test with a mock Google token
  const testWithMockToken = async () => {
    try {
      setError(null)
      const mockPayload = {
        sub: 'test-user-123',
        email: 'alice@finance.company.com',
        name: 'Alice Finance',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        email_verified: true,
      }
      
      const token = createMockJWT(mockPayload)
      const user = await verifyGoogleToken(token)
      setTestUser(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Test role determination
  const testRoles = [
    { email: 'alice@finance.company.com', expectedRole: 'finance' },
    { email: 'bob@lead.company.com', expectedRole: 'lead' },
    { email: 'sarah@head.company.com', expectedRole: 'head' },
    { email: 'john@company.com', expectedRole: 'user' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AuthService Test Page</h1>
        
        {/* Automated Test Results */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Automated Test Results</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-96">
            {testResults.length === 0 ? (
              <p>Running tests...</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Manual Token Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Manual Token Verification</h2>
          <button
            onClick={testWithMockToken}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            Test with Mock Finance User Token
          </button>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {testUser && (
            <div className="bg-green-50 border border-green-200 p-4 rounded">
              <h3 className="font-semibold mb-2">Verified User:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testUser, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Role Determination Tests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Role Determination Tests</h2>
          <div className="space-y-2">
            {testRoles.map(({ email, expectedRole }) => {
              const actualRole = determineRole(email)
              const isCorrect = actualRole === expectedRole
              
              return (
                <div
                  key={email}
                  className={`p-3 rounded ${
                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{email}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        Expected: <strong>{expectedRole}</strong>
                      </span>
                      <span className="text-sm">
                        Got: <strong className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                          {actualRole}
                        </strong>
                      </span>
                      <span className="text-lg">
                        {isCorrect ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Implementation Details */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Implementation Details</h2>
          <div className="prose prose-sm">
            <h3>Requirements Validated:</h3>
            <ul>
              <li><strong>Requirement 3.1:</strong> Google OAuth integration with JWT parsing</li>
              <li><strong>Requirement 3.3:</strong> Role-based access control with email pattern matching</li>
            </ul>
            
            <h3>Features Implemented:</h3>
            <ul>
              <li>JWT token parsing and decoding</li>
              <li>User information extraction (id, email, name, picture)</li>
              <li>Role determination based on email domain patterns</li>
              <li>Error handling for invalid tokens</li>
              <li>Case-insensitive email matching</li>
            </ul>
            
            <h3>Role Assignment Rules:</h3>
            <ul>
              <li><code>@finance.company.com</code> → finance role</li>
              <li><code>@lead.company.com</code> → lead role</li>
              <li><code>@head.company.com</code> → head role</li>
              <li>All other emails → user role (default)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
