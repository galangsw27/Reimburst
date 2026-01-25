/**
 * Database User Service Implementation
 * 
 * This service provides user data operations using PostgreSQL database queries.
 * It implements the IUserService interface with database-backed operations.
 * 
 * Features:
 * - LEFT JOIN queries to include lead names
 * - Parameterized queries to prevent SQL injection
 * - Password hashing for security
 * - COALESCE for partial updates
 * - Enhanced: Status management (ACTIVE/INACTIVE)
 * - Enhanced: Lead assignment functionality
 * - Enhanced: Support for 4 roles (tester, lead, head, finance)
 * 
 * Requirements: 7.4, 9.1, 9.2, 1.1, 1.2
 */

import { User } from '@/lib/types';
import { IUserService, CreateUserInput, UpdateUserInput } from '../types';
import { db } from '@/lib/database/connection';
import { randomBytes, pbkdf2 } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

/**
 * Hash a password using PBKDF2 with a random salt
 * 
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password in format: salt:hash
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await pbkdf2Async(password, salt, 10000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * DatabaseUserService implements IUserService using PostgreSQL database.
 * 
 * This service executes SQL queries against the users table and handles
 * data transformation to match the User interface format.
 * 
 * Enhanced Features:
 * - Status management (ACTIVE/INACTIVE) for user access control
 * - Lead assignment functionality with validation
 * - Support for 4 roles: tester, lead, head, finance
 * - Role-based access control and hierarchy management
 * 
 * Requirements:
 * - 7.4: Implement Database_Service that queries PostgreSQL
 * - 9.1: Return user objects with required fields
 * - 9.2: Include lead's name in the leadName field when user has a lead
 * - 1.1: User status management (ACTIVE/INACTIVE)
 * - 1.2: Lead assignment and hierarchy management
 */
export class DatabaseUserService implements IUserService {
  /**
   * Retrieve all users from the database with lead information
   * 
   * Uses LEFT JOIN to include lead names for users who have a lead.
   * Returns users ordered by creation date (newest first).
   * Enhanced: Includes status field for user access control.
   * 
   * @returns Promise resolving to array of all users
   * 
   * Requirements:
   * - 9.1: Return user objects with fields: id, name, email, role, leadId, leadName
   * - 9.2: Include the lead's name in the leadName field
   * - 1.1: Include status field for user access control
   */
  async getUsers(): Promise<User[]> {
    const query = `
      SELECT 
        u.id::text, 
        u.name, 
        u.email, 
        u.role, 
        u.lead_id::text as "leadId",
        l.name as "leadName",
        COALESCE(u.status, 'ACTIVE') as status
      FROM users u
      LEFT JOIN users l ON u.lead_id = l.id
      ORDER BY u.created_at DESC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }
  
  /**
   * Retrieve a specific user by ID with lead information
   * 
   * Uses parameterized query to prevent SQL injection.
   * Uses LEFT JOIN to include lead name if the user has a lead.
   * Enhanced: Includes status field for user access control.
   * 
   * @param id - The user ID to look up
   * @returns Promise resolving to the user or null if not found
   * 
   * Requirements:
   * - 9.1: Return user object with required fields
   * - 9.2: Include the lead's name in the leadName field
   * - 1.1: Include status field for user access control
   */
  async getUserById(id: string): Promise<User | null> {
    const query = `
      SELECT 
        u.id::text, 
        u.name, 
        u.email, 
        u.role, 
        u.lead_id::text as "leadId",
        l.name as "leadName",
        COALESCE(u.status, 'ACTIVE') as status
      FROM users u
      LEFT JOIN users l ON u.lead_id = l.id
      WHERE u.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
  
  /**
   * Create a new user in the database
   * 
   * Hashes the password before storing it in the database.
   * Uses parameterized query to prevent SQL injection.
   * Enhanced: Sets default status to ACTIVE for new users.
   * 
   * @param data - The user data to create
   * @returns Promise resolving to the created user
   * @throws Error if database operation fails
   * 
   * Requirements:
   * - 7.4: Implement createUser with password hashing
   * - 9.1: Return user object with required fields
   * - 1.1: Set default status to ACTIVE for new users
   */
  async createUser(data: CreateUserInput): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await hashPassword(data.password);
    
    const query = `
      INSERT INTO users (name, email, password_hash, role, lead_id, status)
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
      RETURNING id::text, name, email, role, lead_id::text as "leadId", COALESCE(status, 'ACTIVE') as status
    `;
    
    const result = await db.query(query, [
      data.name,
      data.email,
      hashedPassword,
      data.role,
      data.leadId ? parseInt(data.leadId) : null
    ]);
    
    const user = result.rows[0];
    
    // If user has a lead, fetch the lead name
    if (user.leadId) {
      const leadQuery = `SELECT name FROM users WHERE id = $1`;
      const leadResult = await db.query(leadQuery, [user.leadId]);
      if (leadResult.rows.length > 0) {
        user.leadName = leadResult.rows[0].name;
      }
    }
    
    return user;
  }
  
  /**
   * Update an existing user in the database
   * 
   * Uses COALESCE to support partial updates - only provided fields are updated.
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param id - The user ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated user
   * @throws Error if user not found or database operation fails
   * 
   * Requirements:
   * - 7.4: Implement updateUser with COALESCE for partial updates
   * - 9.1: Return user object with required fields
   * - 9.2: Include the lead's name in the leadName field
   */
  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    // Build the update query with COALESCE for partial updates
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;
    
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(data.name);
      paramIndex++;
    }
    
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      params.push(data.email);
      paramIndex++;
    }
    
    if (data.password !== undefined) {
      const hashedPassword = await hashPassword(data.password);
      updates.push(`password_hash = $${paramIndex}`);
      params.push(hashedPassword);
      paramIndex++;
    }
    
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      params.push(data.role);
      paramIndex++;
    }
    
    if ('leadId' in data) {
      updates.push(`lead_id = $${paramIndex}`);
      params.push(data.leadId ? parseInt(data.leadId) : null);
      paramIndex++;
    }
    
    // Enhanced: Support status updates
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(data.status);
      paramIndex++;
    }
    
    // Always update the updated_at timestamp
    updates.push('updated_at = NOW()');
    
    if (updates.length === 1) {
      // Only updated_at would be updated, which means no actual data changes
      // Just return the current user
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    }
    
    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id::text, name, email, role, lead_id::text as "leadId", COALESCE(status, 'ACTIVE') as status
    `;
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    
    // If user has a lead, fetch the lead name
    if (user.leadId) {
      const leadQuery = `SELECT name FROM users WHERE id = $1`;
      const leadResult = await db.query(leadQuery, [user.leadId]);
      if (leadResult.rows.length > 0) {
        user.leadName = leadResult.rows[0].name;
      }
    }
    
    return user;
  }

  // ============================================================================
  // Enhanced Methods for Status Management and Lead Assignment
  // ============================================================================

  /**
   * Set user status (ACTIVE/INACTIVE)
   * 
   * @param userId - The user ID to update
   * @param status - The status to set
   * @returns Promise resolving to the updated user
   * @throws Error if user not found
   * 
   * Requirements:
   * - 1.1: User status management for access control
   */
  async setUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<User> {
    const query = `
      UPDATE users
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id::text, name, email, role, lead_id::text as "leadId", COALESCE(status, 'ACTIVE') as status
    `;
    
    const result = await db.query(query, [userId, status]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    
    // If user has a lead, fetch the lead name
    if (user.leadId) {
      const leadQuery = `SELECT name FROM users WHERE id = $1`;
      const leadResult = await db.query(leadQuery, [user.leadId]);
      if (leadResult.rows.length > 0) {
        user.leadName = leadResult.rows[0].name;
      }
    }
    
    return user;
  }

  /**
   * Assign a lead to a user
   * 
   * @param userId - The user ID to update
   * @param leadId - The lead user ID to assign (null to remove lead)
   * @returns Promise resolving to the updated user
   * @throws Error if user or lead not found, or if lead assignment is invalid
   * 
   * Requirements:
   * - 1.2: Lead assignment and hierarchy management
   */
  async assignLead(userId: string, leadId: string | null): Promise<User> {
    // Validate lead exists and has appropriate role if leadId is provided
    if (leadId) {
      const leadUser = await this.getUserById(leadId);
      if (!leadUser) {
        throw new Error('Lead user not found');
      }
      
      // Validate lead eligibility
      const isEligible = await this.validateLeadEligibility(leadId);
      if (!isEligible) {
        throw new Error('User cannot be assigned as a lead. Only users with role "lead" or "head" can be leads.');
      }
    }
    
    const query = `
      UPDATE users
      SET lead_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id::text, name, email, role, lead_id::text as "leadId", COALESCE(status, 'ACTIVE') as status
    `;
    
    const result = await db.query(query, [userId, leadId ? parseInt(leadId) : null]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    
    // If user has a lead, fetch the lead name
    if (user.leadId) {
      const leadQuery = `SELECT name FROM users WHERE id = $1`;
      const leadResult = await db.query(leadQuery, [user.leadId]);
      if (leadResult.rows.length > 0) {
        user.leadName = leadResult.rows[0].name;
      }
    }
    
    return user;
  }

  /**
   * Get users by status
   * 
   * @param status - The status to filter by
   * @returns Promise resolving to array of users with the specified status
   * 
   * Requirements:
   * - 1.1: User status management for access control
   */
  async getUsersByStatus(status: 'ACTIVE' | 'INACTIVE'): Promise<User[]> {
    const query = `
      SELECT 
        u.id::text, 
        u.name, 
        u.email, 
        u.role, 
        u.lead_id::text as "leadId",
        l.name as "leadName",
        COALESCE(u.status, 'ACTIVE') as status
      FROM users u
      LEFT JOIN users l ON u.lead_id = l.id
      WHERE COALESCE(u.status, 'ACTIVE') = $1
      ORDER BY u.created_at DESC
    `;
    
    const result = await db.query(query, [status]);
    return result.rows;
  }

  /**
   * Get users by role
   * 
   * @param role - The role to filter by
   * @returns Promise resolving to array of users with the specified role
   * 
   * Requirements:
   * - 1.2: Role-based user management
   */
  async getUsersByRole(role: string): Promise<User[]> {
    const query = `
      SELECT 
        u.id::text, 
        u.name, 
        u.email, 
        u.role, 
        u.lead_id::text as "leadId",
        l.name as "leadName",
        COALESCE(u.status, 'ACTIVE') as status
      FROM users u
      LEFT JOIN users l ON u.lead_id = l.id
      WHERE u.role = $1
      ORDER BY u.created_at DESC
    `;
    
    const result = await db.query(query, [role]);
    return result.rows;
  }

  /**
   * Get user hierarchy (users under a specific lead)
   * 
   * @param leadId - The lead user ID
   * @returns Promise resolving to array of users under the specified lead
   * 
   * Requirements:
   * - 1.2: Lead assignment and hierarchy management
   */
  async getUserHierarchy(leadId: string): Promise<User[]> {
    const query = `
      SELECT 
        u.id::text, 
        u.name, 
        u.email, 
        u.role, 
        u.lead_id::text as "leadId",
        l.name as "leadName",
        COALESCE(u.status, 'ACTIVE') as status
      FROM users u
      LEFT JOIN users l ON u.lead_id = l.id
      WHERE u.lead_id = $1
      ORDER BY u.created_at DESC
    `;
    
    const result = await db.query(query, [parseInt(leadId)]);
    return result.rows;
  }

  /**
   * Validate if a user can be assigned as a lead
   * 
   * @param userId - The user ID to validate
   * @returns Promise resolving to true if user can be a lead, false otherwise
   * 
   * Requirements:
   * - 1.2: Lead assignment validation based on role hierarchy
   */
  async validateLeadEligibility(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) {
      return false;
    }
    
    // Only users with role 'lead' or 'head' can be assigned as leads
    // 'finance' and 'tester' cannot be leads
    return user.role === 'lead' || user.role === 'head';
  }
}
