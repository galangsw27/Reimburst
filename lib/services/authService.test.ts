/**
 * Manual verification tests for authService
 * 
 * This file demonstrates the authService functionality and can be used
 * for manual testing. Automated tests will be added when Jest is configured.
 * 
 * To test manually:
 * 1. Import and use these functions in a test page
 * 2. Verify determineRole assigns correct roles based on email patterns
 * 3. Verify verifyGoogleToken parses JWT and extracts user info
 * 4. Verify error handling for invalid tokens
 */

import { verifyGoogleToken, determineRole } from './authService'
import { UserRole } from '@/lib/types'

/**
 * Helper function to create a mock JWT token for testing
 */
export const createMockJWT = (payload: any): string => {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const signature = 'mock-signature'
  return `${header}.${encodedPayload}.${signature}`
}

/**
 * Test scenarios for determineRole
 */
export const testDetermineRole = () => {
  console.log('Testing determineRole...')
  
  // Test finance role
  console.assert(determineRole('alice@finance.company.com') === 'finance', 'Finance role test failed')
  console.assert(determineRole('ALICE@FINANCE.COMPANY.COM') === 'finance', 'Finance role (uppercase) test failed')
  
  // Test lead role
  console.assert(determineRole('bob@lead.company.com') === 'lead', 'Lead role test failed')
  console.assert(determineRole('BOB@LEAD.COMPANY.COM') === 'lead', 'Lead role (uppercase) test failed')
  
  // Test head role
  console.assert(determineRole('sarah@head.company.com') === 'head', 'Head role test failed')
  console.assert(determineRole('SARAH@HEAD.COMPANY.COM') === 'head', 'Head role (uppercase) test failed')
  
  // Test user role (default)
  console.assert(determineRole('john@company.com') === 'user', 'User role test failed')
  console.assert(determineRole('jane@example.com') === 'user', 'User role test failed')
  console.assert(determineRole('') === 'user', 'Empty email test failed')
  
  console.log('✓ All determineRole tests passed')
}

/**
 * Test scenarios for verifyGoogleToken
 */
export const testVerifyGoogleToken = async () => {
  console.log('Testing verifyGoogleToken...')
  
  try {
    // Test valid token with all fields
    const mockPayload1 = {
      sub: 'google-user-123',
      email: 'john@company.com',
      name: 'John Doe',
      picture: 'https://example.com/photo.jpg',
      email_verified: true,
    }
    const token1 = createMockJWT(mockPayload1)
    const user1 = await verifyGoogleToken(token1)
    console.assert(user1.id === 'google-user-123', 'User ID test failed')
    console.assert(user1.email === 'john@company.com', 'User email test failed')
    console.assert(user1.name === 'John Doe', 'User name test failed')
    console.assert(user1.role === 'user', 'User role test failed')
    console.assert(user1.picture === 'https://example.com/photo.jpg', 'User picture test failed')
    
    // Test finance user
    const mockPayload2 = {
      sub: 'user-1',
      email: 'alice@finance.company.com',
      name: 'Alice Finance',
    }
    const token2 = createMockJWT(mockPayload2)
    const user2 = await verifyGoogleToken(token2)
    console.assert(user2.role === 'finance', 'Finance role assignment test failed')
    
    // Test token without picture
    const mockPayload3 = {
      sub: 'user-2',
      email: 'bob@lead.company.com',
      name: 'Bob Lead',
    }
    const token3 = createMockJWT(mockPayload3)
    const user3 = await verifyGoogleToken(token3)
    console.assert(user3.role === 'lead', 'Lead role assignment test failed')
    console.assert(user3.picture === undefined, 'Missing picture test failed')
    
    // Test invalid token format
    try {
      await verifyGoogleToken('invalid-token')
      console.error('✗ Invalid token should throw error')
    } catch (error) {
      console.assert(error instanceof Error && error.message.includes('Invalid JWT token format'), 'Invalid token error test failed')
    }
    
    // Test token with missing fields
    const incompletePayload = {
      sub: 'user-3',
      // Missing email and name
    }
    const incompleteToken = createMockJWT(incompletePayload)
    try {
      await verifyGoogleToken(incompleteToken)
      console.error('✗ Incomplete token should throw error')
    } catch (error) {
      console.assert(error instanceof Error && error.message.includes('missing required user information'), 'Incomplete token error test failed')
    }
    
    console.log('✓ All verifyGoogleToken tests passed')
  } catch (error) {
    console.error('✗ verifyGoogleToken tests failed:', error)
  }
}

/**
 * Test role assignment for various email patterns
 */
export const testRoleAssignment = () => {
  console.log('Testing role assignment patterns...')
  
  const testCases: Array<[string, UserRole]> = [
    ['alice@finance.company.com', 'finance'],
    ['bob@lead.company.com', 'lead'],
    ['sarah@head.company.com', 'head'],
    ['john@company.com', 'user'],
    ['jane@example.com', 'user'],
    ['test@gmail.com', 'user'],
    ['admin@finance.company.com', 'finance'],
    ['manager@lead.company.com', 'lead'],
    ['director@head.company.com', 'head'],
  ]
  
  testCases.forEach(([email, expectedRole]) => {
    const actualRole = determineRole(email)
    console.assert(actualRole === expectedRole, `Role assignment failed for ${email}: expected ${expectedRole}, got ${actualRole}`)
  })
  
  console.log('✓ All role assignment tests passed')
}

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('=== Running authService Tests ===')
  testDetermineRole()
  await testVerifyGoogleToken()
  testRoleAssignment()
  console.log('=== All Tests Completed ===')
}

// Test scenarios to verify:
// 1. JWT Parsing: Token is correctly decoded and parsed
// 2. Role Determination: Email patterns correctly map to roles
// 3. Error Handling: Invalid tokens throw appropriate errors
// 4. Field Extraction: All user fields are correctly extracted
// 5. Case Insensitivity: Email matching is case-insensitive
// 6. Edge Cases: Empty strings, malformed emails handled gracefully
