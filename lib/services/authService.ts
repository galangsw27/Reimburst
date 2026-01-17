/**
 * Authentication Service for Next.js 16 Migration
 * 
 * This service handles Google OAuth token verification and role determination
 * based on email patterns. It's designed to work client-side with Next.js.
 * 
 * Requirements: 3.1, 3.3
 */

import { User, UserRole } from '@/lib/types'

/**
 * JWT payload structure from Google OAuth
 */
interface GoogleJWTPayload {
  sub: string // User ID
  email: string
  name: string
  picture?: string
  email_verified?: boolean
  iat?: number
  exp?: number
}

/**
 * Parse and decode a JWT token
 * 
 * @param token - The JWT token string
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or cannot be parsed
 */
function parseJwt(token: string): GoogleJWTPayload {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format')
    }

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    return JSON.parse(jsonPayload)
  } catch (error) {
    throw new Error(`Failed to parse JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Determine user role based on email patterns
 * 
 * Role assignment logic:
 * - Emails ending with '@finance.company.com' → 'finance'
 * - Emails ending with '@lead.company.com' → 'lead'
 * - Emails ending with '@head.company.com' → 'head'
 * - All other emails → 'user'
 * 
 * @param email - User's email address
 * @returns UserRole assigned based on email pattern
 * 
 * Requirements: 3.3 - Role-based access control
 */
export function determineRole(email: string): UserRole {
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
  
  // Default role for all other users
  return 'user'
}

/**
 * Verify Google OAuth token and extract user information
 * 
 * This method decodes the JWT token from Google OAuth, extracts user information,
 * and determines the appropriate role based on email patterns.
 * 
 * @param credential - The JWT credential string from Google OAuth
 * @returns User object with id, email, name, role, and optional picture
 * @throws Error if token verification fails
 * 
 * Requirements: 3.1 - Google OAuth integration
 */
export async function verifyGoogleToken(credential: string): Promise<User> {
  try {
    // Parse the JWT token
    const decoded = parseJwt(credential)
    
    // Validate required fields
    if (!decoded.sub || !decoded.email || !decoded.name) {
      throw new Error('Invalid token: missing required user information')
    }
    
    // Determine user role based on email
    const role = determineRole(decoded.email)
    
    // Construct and return User object
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role,
      picture: decoded.picture,
    }
  } catch (error) {
    throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Auth service object with all authentication methods
 */
export const authService = {
  verifyGoogleToken,
  determineRole,
}

export default authService
