/**
 * Service Layer Type Definitions
 * 
 * This file defines the service interfaces and input/output types for the database migration.
 * Both mock and database service implementations must conform to these interfaces.
 * 
 * Requirements: 7.1, 7.2
 */

import { User, Reimbursement, UserRole, ReimbursementStatus } from '@/lib/types';

// ============================================================================
// Input Types for User Operations
// ============================================================================

/**
 * Input data for creating a new user
 */
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  leadId?: string;
}

/**
 * Input data for updating an existing user
 * All fields are optional to support partial updates
 */
export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  leadId?: string;
}

// ============================================================================
// Input Types for Reimbursement Operations
// ============================================================================

/**
 * Input data for creating a new reimbursement
 */
export interface CreateReimbursementInput {
  userId: string;
  amount: number;
  description: string;
  date?: string; // Submission date, defaults to current date if not provided
  project?: string;
  receiptImage?: string;
  employeeName?: string;
  employeeEmail?: string;
}

/**
 * Input data for updating an existing reimbursement
 * All fields are optional to support partial updates
 */
export interface UpdateReimbursementInput {
  amount?: number;
  description?: string;
  status?: ReimbursementStatus;
  approvalDate?: string;
  rejectionReason?: string;
  approvedBy?: {
    head?: string;
    lead?: string;
    finance?: string;
  };
  approvals?: any; // JSONB field for detailed approval tracking
  asset?: string;
  receiptImage?: string;
}

/**
 * Filters for querying reimbursements
 */
export interface ReimbursementFilters {
  userId?: string;
  status?: ReimbursementStatus;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * User Service Interface
 * 
 * Defines the contract for user data operations.
 * Both MockUserService and DatabaseUserService must implement this interface.
 * 
 * Requirements: 7.1
 */
export interface IUserService {
  /**
   * Retrieve all users from the data source
   * @returns Promise resolving to array of all users
   */
  getUsers(): Promise<User[]>;

  /**
   * Retrieve a specific user by ID
   * @param id - The user ID to look up
   * @returns Promise resolving to the user or null if not found
   */
  getUserById(id: string): Promise<User | null>;

  /**
   * Create a new user
   * @param data - The user data to create
   * @returns Promise resolving to the created user
   * @throws Error if validation fails or user already exists
   */
  createUser(data: CreateUserInput): Promise<User>;

  /**
   * Update an existing user
   * @param id - The user ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated user
   * @throws Error if user not found or validation fails
   */
  updateUser(id: string, data: UpdateUserInput): Promise<User>;
}

/**
 * Reimbursement Service Interface
 * 
 * Defines the contract for reimbursement data operations.
 * Both MockReimbursementService and DatabaseReimbursementService must implement this interface.
 * 
 * Requirements: 7.2
 */
export interface IReimbursementService {
  /**
   * Retrieve reimbursements with optional filtering
   * @param filters - Optional filters to apply to the query
   * @returns Promise resolving to array of reimbursements matching the filters
   */
  getReimbursements(filters?: ReimbursementFilters): Promise<Reimbursement[]>;

  /**
   * Retrieve a specific reimbursement by ID
   * @param id - The reimbursement ID to look up
   * @returns Promise resolving to the reimbursement or null if not found
   */
  getReimbursementById(id: string): Promise<Reimbursement | null>;

  /**
   * Create a new reimbursement
   * @param data - The reimbursement data to create
   * @returns Promise resolving to the created reimbursement
   * @throws Error if validation fails
   */
  createReimbursement(data: CreateReimbursementInput): Promise<Reimbursement>;

  /**
   * Update an existing reimbursement
   * @param id - The reimbursement ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated reimbursement
   * @throws Error if reimbursement not found or validation fails
   */
  updateReimbursement(id: string, data: UpdateReimbursementInput): Promise<Reimbursement>;

  /**
   * Delete a reimbursement by ID
   * @param id - The reimbursement ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if reimbursement not found
   */
  deleteReimbursement(id: string): Promise<void>;
}
