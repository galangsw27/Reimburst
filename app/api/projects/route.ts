/**
 * Project API Routes
 * 
 * This module provides HTTP endpoints for project operations.
 * GET /api/projects - Retrieve all projects with optional filtering (Protected - requires authentication)
 * POST /api/projects - Create a new project (Protected - lead/head/finance only)
 * 
 * All routes require JWT authentication.
 * 
 * Requirements: 2.1, 2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProjectService } from '@/lib/services/factory';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * GET /api/projects
 * 
 * Retrieves projects from the system with optional filtering.
 * Supports query parameters:
 * - status: Filter by ACTIVE or INACTIVE
 * - name: Filter by project name (partial match)
 * - active_only: If true, returns only active projects
 * 
 * Protected: Requires valid JWT token
 * 
 * @returns JSON array of projects with 200 status
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 2.1: Create GET /api/projects endpoint to retrieve projects
 * - 2.2: Support filtering by status and name
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const projectService = getProjectService();
    const { searchParams } = new URL(request.url);
    
    // Check if only active projects are requested
    const activeOnly = searchParams.get('active_only') === 'true';
    if (activeOnly) {
      const projects = await projectService.getActiveProjects();
      return NextResponse.json(projects);
    }
    
    // Build filters from query parameters
    const filters: any = {};
    
    const status = searchParams.get('status');
    if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
      filters.status = status;
    }
    
    const name = searchParams.get('name');
    if (name) {
      filters.name = name;
    }
    
    const projects = await projectService.getProjects(filters);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * 
 * Creates a new project in the system with validation.
 * Validates project ID format (5-002-079) and uniqueness before creating.
 * 
 * Protected: Requires valid JWT token and appropriate role (lead, head, or finance)
 * 
 * @param request - The Next.js request object containing project data in JSON body
 * @returns JSON of created project with 201 status on success
 * @returns Error message with 400 status if validation fails
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 403 status if not authorized
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 2.1: Create POST /api/projects endpoint to create new projects
 * - 2.2: Validate project ID format and uniqueness
 */
export async function POST(request: NextRequest) {
  // Authenticate and authorize request (lead, head, finance can create projects)
  const { user, error } = authenticateAndAuthorize(request, ['lead', 'head', 'finance']);
  if (error) return error;
  
  try {
    const projectService = getProjectService();
    const data = await request.json();
    
    // Validate required fields
    if (!data.projectId || !data.name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      );
    }
    
    // Validate project ID format
    const isValidFormat = await projectService.validateProjectId(data.projectId);
    if (!isValidFormat) {
      return NextResponse.json(
        { error: 'Invalid project ID format. Expected format: X-XXX-XXX (e.g., 5-002-079)' },
        { status: 400 }
      );
    }
    
    // Create the project
    const newProject = await projectService.createProject({
      projectId: data.projectId,
      name: data.name
    });
    
    // Return 201 Created status with the new project
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      // Handle duplicate project ID or other validation errors
      if (error.message.includes('already exists') || error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'Project ID already exists' },
          { status: 400 }
        );
      }
      
      // Handle validation errors (invalid format, validation, etc.)
      if (error.message.toLowerCase().includes('validation') || 
          error.message.toLowerCase().includes('invalid') ||
          error.message.toLowerCase().includes('format')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    // Generic server error
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}