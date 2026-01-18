/**
 * Authentication Middleware
 * 
 * This module provides middleware functions for protecting API routes
 * with JWT authentication and role-based authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt';
import { UserRole } from '@/lib/types';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Authenticate request and extract user from JWT token
 * 
 * @param request - Next.js request object
 * @returns Object with authenticated user or error response
 */
export function authenticate(request: NextRequest): {
  user: JWTPayload | null;
  error: NextResponse | null;
} {
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      ),
    };
  }

  const user = verifyToken(token);

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Check if user has required role(s)
 * 
 * @param userRole - User's role from JWT
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has required role, false otherwise
 */
export function hasRole(userRole: string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Authorize request based on required roles
 * 
 * @param user - Authenticated user from JWT
 * @param allowedRoles - Array of roles allowed to access the resource
 * @returns Null if authorized, error response if not authorized
 */
export function authorize(
  user: JWTPayload,
  allowedRoles: UserRole[]
): NextResponse | null {
  if (!hasRole(user.role, allowedRoles)) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Combined authentication and authorization middleware
 * 
 * @param request - Next.js request object
 * @param allowedRoles - Array of roles allowed to access the resource (optional)
 * @returns Object with authenticated user or error response
 */
export function authenticateAndAuthorize(
  request: NextRequest,
  allowedRoles?: UserRole[]
): {
  user: JWTPayload | null;
  error: NextResponse | null;
} {
  // First authenticate
  const { user, error: authError } = authenticate(request);

  if (authError) {
    return { user: null, error: authError };
  }

  // Then authorize if roles are specified
  if (allowedRoles && user) {
    const authzError = authorize(user, allowedRoles);
    if (authzError) {
      return { user: null, error: authzError };
    }
  }

  return { user, error: null };
}
