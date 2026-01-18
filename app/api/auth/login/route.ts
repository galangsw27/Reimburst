/**
 * Authentication Login API Route
 * 
 * This endpoint handles user authentication by validating email and password
 * against the database with proper password hashing verification.
 * Returns JWT token on successful authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { getDatabaseConfig } from '@/lib/config/database';
import { pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { generateToken } from '@/lib/auth/jwt';

const pbkdf2Async = promisify(pbkdf2);

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
  try {
    // Ensure database is initialized
    if (!db.isInitialized()) {
      const config = getDatabaseConfig();
      if (config.connectionString && config.poolConfig) {
        db.initialize(config.connectionString, config.poolConfig);
      }
    }

    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    // Query user from database with password hash
    const query = `
      SELECT 
        u.id::text, 
        u.name, 
        u.email, 
        u.role, 
        u.password_hash,
        u.lead_id::text as "leadId",
        l.name as "leadName"
      FROM users u
      LEFT JOIN users l ON u.lead_id = l.id
      WHERE u.email = $1
    `;

    const result = await db.query(query, [email]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

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
