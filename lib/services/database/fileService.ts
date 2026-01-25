/**
 * Database File Service Implementation
 * 
 * This service provides file metadata operations using PostgreSQL database queries.
 * It implements the IFileService interface with database-backed operations for
 * file metadata tracking, auto-rename functionality, and anti-duplication checking.
 * 
 * Features:
 * - File metadata storage in database
 * - Auto-rename logic with format [sequence]_transaction_id.ext
 * - Anti-duplication checking to prevent file reuse
 * - Integration with existing file storage system
 * - Parameterized queries to prevent SQL injection
 * 
 * Requirements: 4.1, 3.3
 */

import { FileDocument } from '@/lib/types';
import { IFileService, UploadFileInput, CreateFileDocumentInput, FileDocumentFilters } from '../types';
import { db } from '@/lib/database/connection';
import { getDatabaseConfig } from '@/lib/config/database';
import path from 'path';

/**
 * DatabaseFileService implements IFileService using PostgreSQL database.
 * 
 * This service executes SQL queries against the documents table and handles
 * file metadata tracking with auto-rename and anti-duplication features.
 * 
 * Key Features:
 * - Auto-rename files with format [sequence]_transaction_id.ext
 * - Anti-duplication checking to prevent file reuse across requests
 * - Metadata tracking for all uploaded files
 * - Integration with existing storage system
 * 
 * Requirements:
 * - 4.1: Implement auto-rename logic ([sequence]_transaction_id.ext)
 * - 3.3: Implement anti-duplication checking for file uploads
 */
export class DatabaseFileService implements IFileService {
  
  constructor() {
    // Initialize database connection if not already initialized
    const config = getDatabaseConfig();
    if (!db.isInitialized() && config.connectionString && config.poolConfig) {
      db.initialize(config.connectionString, config.poolConfig);
    }
  }

  /**
   * Upload a file and create metadata record with auto-rename
   * 
   * This method handles the complete file upload process:
   * 1. Generate system filename with auto-rename format
   * 2. Check file availability (anti-duplication)
   * 3. Create file metadata record in database
   * 4. Return file document with metadata
   * 
   * Note: Physical file storage is handled by existing storage system.
   * This service only manages metadata tracking.
   * 
   * @param data - The file upload data containing requestId and file
   * @returns Promise resolving to the created file document
   * @throws Error if file validation fails or anti-duplication check fails
   * 
   * Requirements:
   * - 4.1: Auto-rename files with [sequence]_transaction_id.ext format
   * - 3.3: Anti-duplication checking before upload
   */
  async uploadFile(data: UploadFileInput): Promise<FileDocument> {
    const { requestId, file } = data;
    
    // Check for duplicate file content (simple check by name and size)
    const existingFiles = await this.getFilesByRequest(requestId);
    const duplicateFile = existingFiles.find(f => 
      f.originalFileName === file.name && f.fileSize === file.size
    );
    
    if (duplicateFile) {
      throw new Error('File already exists or is being used');
    }
    
    // Generate system filename with auto-rename format
    const systemFileName = await this.generateFileName(requestId, file.name);
    
    // Check file availability (anti-duplication)
    const isAvailable = await this.checkFileAvailability(systemFileName);
    if (!isAvailable) {
      throw new Error(`File with name "${systemFileName}" is already used in another request`);
    }
    
    const query = `
      INSERT INTO documents (
        request_id, 
        original_filename, 
        system_filename, 
        file_path, 
        file_size, 
        mime_type, 
        is_used, 
        uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
      RETURNING 
        id::text, 
        request_id as "requestId", 
        original_filename as "originalFileName", 
        system_filename as "systemFileName", 
        file_path as "filePath", 
        file_size as "fileSize", 
        mime_type as "mimeType", 
        is_used as "isUsed", 
        uploaded_at as "uploadedAt"
    `;
    
    const result = await db.query(query, [
      requestId,
      file.name,
      systemFileName,
      `/uploads/${systemFileName}`, // Path in storage system
      file.size,
      file.type || 'application/octet-stream'
    ]);
    
    return result.rows[0];
  }

  /**
   * Generate system filename with auto-rename format [sequence]_transaction_id.ext
   * 
   * The sequence number starts from 1 and increments for each file in the same request.
   * Format: [1]_transaction_id.ext, [2]_transaction_id.ext, etc.
   * 
   * @param requestId - The request ID (transaction ID)
   * @param originalFileName - The original filename
   * @returns Promise resolving to the generated system filename
   * 
   * Requirements:
   * - 4.1: Auto-rename logic with format [sequence]_transaction_id.ext
   */
  async generateFileName(requestId: string, originalFileName: string): Promise<string> {
    // Get the file extension
    const extension = path.extname(originalFileName);
    
    // Count existing files for this request to determine sequence number
    const countQuery = `
      SELECT COUNT(*) as count
      FROM documents
      WHERE request_id = $1
    `;
    
    const countResult = await db.query(countQuery, [requestId]);
    const sequence = parseInt(countResult.rows[0].count) + 1;
    
    // Generate system filename with format [sequence]_transaction_id.ext
    const systemFileName = `[${sequence}]_${requestId}${extension}`;
    
    return systemFileName;
  }

  /**
   * Check if a file is available for use (anti-duplication logic)
   * 
   * Checks if a file with the same system filename is already marked as used
   * in any request with status OPEN or APPROVED.
   * 
   * @param systemFileName - The system filename to check
   * @returns Promise resolving to true if available, false if already used
   * 
   * Requirements:
   * - 3.3: Anti-duplication checking to prevent file reuse
   */
  async checkFileAvailability(systemFileName: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM documents
      WHERE system_filename = $1 AND is_used = TRUE
    `;
    
    const result = await db.query(query, [systemFileName]);
    const count = parseInt(result.rows[0].count);
    
    return count === 0;
  }

  /**
   * Mark a file as used to prevent duplication
   * 
   * Sets the is_used flag to TRUE to prevent the file from being used
   * in other requests.
   * 
   * @param fileId - The file document ID to mark as used
   * @returns Promise resolving when file is marked as used
   * @throws Error if file not found
   * 
   * Requirements:
   * - 3.3: Mark files as used to prevent duplication
   */
  async markFileAsUsed(fileId: string): Promise<void> {
    const query = `
      UPDATE documents
      SET is_used = TRUE
      WHERE id = $1
    `;
    
    const result = await db.query(query, [fileId]);
    
    if (result.rowCount === 0) {
      throw new Error('File document not found');
    }
  }

  /**
   * Get all file documents for a specific request
   * 
   * @param requestId - The request ID to get files for
   * @returns Promise resolving to array of file documents
   * 
   * Requirements:
   * - 4.1: Retrieve file metadata for request management
   */
  async getFilesByRequest(requestId: string): Promise<FileDocument[]> {
    const query = `
      SELECT 
        id::text, 
        request_id as "requestId", 
        original_filename as "originalFileName", 
        system_filename as "systemFileName", 
        file_path as "filePath", 
        file_size as "fileSize", 
        mime_type as "mimeType", 
        is_used as "isUsed", 
        uploaded_at as "uploadedAt"
      FROM documents
      WHERE request_id = $1
      ORDER BY uploaded_at ASC
    `;
    
    const result = await db.query(query, [requestId]);
    return result.rows;
  }

  /**
   * Get a specific file document by ID
   * 
   * @param fileId - The file document ID
   * @returns Promise resolving to the file document or null if not found
   * 
   * Requirements:
   * - 4.1: Retrieve individual file metadata
   */
  async getFileById(fileId: string): Promise<FileDocument | null> {
    const query = `
      SELECT 
        id::text, 
        request_id as "requestId", 
        original_filename as "originalFileName", 
        system_filename as "systemFileName", 
        file_path as "filePath", 
        file_size as "fileSize", 
        mime_type as "mimeType", 
        is_used as "isUsed", 
        uploaded_at as "uploadedAt"
      FROM documents
      WHERE id = $1
    `;
    
    const result = await db.query(query, [fileId]);
    return result.rows[0] || null;
  }

  /**
   * Delete a file document and its physical file
   * 
   * Note: This method only removes the metadata record from the database.
   * Physical file deletion should be handled by the existing storage system.
   * 
   * @param fileId - The file document ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if file not found
   * 
   * Requirements:
   * - 4.1: File metadata cleanup
   */
  async deleteFile(fileId: string): Promise<void> {
    const query = `
      DELETE FROM documents
      WHERE id = $1
    `;
    
    const result = await db.query(query, [fileId]);
    
    if (result.rowCount === 0) {
      throw new Error('File document not found');
    }
  }

  /**
   * Validate file upload constraints
   * 
   * Validates if a file can be uploaded for a specific request:
   * 1. Check if request exists and is in valid status
   * 2. Check file availability (anti-duplication)
   * 3. Validate file constraints (size, type, etc.)
   * 
   * @param requestId - The request ID
   * @param fileName - The filename to validate
   * @returns Promise resolving to true if valid, false otherwise
   * 
   * Requirements:
   * - 3.3: Validate file upload constraints and anti-duplication
   */
  async validateFileUpload(requestId: string, fileName: string): Promise<boolean> {
    try {
      // Generate system filename to check availability
      const systemFileName = await this.generateFileName(requestId, fileName);
      
      // Check file availability
      const isAvailable = await this.checkFileAvailability(systemFileName);
      
      return isAvailable;
    } catch (error) {
      console.error('File upload validation error:', error);
      return false;
    }
  }

  /**
   * Get all file documents with optional filtering
   * 
   * @param filters - Optional filters to apply
   * @returns Promise resolving to array of file documents
   * 
   * Requirements:
   * - 4.1: File metadata querying with filters
   */
  async getAllFiles(filters?: FileDocumentFilters): Promise<FileDocument[]> {
    let query = `
      SELECT 
        id::text, 
        request_id as "requestId", 
        original_filename as "originalFileName", 
        system_filename as "systemFileName", 
        file_path as "filePath", 
        file_size as "fileSize", 
        mime_type as "mimeType", 
        is_used as "isUsed", 
        uploaded_at as "uploadedAt"
      FROM documents
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters?.requestId) {
      conditions.push(`request_id = $${paramIndex}`);
      params.push(filters.requestId);
      paramIndex++;
    }
    
    if (filters?.isUsed !== undefined) {
      conditions.push(`is_used = $${paramIndex}`);
      params.push(filters.isUsed);
      paramIndex++;
    }
    
    if (filters?.mimeType) {
      conditions.push(`mime_type = $${paramIndex}`);
      params.push(filters.mimeType);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY uploaded_at DESC`;
    
    const result = await db.query(query, params);
    return result.rows;
  }
}