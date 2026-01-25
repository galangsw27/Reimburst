/**
 * JWT Authentication Utilities
 * 
 * This module provides JWT token generation and verification functions
 * for API authentication and authorization.
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@/lib/types';

// JWT secret from environment variable - MUST be set in production
const JWT_SECRET: string = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'; // 7 days default

// Validate JWT_SECRET is set
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 * 
 * @param user - User object to generate token for
 * @returns JWT token string
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  // Use type assertion to handle the expiresIn type
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 * 
 * @param token - JWT token string to verify
 * @returns Decoded JWT payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract JWT token from Authorization header
 * 
 * @param authHeader - Authorization header value (e.g., "Bearer token123")
 * @returns Token string or null if not found
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
