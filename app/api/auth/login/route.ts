/**
 * Authentication Login API Route
 * 
 * This endpoint handles user authentication by validating email and password
 * against the database with proper password hashing verification.
 * Returns JWT token on successful authentication.
 * 
 * Security Features:
 * - Rate limiting to prevent brute force attacks
 * - Input validation and sanitization
 * - Secure password verification with PBKDF2
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { getDatabaseConfig } from '@/lib/config/database';
import { pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { generateToken } from '@/lib/auth/jwt';

const pbkdf2Async = promisify(pbkdf2);

// Simple in-memory rate limiting
// In production, use Redis or a dedicated rate limiter
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Check if IP is rate limited
 */
function isRateLimited(ip: string): { limited: boolean; remainingTime?: number } {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return { limited: false };
  
  const now = Date.now();
  
  // Reset if lockout time has passed
  if (now - attempts.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(ip);
    return { limited: false };
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 1000);
    return { limited: true, remainingTime };
  }
  
  return { limited: false };
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(ip: string): void {
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(ip, attempts);
}

/**
 * Clear login attempts for an IP (on successful login)
 */
function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Sanitize email input
 */
function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 254);
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Verify a password against a stored hash
 * 
 * @param password - Plain text password to verify
 * @param storedHash - Stored hash in format: salt:hash
 * @returns Promise resolving to true if password matches, false otherwise
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = await pbkdf2Async(password, salt, 10000, 64, 'sha512');
    return hash === verifyHash.toString('hex');
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * POST /api/auth/login
 * 
 * Authenticates a user with email and password.
 * Validates credentials against database and returns JWT token on success.
 * 
 * @param request - Request body containing email and password
 * @returns JWT token and user data on success, error message on failure
 */
export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Check rate limiting
  const rateLimitCheck = isRateLimited(ip);
  if (rateLimitCheck.limited) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan login. Coba lagi dalam ${rateLimitCheck.remainingTime} detik.` },
      { status: 429 }
    );
  }

  try {
    // Ensure database is initialized
    if (!db.isInitialized()) {
      const config = getDatabaseConfig();
      if (config.connectionString && config.poolConfig) {
        db.initialize(config.connectionString, config.poolConfig);
      }
    }

    const body = await request.json();
    const email = body.email;
    const password = body.password;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password tidak valid' },
        { status: 400 }
      );
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Query user from database with password hash
    const query = `
      SELECT 
        u.id::text, 
        u.name, 
        u.email, 
        u.role, 
        u.password_hash,
        u.status,
        u.lead_id::text as "leadId",
        l.name as "leadName"
      FROM users u
      LEFT JOIN users l ON u.lead_id = l.id
      WHERE u.email = $1
    `;

    const result = await db.query(query, [sanitizedEmail]);

    if (result.rows.length === 0) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'Akun Anda tidak aktif. Hubungi administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    clearAttempts(ip);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    // Generate JWT token
    const token = generateToken(userWithoutPassword);

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  }
}
