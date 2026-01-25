/**
 * Database Asset Service Implementation
 * 
 * This service provides asset data operations using PostgreSQL database queries.
 * It implements asset management with integration to existing n8n webhook for asset matching.
 * 
 * Features:
 * - Asset number uniqueness validation
 * - CRUD operations for asset master data
 * - Integration with existing n8n asset matching webhook
 * - Status-based filtering for active/inactive assets
 * - Date validation for asset registration
 * 
 * Requirements: 3.1, 3.2
 */

import { db } from '@/lib/database/connection';
import { matchAsset as matchAssetViaWebhook } from '@/lib/services/reimbursementService';
import { AssetMatchResponse } from '@/lib/types';

/**
 * Asset interface matching the database schema
 */
export interface Asset {
  id: string;
  assetNumber: string;
  description: string;
  registrationDate: Date;
  createdBy: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

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

/**
 * Asset Service Interface
 * 
 * Defines the contract for asset data operations with n8n webhook integration.
 */
export interface IAssetService {
  // Master data management
  createAsset(assetData: CreateAssetInput): Promise<Asset>;
  updateAsset(assetId: string, assetData: UpdateAssetInput): Promise<Asset>;
  getAssetById(assetId: string): Promise<Asset | null>;
  getAllAssets(filters?: AssetFilters): Promise<Asset[]>;
  getActiveAssets(): Promise<Asset[]>;
  deleteAsset(assetId: string): Promise<void>;
  
  // Validation methods
  validateAssetNumber(assetNumber: string): Promise<boolean>;
  validateAssetRegistrationDate(registrationDate: Date, transactionDate: Date): Promise<boolean>;
  
  // Integration with existing n8n webhook
  matchAssetViaWebhook(description: string): Promise<AssetMatchResponse>;
}

/**
 * DatabaseAssetService implements IAssetService using PostgreSQL database.
 * 
 * This service executes SQL queries against the assets table and integrates
 * with the existing n8n webhook for asset matching functionality.
 * 
 * Requirements:
 * - 3.1: Implement Asset Management with CRUD operations and webhook integration
 * - 3.2: Implement asset number uniqueness validation and date validation
 */
export class DatabaseAssetService implements IAssetService {
  /**
   * Create a new asset in the database
   * 
   * Validates asset number uniqueness before creating.
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param assetData - The asset data to create
   * @returns Promise resolving to the created asset
   * @throws Error if validation fails or asset number already exists
   * 
   * Requirements:
   * - 3.1: Implement asset creation with validation
   * - 3.2: Enforce asset number uniqueness
   */
  async createAsset(assetData: CreateAssetInput): Promise<Asset> {
    // Validate asset number format (basic validation)
    if (!assetData.assetNumber || !assetData.assetNumber.trim()) {
      throw new Error('Asset number is required');
    }
    
    // Validate description
    if (!assetData.description || !assetData.description.trim()) {
      throw new Error('Asset description is required');
    }
    
    // Validate registration date (cannot be in the future)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (assetData.registrationDate > today) {
      throw new Error('Asset registration date cannot be in the future');
    }
    
    // Trim input data
    const trimmedAssetNumber = assetData.assetNumber.trim();
    const trimmedDescription = assetData.description.trim();
    
    // Validate asset number uniqueness
    const isUnique = await this.validateAssetNumber(trimmedAssetNumber);
    if (!isUnique) {
      throw new Error('Asset number already exists');
    }
    
    const query = `
      INSERT INTO assets (asset_number, description, registration_date, created_by, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING 
        id::text, 
        asset_number as "assetNumber", 
        description, 
        registration_date as "registrationDate",
        created_by as "createdBy",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await db.query(query, [
      trimmedAssetNumber,
      trimmedDescription,
      assetData.registrationDate,
      assetData.createdBy
    ]);
    
    return result.rows[0];
  }
  
  /**
   * Update an existing asset in the database
   * 
   * Uses parameterized query to prevent SQL injection.
   * Supports partial updates - only provided fields are updated.
   * 
   * @param assetId - The asset ID to update
   * @param assetData - The fields to update (partial update supported)
   * @returns Promise resolving to the updated asset
   * @throws Error if asset not found or validation fails
   * 
   * Requirements:
   * - 3.1: Implement asset updates with validation
   * - 3.2: Enforce asset number uniqueness if assetNumber is being updated
   */
  async updateAsset(assetId: string, assetData: UpdateAssetInput): Promise<Asset> {
    // Check if asset exists
    const existingAsset = await this.getAssetById(assetId);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }
    
    // Validate asset number uniqueness if being updated
    if (assetData.assetNumber && assetData.assetNumber !== existingAsset.assetNumber) {
      const isUnique = await this.validateAssetNumber(assetData.assetNumber);
      if (!isUnique) {
        throw new Error('Asset number already exists');
      }
    }
    
    // Validate registration date if being updated
    if (assetData.registrationDate) {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      if (assetData.registrationDate > today) {
        throw new Error('Asset registration date cannot be in the future');
      }
    }
    
    // Build the update query with only provided fields
    const updates: string[] = [];
    const params: any[] = [assetId];
    let paramIndex = 2;
    
    if (assetData.assetNumber !== undefined) {
      updates.push(`asset_number = $${paramIndex}`);
      params.push(assetData.assetNumber);
      paramIndex++;
    }
    
    if (assetData.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(assetData.description);
      paramIndex++;
    }
    
    if (assetData.registrationDate !== undefined) {
      updates.push(`registration_date = $${paramIndex}`);
      params.push(assetData.registrationDate);
      paramIndex++;
    }
    
    if (assetData.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(assetData.status);
      paramIndex++;
    }
    
    // Always update the updated_at timestamp
    updates.push('updated_at = NOW()');
    
    if (updates.length === 1) {
      // Only updated_at would be updated, which means no actual data changes
      // Just return the current asset
      return existingAsset;
    }
    
    const query = `
      UPDATE assets
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING 
        id::text, 
        asset_number as "assetNumber", 
        description, 
        registration_date as "registrationDate",
        created_by as "createdBy",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await db.query(query, params);
    return result.rows[0];
  }
  
  /**
   * Retrieve a specific asset by ID
   * 
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param assetId - The asset ID to look up
   * @returns Promise resolving to the asset or null if not found
   * 
   * Requirements:
   * - 3.1: Return asset object with required fields
   */
  async getAssetById(assetId: string): Promise<Asset | null> {
    const query = `
      SELECT 
        id::text, 
        asset_number as "assetNumber", 
        description, 
        registration_date as "registrationDate",
        created_by as "createdBy",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM assets
      WHERE id = $1
    `;
    
    const result = await db.query(query, [assetId]);
    return result.rows[0] || null;
  }
  
  /**
   * Retrieve assets from the database with optional filtering
   * 
   * @param filters - Optional filters to apply to the query
   * @returns Promise resolving to array of assets matching the filters
   * 
   * Requirements:
   * - 3.1: Return asset objects with required fields
   */
  async getAllAssets(filters?: AssetFilters): Promise<Asset[]> {
    let query = `
      SELECT 
        id::text, 
        asset_number as "assetNumber", 
        description, 
        registration_date as "registrationDate",
        created_by as "createdBy",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM assets
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters?.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters?.createdBy) {
      conditions.push(`created_by = $${paramIndex}`);
      params.push(filters.createdBy);
      paramIndex++;
    }
    
    if (filters?.assetNumber) {
      conditions.push(`asset_number ILIKE $${paramIndex}`);
      params.push(`%${filters.assetNumber}%`);
      paramIndex++;
    }
    
    if (filters?.description) {
      conditions.push(`description ILIKE $${paramIndex}`);
      params.push(`%${filters.description}%`);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await db.query(query, params);
    return result.rows;
  }
  
  /**
   * Retrieve active assets only
   * 
   * @returns Promise resolving to array of active assets
   * 
   * Requirements:
   * - 3.1: Only active assets should be available for selection
   */
  async getActiveAssets(): Promise<Asset[]> {
    return this.getAllAssets({ status: 'ACTIVE' });
  }
  
  /**
   * Delete an asset by ID
   * 
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param assetId - The asset ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if asset not found
   * 
   * Requirements:
   * - 3.1: Implement asset deletion
   */
  async deleteAsset(assetId: string): Promise<void> {
    const query = `DELETE FROM assets WHERE id = $1`;
    const result = await db.query(query, [assetId]);
    
    if (result.rowCount === 0) {
      throw new Error('Asset not found');
    }
  }
  
  /**
   * Validate asset number uniqueness
   * 
   * @param assetNumber - The asset number to validate
   * @returns Promise resolving to true if unique, false if already exists
   * 
   * Requirements:
   * - 3.2: Implement asset number uniqueness validation
   */
  async validateAssetNumber(assetNumber: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM assets WHERE asset_number = $1`;
    const result = await db.query(query, [assetNumber]);
    return parseInt(result.rows[0].count) === 0;
  }
  
  /**
   * Validate asset registration date against transaction date
   * 
   * Business rule: Asset registration date must be <= transaction date
   * 
   * @param registrationDate - The asset registration date
   * @param transactionDate - The transaction date to validate against
   * @returns Promise resolving to true if valid, false otherwise
   * 
   * Requirements:
   * - 3.2: Implement date validation logic
   */
  async validateAssetRegistrationDate(registrationDate: Date, transactionDate: Date): Promise<boolean> {
    // Asset registration date must be less than or equal to transaction date
    return registrationDate <= transactionDate;
  }
  
  /**
   * Match a transaction description to an asset using existing n8n webhook
   * 
   * This method integrates with the existing asset matching webhook that's already
   * implemented in the reimbursementService. It provides a consistent interface
   * for asset matching across the application.
   * 
   * @param description - Transaction description to match
   * @returns Asset matching result with matched asset details
   * @throws Error if webhook call fails or returns error
   * 
   * Requirements:
   * - 3.1: Integrate with existing asset matching webhook
   */
  async matchAssetViaWebhook(description: string): Promise<AssetMatchResponse> {
    // Use the existing webhook integration from reimbursementService
    return await matchAssetViaWebhook(description);
  }
  
  /**
   * Helper method to get asset by asset number (not database ID)
   * 
   * @param assetNumber - The asset number to look up
   * @returns Promise resolving to the asset or null if not found
   */
  private async getAssetByAssetNumber(assetNumber: string): Promise<Asset | null> {
    const query = `
      SELECT 
        id::text, 
        asset_number as "assetNumber", 
        description, 
        registration_date as "registrationDate",
        created_by as "createdBy",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM assets
      WHERE asset_number = $1
    `;
    
    const result = await db.query(query, [assetNumber]);
    return result.rows[0] || null;
  }
}

/**
 * Export a singleton instance of the DatabaseAssetService
 * This follows the same pattern as other database services in the application
 */
export const assetService = new DatabaseAssetService();