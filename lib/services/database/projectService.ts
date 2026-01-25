/**
 * Database Project Service Implementation
 * 
 * This service provides project data operations using PostgreSQL database queries.
 * It implements the IProjectService interface with database-backed operations.
 * 
 * Features:
 * - Project ID format validation (5-002-079)
 * - Uniqueness constraints for project IDs
 * - Status-based filtering for active/inactive projects
 * - Parameterized queries to prevent SQL injection
 * 
 * Requirements: 2.1, 2.2
 */

import { Project } from '@/lib/types';
import { IProjectService, CreateProjectInput, UpdateProjectInput, ProjectFilters } from '../types';
import { db } from '@/lib/database/connection';

/**
 * Validate project ID format (5-002-079)
 * 
 * @param projectId - The project ID to validate
 * @returns true if format is valid, false otherwise
 */
function validateProjectIdFormat(projectId: string): boolean {
  // Format: X-XXX-XXX where X is a digit
  const projectIdRegex = /^\d-\d{3}-\d{3}$/;
  return projectIdRegex.test(projectId);
}

/**
 * DatabaseProjectService implements IProjectService using PostgreSQL database.
 * 
 * This service executes SQL queries against the projects table and handles
 * data transformation to match the Project interface format.
 * 
 * Requirements:
 * - 2.1: Implement Project Management with CRUD operations
 * - 2.2: Implement project ID validation and uniqueness constraints
 */
export class DatabaseProjectService implements IProjectService {
  /**
   * Retrieve projects from the database with optional filtering
   * 
   * @param filters - Optional filters to apply to the query
   * @returns Promise resolving to array of projects matching the filters
   * 
   * Requirements:
   * - 2.1: Return project objects with required fields
   */
  async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    let query = `
      SELECT 
        id::text, 
        project_id as "projectId", 
        name, 
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM projects
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters?.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters?.name) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${filters.name}%`);
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
   * Retrieve active projects only (for dropdown selections)
   * 
   * @returns Promise resolving to array of active projects
   * 
   * Requirements:
   * - 2.1: Only active projects should appear in dropdown selections
   */
  async getActiveProjects(): Promise<Project[]> {
    return this.getProjects({ status: 'ACTIVE' });
  }
  
  /**
   * Retrieve a specific project by ID
   * 
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param id - The project ID to look up
   * @returns Promise resolving to the project or null if not found
   * 
   * Requirements:
   * - 2.1: Return project object with required fields
   */
  async getProjectById(id: string): Promise<Project | null> {
    const query = `
      SELECT 
        id::text, 
        project_id as "projectId", 
        name, 
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM projects
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
  
  /**
   * Create a new project in the database
   * 
   * Validates project ID format and uniqueness before creating.
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param data - The project data to create
   * @returns Promise resolving to the created project
   * @throws Error if validation fails or project ID already exists
   * 
   * Requirements:
   * - 2.1: Implement project creation with validation
   * - 2.2: Enforce project ID uniqueness and format validation
   */
  async createProject(data: CreateProjectInput): Promise<Project> {
    // Validate project ID format
    if (!validateProjectIdFormat(data.projectId)) {
      throw new Error('Invalid project ID format. Expected format: X-XXX-XXX (e.g., 5-002-079)');
    }
    
    // Check if project ID already exists
    const existingProject = await this.getProjectByProjectId(data.projectId);
    if (existingProject) {
      throw new Error('Project ID already exists');
    }
    
    const query = `
      INSERT INTO projects (project_id, name, status)
      VALUES ($1, $2, 'ACTIVE')
      RETURNING 
        id::text, 
        project_id as "projectId", 
        name, 
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await db.query(query, [data.projectId, data.name]);
    return result.rows[0];
  }
  
  /**
   * Update an existing project in the database
   * 
   * Uses parameterized query to prevent SQL injection.
   * Supports partial updates - only provided fields are updated.
   * 
   * @param id - The project ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated project
   * @throws Error if project not found or validation fails
   * 
   * Requirements:
   * - 2.1: Implement project updates with validation
   * - 2.2: Enforce project ID uniqueness if projectId is being updated
   */
  async updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
    // Validate project ID format if being updated
    if (data.projectId && !validateProjectIdFormat(data.projectId)) {
      throw new Error('Invalid project ID format. Expected format: X-XXX-XXX (e.g., 5-002-079)');
    }
    
    // Check if new project ID already exists (if being updated)
    if (data.projectId) {
      const existingProject = await this.getProjectByProjectId(data.projectId);
      if (existingProject && existingProject.id !== id) {
        throw new Error('Project ID already exists');
      }
    }
    
    // Build the update query with only provided fields
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;
    
    if (data.projectId !== undefined) {
      updates.push(`project_id = $${paramIndex}`);
      params.push(data.projectId);
      paramIndex++;
    }
    
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(data.name);
      paramIndex++;
    }
    
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(data.status);
      paramIndex++;
    }
    
    // Always update the updated_at timestamp
    updates.push('updated_at = NOW()');
    
    if (updates.length === 1) {
      // Only updated_at would be updated, which means no actual data changes
      // Just return the current project
      const project = await this.getProjectById(id);
      if (!project) {
        throw new Error('Project not found');
      }
      return project;
    }
    
    const query = `
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING 
        id::text, 
        project_id as "projectId", 
        name, 
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }
    
    return result.rows[0];
  }
  
  /**
   * Delete a project by ID
   * 
   * Uses parameterized query to prevent SQL injection.
   * 
   * @param id - The project ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if project not found
   * 
   * Requirements:
   * - 2.1: Implement project deletion
   */
  async deleteProject(id: string): Promise<void> {
    const query = `DELETE FROM projects WHERE id = $1`;
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Project not found');
    }
  }
  
  /**
   * Validate project ID format (5-002-079)
   * 
   * @param projectId - The project ID to validate
   * @returns Promise resolving to true if valid, false otherwise
   * 
   * Requirements:
   * - 2.2: Implement project ID format validation
   */
  async validateProjectId(projectId: string): Promise<boolean> {
    return validateProjectIdFormat(projectId);
  }
  
  /**
   * Helper method to get project by project ID (not database ID)
   * 
   * @param projectId - The project ID to look up
   * @returns Promise resolving to the project or null if not found
   */
  private async getProjectByProjectId(projectId: string): Promise<Project | null> {
    const query = `
      SELECT 
        id::text, 
        project_id as "projectId", 
        name, 
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM projects
      WHERE project_id = $1
    `;
    
    const result = await db.query(query, [projectId]);
    return result.rows[0] || null;
  }
}