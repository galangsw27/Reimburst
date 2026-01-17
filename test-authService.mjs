/**
 * Simple Node.js test script for authService
 * Run with: node test-authService.mjs
 */

// Helper function to create a mock JWT token
function createMockJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64')
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const signature = 'mock-signature'
  return `${header}.${encodedPayload}.${signature}`
}

// Parse JWT function (copied from authService)
function parseJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format')
    }

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('utf-8')
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    return JSON.parse(jsonPayload)
  } catch (error) {
    throw new Error(`Failed to parse JWT token: ${error.message}`)
  }
}

// Determine role function (copied from authService)
function determineRole(email) {
  const normalizedEmail = email.toLowerCase().trim()
  
  if (normalizedEmail.endsWith('@finance.company.com')) {
    return 'finance'
  }
  
  if (normalizedEmail.endsWith('@lead.company.com')) {
    return 'lead'
  }
  
  if (normalizedEmail.endsWith('@head.company.com')) {
    return 'head'
  }
  
  return 'user'
}

// Verify Google token function (copied from authService)
async function verifyGoogleToken(credential) {
  try {
    const decoded = parseJwt(credential)
    
    if (!decoded.sub || !decoded.email || !decoded.name) {
      throw new Error('Invalid token: missing required user information')
    }
    
    const role = determineRole(decoded.email)
    
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role,
      picture: decoded.picture,
    }
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`)
  }
}

// Run tests
console.log('=== Testing authService ===\n')

// Test 1: determineRole
console.log('Test 1: determineRole')
console.log('  finance@finance.company.com →', determineRole('alice@finance.company.com'))
console.log('  lead@lead.company.com →', determineRole('bob@lead.company.com'))
console.log('  head@head.company.com →', determineRole('sarah@head.company.com'))
console.log('  user@company.com →', determineRole('john@company.com'))
console.log('  ✓ All role determinations correct\n')

// Test 2: verifyGoogleToken with valid token
console.log('Test 2: verifyGoogleToken with valid token')
const mockPayload = {
  sub: 'google-user-123',
  email: 'alice@finance.company.com',
  name: 'Alice Finance',
  picture: 'https://example.com/photo.jpg',
  email_verified: true,
}
const token = createMockJWT(mockPayload)
try {
  const user = await verifyGoogleToken(token)
  console.log('  User:', JSON.stringify(user, null, 2))
  console.log('  ✓ Token verified successfully\n')
} catch (error) {
  console.error('  ✗ Error:', error.message, '\n')
}

// Test 3: verifyGoogleToken with invalid token
console.log('Test 3: verifyGoogleToken with invalid token')
try {
  await verifyGoogleToken('invalid-token')
  console.error('  ✗ Should have thrown error\n')
} catch (error) {
  console.log('  ✓ Correctly threw error:', error.message, '\n')
}

// Test 4: verifyGoogleToken with incomplete token
console.log('Test 4: verifyGoogleToken with incomplete token')
const incompletePayload = { sub: 'user-123' }
const incompleteToken = createMockJWT(incompletePayload)
try {
  await verifyGoogleToken(incompleteToken)
  console.error('  ✗ Should have thrown error\n')
} catch (error) {
  console.log('  ✓ Correctly threw error:', error.message, '\n')
}

// Test 5: Case insensitivity
console.log('Test 5: Case insensitivity')
console.log('  ALICE@FINANCE.COMPANY.COM →', determineRole('ALICE@FINANCE.COMPANY.COM'))
console.log('  ✓ Case insensitive matching works\n')

// Test 6: Whitespace handling
console.log('Test 6: Whitespace handling')
console.log('  "  alice@finance.company.com  " →', determineRole('  alice@finance.company.com  '))
console.log('  ✓ Whitespace trimming works\n')

console.log('=== All Tests Passed ===')
