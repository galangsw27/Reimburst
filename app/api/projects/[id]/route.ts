/**
 * Individual Project API Routes
 * 
 * This module provides HTTP endpoints for individual project operations.
 * GET /api/projects/[id] - Retrieve a specific project (Protected - requires authentication)
 * PUT /api/projects/[id] - Update a specific project (Protected - lead/head/finance only)
 * DELETE /api/projects/[id] - Delete a specific project (Protected - lead/head/finance only)
 * 
 * All routes require JWT authentication.
 * 
 * Requirements: 2.1, 2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProjectService } from '@/lib/services/factory';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * GET /api/projects/[id]
 * 
 * Retrieves a specific project by ID.
 * 
 * Protected: Requires valid JWT token
 * 
 * @param request - The Next.js request object
 * @param params - Route parameters containing the project ID
 * @returns JSON of the project with 200 status on success
 * @returns Error message with 404 status if project not found
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 2.1: Create GET /api/projects/[id] endpoint to retrieve specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const { id } = await params;
    const projectService = getProjectService();
    const project = await projectService.getProjectById(id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * 
 * Updates a specific project with validation.
 * Supports partial updates - only provided fields are updated.
 * Validates project ID format if being updated.
 * 
 * Protected: Requires valid JWT token and appropriate role (lead, head, or finance)
 * 
 * @param request - The Next.js request object containing update data in JSON body
 * @param params - Route parameters containing the project ID
 * @returns JSON of updated project with 200 status on success
 * @returns Error message with 400 status if validation fails
 * @returns Error message with 404 status if project not found
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 403 status if not authorized
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 2.1: Create PUT /api/projects/[id] endpoint to update projects
 * - 2.2: Validate project ID format and uniqueness if being updated
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and authorize (only lead, head, and finance can update projects)
  const { user, error } = authenticateAndAuthorize(request, ['lead', 'head', 'finance']);
  
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const projectService = getProjectService();
    const data = await request.json();
    
    // Validate project ID format if being updated
    if (data.projectId) {
      const isValidFormat = await projectService.validateProjectId(data.projectId);
      if (!isValidFormat) {
        return NextResponse.json(
          { error: 'Invalid project ID format. Expected format: X-XXX-XXX (e.g., 5-002-079)' },
          { status: 400 }
        );
      }
    }
    
    // Validate status if being updated
    if (data.status && data.status !== 'ACTIVE' && data.status !== 'INACTIVE') {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE or INACTIVE' },
        { status: 400 }
      );
    }
    
    // Update the project
    const updatedProject = await projectService.updateProject(id, data);
    
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      // Handle project not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
      
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
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * 
 * Deletes a specific project by ID.
 * 
 * Protected: Requires valid JWT token and appropriate role (lead, head, or finance)
 * 
 * @param request - The Next.js request object
 * @param params - Route parameters containing the project ID
 * @returns Success message with 200 status on success
 * @returns Error message with 404 status if project not found
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 403 status if not authorized
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 2.1: Create DELETE /api/projects/[id] endpoint to delete projects
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and authorize (only lead, head, and finance can delete projects)
  const { user, error } = authenticateAndAuthorize(request, ['lead', 'head', 'finance']);
  
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const projectService = getProjectService();
    await projectService.deleteProject(id);
    
    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      // Handle project not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }
    
    // Generic server error
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}