/**
 * Service Layer Type Definitions
 * 
 * This file defines the service interfaces and input/output types for the database migration.
 * Both mock and database service implementations must conform to these interfaces.
 * 
 * Requirements: 7.1, 7.2
 */

import { User, Reimbursement, UserRole, ReimbursementStatus, Project, Asset, AssetMatchResponse, FileDocument } from '@/lib/types';

// ============================================================================
// Input Types for Project Operations
// ============================================================================

/**
 * Input data for creating a new project
 */
export interface CreateProjectInput {
  projectId: string; // Format: 5-002-079
  name: string;
}

/**
 * Input data for updating an existing project
 * All fields are optional to support partial updates
 */
export interface UpdateProjectInput {
  projectId?: string;
  name?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

/**
 * Filters for querying projects
 */
export interface ProjectFilters {
  status?: 'ACTIVE' | 'INACTIVE';
  name?: string;
}

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
  status?: 'ACTIVE' | 'INACTIVE'; // Enhanced: Status management
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
  projectId?: string; // Enhanced: Reference to Project table
  assetId?: string; // Enhanced: Reference to Asset table
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
  folderEvidence?: string;
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
// Input Types for Asset Operations
// ============================================================================

/**
 * Input data for creating a new asset
 */
export interface CreateAssetInput {
  assetNumber: string;
  description: string;
  registrationDate: Date;
  createdBy: string;
}

/**
 * Input data for updating an existing asset
 * All fields are optional to support partial updates
 */
export interface UpdateAssetInput {
  assetNumber?: string;
  description?: string;
  registrationDate?: Date;
  status?: 'ACTIVE' | 'INACTIVE';
}

/**
 * Filters for querying assets
 */
export interface AssetFilters {
  status?: 'ACTIVE' | 'INACTIVE';
  createdBy?: string;
  assetNumber?: string;
  description?: string;
}

// ============================================================================
// Input Types for File Operations
// ============================================================================

/**
 * Input data for uploading a file
 */
export interface UploadFileInput {
  requestId: string;
  file: File;
  projectName?: string;
}

/**
 * Input data for creating a file document record
 */
export interface CreateFileDocumentInput {
  requestId: string;
  originalFileName: string;
  systemFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Filters for querying file documents
 */
export interface FileDocumentFilters {
  requestId?: string;
  isUsed?: boolean;
  mimeType?: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Asset Service Interface
 * 
 * Defines the contract for asset data operations with n8n webhook integration.
 * Both MockAssetService and DatabaseAssetService must implement this interface.
 * 
 * Requirements: 3.1, 3.2
 */
export interface IAssetService {
  /**
   * Create a new asset
   * @param data - The asset data to create
   * @returns Promise resolving to the created asset
   * @throws Error if validation fails or asset number already exists
   */
  createAsset(data: CreateAssetInput): Promise<Asset>;

  /**
   * Update an existing asset
   * @param id - The asset ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated asset
   * @throws Error if asset not found or validation fails
   */
  updateAsset(id: string, data: UpdateAssetInput): Promise<Asset>;

  /**
   * Retrieve a specific asset by ID
   * @param id - The asset ID to look up
   * @returns Promise resolving to the asset or null if not found
   */
  getAssetById(id: string): Promise<Asset | null>;

  /**
   * Retrieve all assets from the data source
   * @param filters - Optional filters to apply to the query
   * @returns Promise resolving to array of assets matching the filters
   */
  getAllAssets(filters?: AssetFilters): Promise<Asset[]>;

  /**
   * Retrieve active assets only (for dropdown selections)
   * @returns Promise resolving to array of active assets
   */
  getActiveAssets(): Promise<Asset[]>;

  /**
   * Delete an asset by ID
   * @param id - The asset ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if asset not found
   */
  deleteAsset(id: string): Promise<void>;

  /**
   * Validate asset number uniqueness
   * @param assetNumber - The asset number to validate
   * @returns Promise resolving to true if unique, false if already exists
   */
  validateAssetNumber(assetNumber: string): Promise<boolean>;

  /**
   * Validate asset registration date against transaction date
   * @param registrationDate - The asset registration date
   * @param transactionDate - The transaction date to validate against
   * @returns Promise resolving to true if valid, false otherwise
   */
  validateAssetRegistrationDate(registrationDate: Date, transactionDate: Date): Promise<boolean>;

  /**
   * Match a transaction description to an asset using n8n webhook
   * @param description - Transaction description to match
   * @returns Asset matching result with matched asset details
   */
  matchAssetViaWebhook(description: string): Promise<AssetMatchResponse>;
}

/**
 * Project Service Interface
 * 
 * Defines the contract for project data operations.
 * Both MockProjectService and DatabaseProjectService must implement this interface.
 * 
 * Requirements: 2.1, 2.2
 */
export interface IProjectService {
  /**
   * Retrieve all projects from the data source
   * @param filters - Optional filters to apply to the query
   * @returns Promise resolving to array of projects matching the filters
   */
  getProjects(filters?: ProjectFilters): Promise<Project[]>;

  /**
   * Retrieve active projects only (for dropdown selections)
   * @returns Promise resolving to array of active projects
   */
  getActiveProjects(): Promise<Project[]>;

  /**
   * Retrieve a specific project by ID
   * @param id - The project ID to look up
   * @returns Promise resolving to the project or null if not found
   */
  getProjectById(id: string): Promise<Project | null>;

  /**
   * Create a new project
   * @param data - The project data to create
   * @returns Promise resolving to the created project
   * @throws Error if validation fails or project ID already exists
   */
  createProject(data: CreateProjectInput): Promise<Project>;

  /**
   * Update an existing project
   * @param id - The project ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated project
   * @throws Error if project not found or validation fails
   */
  updateProject(id: string, data: UpdateProjectInput): Promise<Project>;

  /**
   * Delete a project by ID
   * @param id - The project ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if project not found
   */
  deleteProject(id: string): Promise<void>;

  /**
   * Validate project ID format (5-002-079)
   * @param projectId - The project ID to validate
   * @returns Promise resolving to true if valid, false otherwise
   */
  validateProjectId(projectId: string): Promise<boolean>;
}

/**
 * User Service Interface
 * 
 * Defines the contract for user data operations.
 * Both MockUserService and DatabaseUserService must implement this interface.
 * 
 * Requirements: 7.1, 1.1, 1.2 (Enhanced)
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

  // Enhanced methods for status management and lead assignment
  
  /**
   * Set user status (ACTIVE/INACTIVE)
   * @param userId - The user ID to update
   * @param status - The status to set
   * @returns Promise resolving to the updated user
   * @throws Error if user not found
   */
  setUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<User>;

  /**
   * Assign a lead to a user
   * @param userId - The user ID to update
   * @param leadId - The lead user ID to assign (null to remove lead)
   * @returns Promise resolving to the updated user
   * @throws Error if user or lead not found, or if lead assignment is invalid
   */
  assignLead(userId: string, leadId: string | null): Promise<User>;

  /**
   * Get users by status
   * @param status - The status to filter by
   * @returns Promise resolving to array of users with the specified status
   */
  getUsersByStatus(status: 'ACTIVE' | 'INACTIVE'): Promise<User[]>;

  /**
   * Get users by role
   * @param role - The role to filter by
   * @returns Promise resolving to array of users with the specified role
   */
  getUsersByRole(role: UserRole): Promise<User[]>;

  /**
   * Get user hierarchy (users under a specific lead)
   * @param leadId - The lead user ID
   * @returns Promise resolving to array of users under the specified lead
   */
  getUserHierarchy(leadId: string): Promise<User[]>;

  /**
   * Validate if a user can be assigned as a lead
   * @param userId - The user ID to validate
   * @returns Promise resolving to true if user can be a lead, false otherwise
   */
  validateLeadEligibility(userId: string): Promise<boolean>;
}

/**
 * Reimbursement Service Interface
 * 
 * Defines the contract for reimbursement data operations.
 * Both MockReimbursementService and DatabaseReimbursementService must implement this interface.
 * Enhanced with validation methods for project, asset, and date validation.
 * 
 * Requirements: 7.2, 3.2
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

  // Enhanced validation methods
  /**
   * Validate date logic: Asset registration date vs transaction date
   * @param assetDate - The asset registration date
   * @param transactionDate - The transaction date
   * @returns Promise resolving to true if valid, false otherwise
   */
  validateDateLogic(assetDate: Date, transactionDate: Date): Promise<boolean>;

  /**
   * Validate project access and status
   * @param projectId - The project ID to validate
   * @returns Promise resolving to true if valid and active, false otherwise
   */
  validateProjectAccess(projectId: string): Promise<boolean>;

  /**
   * Validate asset access and status
   * @param assetId - The asset ID to validate
   * @returns Promise resolving to true if valid and active, false otherwise
   */
  validateAssetAccess(assetId: string): Promise<boolean>;

  /**
   * Get reimbursements by project ID
   * @param projectId - The project ID to filter by
   * @returns Promise resolving to array of reimbursements for the project
   */
  getReimbursementsByProject(projectId: string): Promise<Reimbursement[]>;

  /**
   * Validate file upload for reimbursement request
   * @param requestId - The reimbursement request ID
   * @param fileName - The file name to validate
   * @returns Promise resolving to true if upload is allowed, false otherwise
   */
  validateFileUpload(requestId: string, fileName: string): Promise<boolean>;

  /**
   * Attach document to reimbursement request
   * @param requestId - The reimbursement request ID
   * @param fileId - The file document ID
   * @returns Promise resolving when attachment is complete
   */
  attachDocument(requestId: string, fileId: string): Promise<void>;

  /**
   * Batch approve multiple reimbursements
   * @param ids - Array of reimbursement IDs to approve
   * @param data - Approval data (status, approvals, etc.)
   * @returns Promise resolving to array of updated reimbursements
   */
  batchApprove(ids: string[], data: UpdateReimbursementInput): Promise<Reimbursement[]>;
}

/**
 * File Service Interface
 * 
 * Defines the contract for file metadata operations with anti-duplication and auto-rename.
 * Handles file metadata tracking while integrating with existing storage system.
 * 
 * Requirements: 4.1, 3.3
 */
export interface IFileService {
  /**
   * Upload a file and create metadata record with auto-rename
   * @param data - The file upload data
   * @returns Promise resolving to the created file document
   * @throws Error if file validation fails or anti-duplication check fails
   */
  uploadFile(data: UploadFileInput): Promise<FileDocument>;

  /**
   * Generate system filename with auto-rename format [sequence]_transaction_id.ext
   * @param requestId - The request ID (transaction ID)
   * @param originalFileName - The original filename
   * @returns Promise resolving to the generated system filename
   */
  generateFileName(requestId: string, originalFileName: string): Promise<string>;

  /**
   * Check if a file is available for use (anti-duplication logic)
   * @param systemFileName - The system filename to check
   * @returns Promise resolving to true if available, false if already used
   */
  checkFileAvailability(systemFileName: string): Promise<boolean>;

  /**
   * Mark a file as used to prevent duplication
   * @param fileId - The file document ID to mark as used
   * @returns Promise resolving when file is marked as used
   * @throws Error if file not found
   */
  markFileAsUsed(fileId: string): Promise<void>;

  /**
   * Get all file documents for a specific request
   * @param requestId - The request ID to get files for
   * @returns Promise resolving to array of file documents
   */
  getFilesByRequest(requestId: string): Promise<FileDocument[]>;

  /**
   * Get a specific file document by ID
   * @param fileId - The file document ID
   * @returns Promise resolving to the file document or null if not found
   */
  getFileById(fileId: string): Promise<FileDocument | null>;

  /**
   * Delete a file document and its physical file
   * @param fileId - The file document ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if file not found
   */
  deleteFile(fileId: string): Promise<void>;

  /**
   * Validate file upload constraints
   * @param requestId - The request ID
   * @param fileName - The filename to validate
   * @returns Promise resolving to true if valid, false otherwise
   */
  validateFileUpload(requestId: string, fileName: string): Promise<boolean>;

  /**
   * Get all file documents with optional filtering
   * @param filters - Optional filters to apply
   * @returns Promise resolving to array of file documents
   */
  getAllFiles(filters?: FileDocumentFilters): Promise<FileDocument[]>;
}

// ============================================================================
// Input Types for Report Operations
// ============================================================================

/**
 * Filters for generating reports
 */
export interface ReportFilters {
  projectId?: string;
  userName?: string;
  leadName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: ReimbursementStatus[];
}

/**
 * Report summary data
 */
export interface ReportSummary {
  totalReimbursements: number;
  totalAmount: number;
  statusBreakdown: {
    pending: number;
    approved_by_lead: number;
    approved_by_head: number;
    approved_by_finance: number;
    rejected: number;
  };
  projectBreakdown: {
    [projectName: string]: {
      count: number;
      amount: number;
    };
  };
}

/**
 * Report Service Interface
 * 
 * Defines the contract for report generation operations with Excel export.
 * Provides data aggregation and filtering capabilities for reimbursement reports.
 * 
 * Requirements: 6.1
 */
export interface IReportService {
  /**
   * Generate Excel report with applied filters
   * @param filters - The filters to apply to the report data
   * @returns Promise resolving to Excel file buffer
   * @throws Error if report generation fails
   */
  generateExcelReport(filters: ReportFilters): Promise<Buffer>;

  /**
   * Get report data with applied filters
   * @param filters - The filters to apply to the data
   * @returns Promise resolving to array of reimbursements matching the filters
   */
  getReportData(filters: ReportFilters): Promise<Reimbursement[]>;

  /**
   * Validate report filters
   * @param filters - The filters to validate
   * @returns Promise resolving to true if filters are valid, false otherwise
   */
  validateReportFilters(filters: ReportFilters): Promise<boolean>;

  /**
   * Get report summary statistics
   * @param filters - The filters to apply to the summary
   * @returns Promise resolving to report summary data
   */
  getReportSummary(filters: ReportFilters): Promise<ReportSummary>;
}
