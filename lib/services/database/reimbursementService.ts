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
 * - Enhanced validation with Project and Asset services integration
 * - Date validation logic (asset date vs transaction date)
 * - Project and asset reference validation
 * 
 * Requirements: 7.4, 9.3, 3.2
 */

import { Reimbursement, ReimbursementStatus } from '@/lib/types';
import {
  IReimbursementService,
  CreateReimbursementInput,
  UpdateReimbursementInput,
  ReimbursementFilters,
} from '../types';
import { db } from '@/lib/database/connection';
import { DatabaseProjectService } from './projectService';
import { DatabaseAssetService } from './assetService';

/**
 * DatabaseReimbursementService implements IReimbursementService using PostgreSQL database.
 * 
 * This service executes SQL queries against the reimbursements table and handles
 * data transformation to match the Reimbursement interface format.
 * Enhanced with validation logic for projects, assets, and date validation.
 * 
 * Requirements:
 * - 7.4: Implement Database_Service that queries PostgreSQL
 * - 9.3: Return reimbursement objects matching the existing mock data structure
 * - 3.2: Implement date validation logic (asset date vs transaction date)
 */
export class DatabaseReimbursementService implements IReimbursementService {
  private projectService: DatabaseProjectService;
  private assetService: DatabaseAssetService;

  constructor() {
    this.projectService = new DatabaseProjectService();
    this.assetService = new DatabaseAssetService();
  }
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
        COALESCE(r.date, r.submission_date::date) as date,
        COALESCE(r.project, 'MaxStream') as project,
        r.receipt_image as "receiptImage",
        r.receipt_image_2 as "receiptImage2",
        r.asset,
        r.approvals,
        r.rejection_reason as "rejectionReason",
        r.approval_date as "approvalDate",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        COALESCE(r.lead_id::text, u.lead_id::text) as "leadId",
        COALESCE(r.lead_name, l.name) as "leadName",
        r.transaction_id as "transactionId",
        r.transaction_time as "transactionTime",
        r.payment_method as "paymentMethod",
        r.transaction_amount as "transactionAmount",
        r.admin_fee as "adminFee",
        r.shipping_fee as "shippingFee",
        r.service_fee as "serviceFee",
        r.discount,
        r.login_status as "loginStatus",
        r.by,
        r.folder_evidence as "folderEvidence",
        r.folder_evidence_2 as "folderEvidence2"
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
      receiptImage2: row.receiptImage2,
      asset: row.asset,
      approvals: row.approvals || {},
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
      // Additional transaction details
      transactionId: row.transactionId,
      transactionTime: row.transactionTime,
      paymentMethod: row.paymentMethod,
      transactionAmount: row.transactionAmount ? parseFloat(row.transactionAmount) : undefined,
      adminFee: row.adminFee ? parseFloat(row.adminFee) : 0,
      shippingFee: row.shippingFee ? parseFloat(row.shippingFee) : 0,
      serviceFee: row.serviceFee ? parseFloat(row.serviceFee) : 0,
      discount: row.discount ? parseFloat(row.discount) : 0,
      loginStatus: row.loginStatus,
      by: row.by,
      folderEvidence: row.folderEvidence,
      folderEvidence2: row.folderEvidence2,
    } as any));
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
        COALESCE(r.date, r.submission_date::date) as date,
        COALESCE(r.project, 'MaxStream') as project,
        r.receipt_image as "receiptImage",
        r.receipt_image_2 as "receiptImage2",
        r.asset,
        r.approvals,
        r.rejection_reason as "rejectionReason",
        r.approval_date as "approvalDate",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        COALESCE(r.lead_id::text, u.lead_id::text) as "leadId",
        COALESCE(r.lead_name, l.name) as "leadName",
        r.transaction_id as "transactionId",
        r.transaction_time as "transactionTime",
        r.payment_method as "paymentMethod",
        r.transaction_amount as "transactionAmount",
        r.admin_fee as "adminFee",
        r.shipping_fee as "shippingFee",
        r.service_fee as "serviceFee",
        r.discount,
        r.login_status as "loginStatus",
        r.by,
        r.folder_evidence as "folderEvidence",
        r.folder_evidence_2 as "folderEvidence2"
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
      receiptImage2: row.receiptImage2,
      asset: row.asset,
      approvals: row.approvals || {},
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
      // Additional transaction details
      transactionId: row.transactionId,
      transactionTime: row.transactionTime,
      paymentMethod: row.paymentMethod,
      transactionAmount: row.transactionAmount ? parseFloat(row.transactionAmount) : undefined,
      adminFee: row.adminFee ? parseFloat(row.adminFee) : 0,
      shippingFee: row.shippingFee ? parseFloat(row.shippingFee) : 0,
      serviceFee: row.serviceFee ? parseFloat(row.serviceFee) : 0,
      discount: row.discount ? parseFloat(row.discount) : 0,
      loginStatus: row.loginStatus,
      by: row.by,
      folderEvidence: row.folderEvidence,
      folderEvidence2: row.folderEvidence2,
    } as any;
  }

  /**
   * Create a new reimbursement
   * 
   * Validates that amount is positive before inserting.
   * Enhanced with project and asset validation.
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param data - The reimbursement data to create
   * @returns Promise resolving to the created reimbursement
   * @throws Error if validation fails or database operation fails
   * 
   * Requirements:
   * - 7.4: Implement createReimbursement with validation
   * - 9.3: Return reimbursement object matching the expected structure
   * - 3.2: Implement date validation logic
   * - 2.1: Validate project access
   * - 3.1: Validate asset access
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

    // Enhanced validation: Project access validation
    if (data.projectId) {
      const isProjectValid = await this.validateProjectAccess(data.projectId);
      if (!isProjectValid) {
        throw new Error('Invalid project or project is not active');
      }
    }

    // Asset validation is now handled externally via n8n
    // We only store the asset info if provided, without local database validation

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
        date, project, project_id, asset_id, receipt_image, receipt_image_2, lead_id, lead_name, submission_date, approvals,
        transaction_id, transaction_time, payment_method, transaction_amount, 
        admin_fee, shipping_fee, service_fee, discount, login_status, by, folder_evidence, folder_evidence_2
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING id::text, user_id::text as "userId", employee_name as "employeeName", 
                employee_email as "employeeEmail", amount, description, status, date, project,
                project_id::text as "projectId", asset_id::text as "assetId",
                receipt_image as "receiptImage", receipt_image_2 as "receiptImage2", lead_id::text as "leadId", lead_name as "leadName",
                approvals, created_at as "createdAt", updated_at as "updatedAt",
                transaction_id as "transactionId", transaction_time as "transactionTime",
                payment_method as "paymentMethod", transaction_amount as "transactionAmount",
                admin_fee as "adminFee", shipping_fee as "shippingFee", 
                service_fee as "serviceFee", discount, login_status as "loginStatus",
                by, folder_evidence as "folderEvidence", folder_evidence_2 as "folderEvidence2"
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
      data.projectId ? parseInt(data.projectId) : null,
      data.assetId ? parseInt(data.assetId) : null,
      (data as any).folderEvidence || null,
      (data as any).folderEvidence2 || (data as any).evidence2Image || null,
      user.lead_id || null,
      leadName,
      submissionDate,
      JSON.stringify({}), // Empty approvals object
      (data as any).transactionId || null,
      (data as any).transactionTime || null,
      (data as any).paymentMethod || (data as any).payment_method || null,
      (data as any).transactionAmount || null,
      (data as any).adminFee || 0,
      (data as any).shippingFee || 0,
      (data as any).serviceFee || 0,
      (data as any).discount || 0,
      (data as any).loginStatus || null,
      (data as any).by || null,
      (data as any).folderEvidence || null,
      (data as any).folderEvidence2 || (data as any).evidence2Image || null,
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
      receiptImage2: row.receiptImage2,
      approvals: row.approvals || {},
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
      // Additional transaction details
      transactionId: row.transactionId,
      transactionTime: row.transactionTime,
      paymentMethod: row.paymentMethod,
      transactionAmount: row.transactionAmount ? parseFloat(row.transactionAmount) : undefined,
      adminFee: row.adminFee ? parseFloat(row.adminFee) : 0,
      shippingFee: row.shippingFee ? parseFloat(row.shippingFee) : 0,
      serviceFee: row.serviceFee ? parseFloat(row.serviceFee) : 0,
      discount: row.discount ? parseFloat(row.discount) : 0,
      loginStatus: row.loginStatus,
      by: row.by,
      folderEvidence: row.folderEvidence,
      folderEvidence2: row.folderEvidence2,
    } as any;
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

  if ((data as any).receiptImage2 !== undefined) {
    updates.push(`receipt_image_2 = $${paramIndex}`);
    params.push((data as any).receiptImage2);
    paramIndex++;
  }

  if ((data as any).folderEvidence !== undefined) {
    updates.push(`folder_evidence = $${paramIndex}`);
    params.push((data as any).folderEvidence);
    paramIndex++;
  }

  if ((data as any).evidence2Image !== undefined) {
    updates.push(`folder_evidence_2 = $${paramIndex}`);
    params.push((data as any).evidence2Image);
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
   * Batch approve multiple reimbursements
   *
   * Updates multiple reimbursements with the same data in a batch operation.
   * Each reimbursement is updated individually and the results are collected.
   *
   * @param ids - Array of reimbursement IDs to update
   * @param data - The update data to apply to all reimbursements
   * @returns Promise resolving to array of updated reimbursements
   * @throws Error if any reimbursement update fails
   */
  async batchApprove(
    ids: string[],
    data: UpdateReimbursementInput
  ): Promise<Reimbursement[]> {
    const updatedReimbursements: Reimbursement[] = [];

    for (const id of ids) {
      const updated = await this.updateReimbursement(id, data);
      updatedReimbursements.push(updated);
    }

    return updatedReimbursements;
  }

  /**
   * Validate date logic: Asset registration date vs transaction date
   * 
   * Business rule: Asset registration date must be <= transaction date
   * 
   * @param assetDate - The asset registration date
   * @param transactionDate - The transaction date
   * @returns Promise resolving to true if valid, false otherwise
   * 
   * Requirements:
   * - 3.2: Implement date validation logic
   */
  async validateDateLogic(assetDate: Date, transactionDate: Date): Promise<boolean> {
    return this.assetService.validateAssetRegistrationDate(assetDate, transactionDate);
  }

  /**
   * Validate project access and status
   * 
   * Checks if project exists and is active for reimbursement requests
   * 
   * @param projectId - The project ID to validate
   * @returns Promise resolving to true if valid and active, false otherwise
   * 
   * Requirements:
   * - 2.1: Only active projects should be available for reimbursement requests
   */
  async validateProjectAccess(projectId: string): Promise<boolean> {
    try {
      const project = await this.projectService.getProjectById(projectId);
      return project !== null && project.status === 'ACTIVE';
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate asset access and status
   * 
   * Checks if asset exists and is active for reimbursement requests
   * 
   * @param assetId - The asset ID to validate
   * @returns Promise resolving to true if valid and active, false otherwise
   * 
   * Requirements:
   * - 3.1: Only active assets should be available for reimbursement requests
   */
  async validateAssetAccess(assetId: string): Promise<boolean> {
    try {
      const asset = await this.assetService.getAssetById(assetId);
      return asset !== null && asset.status === 'ACTIVE';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get reimbursements by project ID
   * 
   * @param projectId - The project ID to filter by
   * @returns Promise resolving to array of reimbursements for the project
   * 
   * Requirements:
   * - 2.1: Support project-based filtering for reimbursements
   */
  async getReimbursementsByProject(projectId: string): Promise<Reimbursement[]> {
    const query = `
      SELECT 
        r.id::text,
        r.user_id::text as "userId",
        COALESCE(r.employee_name, u.name) as "employeeName",
        COALESCE(r.employee_email, u.email) as "employeeEmail",
        r.amount,
        r.description,
        r.status,
        COALESCE(r.date, r.submission_date::date) as date,
        COALESCE(r.project, 'MaxStream') as project,
        r.receipt_image as "receiptImage",
        r.receipt_image_2 as "receiptImage2",
        r.asset,
        r.approvals,
        r.rejection_reason as "rejectionReason",
        r.approval_date as "approvalDate",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        COALESCE(r.lead_id::text, u.lead_id::text) as "leadId",
        COALESCE(r.lead_name, l.name) as "leadName",
        r.transaction_id as "transactionId",
        r.transaction_time as "transactionTime",
        r.payment_method as "paymentMethod",
        r.transaction_amount as "transactionAmount",
        r.admin_fee as "adminFee",
        r.shipping_fee as "shippingFee",
        r.service_fee as "serviceFee",
        r.discount,
        r.login_status as "loginStatus",
        r.by,
        r.folder_evidence as "folderEvidence",
        r.folder_evidence_2 as "folderEvidence2"
      FROM reimbursements r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN users l ON COALESCE(r.lead_id, u.lead_id) = l.id
      WHERE r.project_id = $1
      ORDER BY r.submission_date DESC
    `;

    const result = await db.query(query, [projectId]);

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
      receiptImage2: row.receiptImage2,
      asset: row.asset,
      approvals: row.approvals || {},
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
      // Additional transaction details
      transactionId: row.transactionId,
      transactionTime: row.transactionTime,
      paymentMethod: row.paymentMethod,
      transactionAmount: row.transactionAmount ? parseFloat(row.transactionAmount) : undefined,
      adminFee: row.adminFee ? parseFloat(row.adminFee) : 0,
      shippingFee: row.shippingFee ? parseFloat(row.shippingFee) : 0,
      serviceFee: row.serviceFee ? parseFloat(row.serviceFee) : 0,
      discount: row.discount ? parseFloat(row.discount) : 0,
      loginStatus: row.loginStatus,
      by: row.by,
      folderEvidence: row.folderEvidence,
      folderEvidence2: row.folderEvidence2,
    } as any));
  }

  /**
   * Validate file upload for reimbursement request
   * 
   * Checks if file can be uploaded (not already used in active requests)
   * 
   * @param requestId - The reimbursement request ID
   * @param fileName - The file name to validate
   * @returns Promise resolving to true if upload is allowed, false otherwise
   * 
   * Requirements:
   * - 3.3: Implement file upload anti-duplication
   */
  async validateFileUpload(requestId: string, fileName: string): Promise<boolean> {
    // Check if file is already used in other active requests
    const query = `
      SELECT COUNT(*) as count 
      FROM documents d
      JOIN reimbursements r ON d.request_id = r.id::text
      WHERE d.system_filename = $1 
      AND d.request_id != $2
      AND r.status IN ('pending', 'approved_by_lead', 'approved_by_head')
      AND d.is_used = true
    `;

    const result = await db.query(query, [fileName, requestId]);
    return parseInt(result.rows[0].count) === 0;
  }

  /**
   * Attach document to reimbursement request
   * 
   * Links a document to a reimbursement request
   * 
   * @param requestId - The reimbursement request ID
   * @param fileId - The file document ID
   * @returns Promise resolving when attachment is complete
   * 
   * Requirements:
   * - 4.1: Support document attachment to reimbursement requests
   */
  async attachDocument(requestId: string, fileId: string): Promise<void> {
    // Update the document to mark it as used and link to request
    const query = `
      UPDATE documents 
      SET request_id = $1, is_used = true 
      WHERE id = $2
    `;

    await db.query(query, [requestId, fileId]);
  }

  /**
   * Get reimbursements by user ID
   * 
   * @param userId - The user ID to filter by
   * @returns Promise resolving to array of reimbursements for the user
   */
  async getReimbursementsByUser(userId: string): Promise<Reimbursement[]> {
    return this.getReimbursements({ userId });
  }

  /**
   * Update reimbursement status with approval workflow
   * 
   * New Flow:
   * pending -> approved_by_lead -> submitted_to_head -> approved_by_head -> submitted_to_finance -> approved_by_finance
   * 
   * Lead Flow:
   *   - Request page: See pending requests from their team, can approve -> status becomes approved_by_lead
   *   - Approval page: See approved_by_lead requests, can submit to head -> status becomes submitted_to_head
   * 
   * Head Flow:
   *   - Request page: See submitted_to_head requests, can approve -> status becomes approved_by_head
   *   - Approval page: See approved_by_head requests, can submit to finance -> status becomes submitted_to_finance
   * 
   * Finance Flow:
   *   - Request page: See submitted_to_finance requests, can approve -> status becomes approved_by_finance
   * 
   * @param id - The reimbursement ID
   * @param status - The new status
   * @param approvedBy - The user ID who approved/rejected
   * @param rejectionReason - Optional rejection reason
   * @returns Promise resolving to updated reimbursement
   */
  async updateReimbursementStatus(
    id: string, 
    status: ReimbursementStatus, 
    approvedBy: string, 
    rejectionReason?: string
  ): Promise<Reimbursement> {
    // Get current reimbursement to check approval sequence
    const current = await this.getReimbursementById(id);
    if (!current) {
      throw new Error('Reimbursement not found');
    }

    // Validate approval sequence based on new flow
    // pending -> approved_by_lead -> submitted_to_head -> approved_by_head -> submitted_to_finance -> approved_by_finance
    
    if (status === 'approved_by_lead' && current.status !== 'pending') {
      throw new Error('Invalid approval sequence: Lead can only approve pending requests');
    }
    
    if (status === 'submitted_to_head' && current.status !== 'approved_by_lead') {
      throw new Error('Invalid approval sequence: Submit to Head requires Lead approval first');
    }
    
    if (status === 'approved_by_head' && current.status !== 'submitted_to_head') {
      throw new Error('Invalid approval sequence: Head can only approve requests submitted by Lead');
    }
    
    if (status === 'submitted_to_finance' && current.status !== 'approved_by_head') {
      throw new Error('Invalid approval sequence: Submit to Finance requires Head approval first');
    }
    
    if (status === 'approved_by_finance' && current.status !== 'submitted_to_finance') {
      throw new Error('Invalid approval sequence: Finance can only approve requests submitted by Head');
    }

    // Build approvals object
    const approvals = current.approvals || {};
    const approvalDate = new Date().toISOString();

    if (status === 'approved_by_lead') {
      approvals.lead = { approved: true, by: approvedBy, date: approvalDate };
    } else if (status === 'submitted_to_head') {
      // Lead submits to head - approval already recorded, just add submit flag
      if (approvals.lead) {
        approvals.lead = { 
          approved: approvals.lead.approved, 
          by: approvals.lead.by, 
          date: approvals.lead.date, 
          comment: approvals.lead.comment,
          submittedToHead: true, 
          submittedDate: approvalDate 
        };
      }
    } else if (status === 'approved_by_head') {
      approvals.head = { approved: true, by: approvedBy, date: approvalDate };
    } else if (status === 'submitted_to_finance') {
      // Head submits to finance - approval already recorded, just add submit flag
      if (approvals.head) {
        approvals.head = { 
          approved: approvals.head.approved, 
          by: approvals.head.by, 
          date: approvals.head.date, 
          comment: approvals.head.comment,
          submittedToFinance: true, 
          submittedDate: approvalDate 
        };
      }
    } else if (status === 'approved_by_finance') {
      approvals.finance = { approved: true, by: approvedBy, date: approvalDate };
    } else if (status === 'rejected') {
      // For rejection, mark as not approved based on current status
      if (current.status === 'pending') {
        approvals.lead = { approved: false, by: approvedBy, date: approvalDate, comment: rejectionReason };
      } else if (current.status === 'approved_by_lead' || current.status === 'submitted_to_head') {
        approvals.head = { approved: false, by: approvedBy, date: approvalDate, comment: rejectionReason };
      } else {
        approvals.finance = { approved: false, by: approvedBy, date: approvalDate, comment: rejectionReason };
      }
    }

    // Update the reimbursement
    const updateData: UpdateReimbursementInput = {
      status,
      approvals,
      rejectionReason,
      approvalDate: status === 'approved_by_finance' || status === 'rejected' ? approvalDate : undefined
    };

    const updated = await this.updateReimbursement(id, updateData);

    // If final approval, submit to project webhook
    if (status === 'approved_by_finance') {
      try {
        const { submitToProject } = await import('@/lib/services/reimbursementService');
        await submitToProject(updated, updated.project);
      } catch (error) {
        console.error('Failed to submit to project webhook:', error);
        // Don't fail the approval if webhook fails
      }
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
