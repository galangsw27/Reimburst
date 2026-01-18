/**
 * Database Reimbursement Service Implementation
 * 
 * This service provides reimbursement data operations using PostgreSQL database queries.
 * It implements the IReimbursementService interface with database-backed operations.
 * 
 * Features:
 * - JOIN queries to include user information
 * - Parameterized queries to prevent SQL injection
 * - Optional filtering by userId, status, date range, and amount range
 * - Validation for amount and status updates
 * 
 * Requirements: 7.4, 9.3
 */

import { Reimbursement } from '@/lib/types';
import {
  IReimbursementService,
  CreateReimbursementInput,
  UpdateReimbursementInput,
  ReimbursementFilters,
} from '../types';
import { db } from '@/lib/database/connection';

/**
 * DatabaseReimbursementService implements IReimbursementService using PostgreSQL database.
 * 
 * This service executes SQL queries against the reimbursements table and handles
 * data transformation to match the Reimbursement interface format.
 * 
 * Requirements:
 * - 7.4: Implement Database_Service that queries PostgreSQL
 * - 9.3: Return reimbursement objects matching the existing mock data structure
 */
export class DatabaseReimbursementService implements IReimbursementService {
  /**
   * Retrieve reimbursements with optional filtering
   * 
   * Uses JOIN to include user information (employee name, email, lead info).
   * Supports filtering by userId, status, date range, and amount range.
   * Returns reimbursements ordered by submission date (newest first).
   * 
   * @param filters - Optional filters to apply to the query
   * @returns Promise resolving to array of reimbursements matching the filters
   * 
   * Requirements:
   * - 7.4: Implement getReimbursements with optional filtering
   * - 9.3: Return reimbursement objects matching the expected structure
   */
  async getReimbursements(filters?: ReimbursementFilters): Promise<Reimbursement[]> {
    // Build the base query with JOINs to get user information
    let query = `
      SELECT 
        r.id::text,
        r.user_id::text as "userId",
        COALESCE(r.employee_name, u.name) as "employeeName",
        COALESCE(r.employee_email, u.email) as "employeeEmail",
        r.amount,
        r.description,
        r.status,
        COALESCE(r.date, r.submission_date::text) as date,
        COALESCE(r.project, 'MaxStream') as project,
        r.receipt_image as "receiptImage",
        r.asset,
        r.approvals,
        r.rejection_reason as "rejectionReason",
        r.approval_date as "approvalDate",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        COALESCE(r.lead_id::text, u.lead_id::text) as "leadId",
        COALESCE(r.lead_name, l.name) as "leadName"
      FROM reimbursements r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN users l ON COALESCE(r.lead_id, u.lead_id) = l.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters if provided
    if (filters) {
      if (filters.userId) {
        conditions.push(`r.user_id = $${paramIndex}`);
        params.push(parseInt(filters.userId));
        paramIndex++;
      }

      if (filters.status) {
        conditions.push(`r.status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.startDate) {
        conditions.push(`r.submission_date >= $${paramIndex}`);
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        conditions.push(`r.submission_date <= $${paramIndex}`);
        params.push(filters.endDate);
        paramIndex++;
      }

      if (filters.minAmount !== undefined) {
        conditions.push(`r.amount >= $${paramIndex}`);
        params.push(filters.minAmount);
        paramIndex++;
      }

      if (filters.maxAmount !== undefined) {
        conditions.push(`r.amount <= $${paramIndex}`);
        params.push(filters.maxAmount);
        paramIndex++;
      }
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Order by submission date (newest first)
    query += ` ORDER BY r.submission_date DESC`;

    const result = await db.query(query, params);

    // Transform database rows to Reimbursement objects
    return result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      employeeName: row.employeeName,
      employeeEmail: row.employeeEmail,
      amount: parseFloat(row.amount),
      description: row.description,
      status: row.status,
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      project: row.project,
      receiptImage: row.receiptImage,
      asset: row.asset,
      approvals: row.approvals || {},
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
    }));
  }

  /**
   * Retrieve a specific reimbursement by ID
   * 
   * Uses parameterized query to prevent SQL injection.
   * Uses JOIN to include user information.
   * 
   * @param id - The reimbursement ID to look up
   * @returns Promise resolving to the reimbursement or null if not found
   * 
   * Requirements:
   * - 7.4: Implement getReimbursementById with parameterized query
   * - 9.3: Return reimbursement object matching the expected structure
   */
  async getReimbursementById(id: string): Promise<Reimbursement | null> {
    const query = `
      SELECT 
        r.id::text,
        r.user_id::text as "userId",
        COALESCE(r.employee_name, u.name) as "employeeName",
        COALESCE(r.employee_email, u.email) as "employeeEmail",
        r.amount,
        r.description,
        r.status,
        COALESCE(r.date, r.submission_date::text) as date,
        COALESCE(r.project, 'MaxStream') as project,
        r.receipt_image as "receiptImage",
        r.asset,
        r.approvals,
        r.rejection_reason as "rejectionReason",
        r.approval_date as "approvalDate",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        COALESCE(r.lead_id::text, u.lead_id::text) as "leadId",
        COALESCE(r.lead_name, l.name) as "leadName"
      FROM reimbursements r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN users l ON COALESCE(r.lead_id, u.lead_id) = l.id
      WHERE r.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      employeeName: row.employeeName,
      employeeEmail: row.employeeEmail,
      amount: parseFloat(row.amount),
      description: row.description,
      status: row.status,
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      project: row.project,
      receiptImage: row.receiptImage,
      asset: row.asset,
      approvals: row.approvals || {},
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
    };
  }

  /**
   * Create a new reimbursement
   * 
   * Validates that amount is positive before inserting.
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param data - The reimbursement data to create
   * @returns Promise resolving to the created reimbursement
   * @throws Error if validation fails or database operation fails
   * 
   * Requirements:
   * - 7.4: Implement createReimbursement with validation
   * - 9.3: Return reimbursement object matching the expected structure
   */
  async createReimbursement(data: CreateReimbursementInput): Promise<Reimbursement> {
    // Validate amount is positive
    if (data.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Validate userId exists
    const userCheck = await db.query('SELECT id, name, email, lead_id FROM users WHERE id = $1', [parseInt(data.userId)]);
    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userCheck.rows[0];
    const submissionDate = data.date || new Date().toISOString().split('T')[0];

    // Get lead info if exists
    let leadName = null;
    if (user.lead_id) {
      const leadCheck = await db.query('SELECT name FROM users WHERE id = $1', [user.lead_id]);
      if (leadCheck.rows.length > 0) {
        leadName = leadCheck.rows[0].name;
      }
    }

    const query = `
      INSERT INTO reimbursements (
        user_id, employee_name, employee_email, amount, description, status, 
        date, project, receipt_image, lead_id, lead_name, submission_date, approvals
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id::text, user_id::text as "userId", employee_name as "employeeName", 
                employee_email as "employeeEmail", amount, description, status, date, project,
                receipt_image as "receiptImage", lead_id::text as "leadId", lead_name as "leadName",
                approvals, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await db.query(query, [
      parseInt(data.userId),
      data.employeeName || user.name,
      data.employeeEmail || user.email,
      data.amount,
      data.description,
      'pending', // New reimbursements always start as pending
      submissionDate,
      (data.project as any) || 'MaxStream',
      data.receiptImage || null,
      user.lead_id || null,
      leadName,
      submissionDate,
      JSON.stringify({}), // Empty approvals object
    ]);

    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.userId,
      employeeName: row.employeeName,
      employeeEmail: row.employeeEmail,
      amount: parseFloat(row.amount),
      description: row.description,
      status: row.status,
      date: row.date,
      project: row.project,
      receiptImage: row.receiptImage,
      approvals: row.approvals || {},
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
    };
  }

  /**
   * Update an existing reimbursement
   * 
   * Supports partial updates for amount, description, and status.
   * Validates amount is positive if provided.
   * Sets approval_date when status changes to approved or rejected.
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param id - The reimbursement ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated reimbursement
   * @throws Error if reimbursement not found or validation fails
   * 
   * Requirements:
   * - 7.4: Implement updateReimbursement for status updates
   * - 9.3: Return reimbursement object matching the expected structure
   */
  async updateReimbursement(
  id: string,
  data: UpdateReimbursementInput
): Promise<Reimbursement> {
  // Validate amount if provided
  if (data.amount !== undefined && data.amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // Build the update query dynamically based on provided fields
  const updates: string[] = [];
  const params: any[] = [id];
  let paramIndex = 2;

  if (data.amount !== undefined) {
    updates.push(`amount = $${paramIndex}`);
    params.push(data.amount);
    paramIndex++;
  }

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(data.description);
    paramIndex++;
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(data.status);
    paramIndex++;

    // Set approval_date when status changes to approved_by_finance or rejected
    if (data.status === 'approved_by_finance' || data.status === 'rejected') {
      updates.push(`approval_date = $${paramIndex}`);
      params.push(data.approvalDate || new Date().toISOString());
      paramIndex++;
    }
  }

  if (data.approvals !== undefined) {
    updates.push(`approvals = $${paramIndex}`);
    params.push(JSON.stringify(data.approvals));
    paramIndex++;
  }

  if (data.rejectionReason !== undefined) {
    updates.push(`rejection_reason = $${paramIndex}`);
    params.push(data.rejectionReason);
    paramIndex++;
  }

  if (data.asset !== undefined) {
    updates.push(`asset = $${paramIndex}`);
    params.push(data.asset);
    paramIndex++;
  }

  if (data.receiptImage !== undefined) {
    updates.push(`receipt_image = $${paramIndex}`);
    params.push(data.receiptImage);
    paramIndex++;
  }
  
  if (updates.length === 0) {
    // No updates to perform, just return the current reimbursement
    const current = await this.getReimbursementById(id);
    if (!current) {
      throw new Error('Reimbursement not found');
    }
    return current;
  }

  const query = `
    UPDATE reimbursements
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING id::text
  `;

  const result = await db.query(query, params);

  if (result.rows.length === 0) {
    throw new Error('Reimbursement not found');
  }

  // Fetch the updated reimbursement with all fields
  const updated = await this.getReimbursementById(id);
  if (!updated) {
    throw new Error('Reimbursement not found after update');
  }

  return updated;
}

  /**
   * Delete a reimbursement by ID
   * 
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param id - The reimbursement ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if reimbursement not found
   */
  async deleteReimbursement(id: string): Promise<void> {
    const query = 'DELETE FROM reimbursements WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Reimbursement not found');
    }
  }
}
