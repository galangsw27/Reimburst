/**
 * Individual File API Routes
 * 
 * This module provides REST API endpoints for individual file operations.
 * It handles file retrieval, updates, and deletion by file ID.
 * 
 * Endpoints:
 * - GET /api/files/[id] - Get file by ID
 * - DELETE /api/files/[id] - Delete file by ID
 * - PATCH /api/files/[id] - Update file usage status
 * 
 * Features:
 * - Individual file metadata retrieval
 * - File deletion with metadata cleanup
 * - File usage status management
 * - Comprehensive error handling
 * 
 * Requirements: 4.1, 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFileService } from '@/lib/services/factory';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/files/[id]
 * 
 * Retrieve a specific file document by ID.
 * 
 * Protected: Requires valid JWT token
 * 
 * Path Parameters:
 * - id: File document ID
 * 
 * Response:
 * - 200: File document data
 * - 401: Unauthorized - No token provided or invalid token
 * - 404: File not found
 * - 500: Internal server error
 * 
 * Requirements:
 * - 4.1: Individual file metadata retrieval
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const fileService = getFileService();
    const { id } = await params;
    
    // Get file by ID
    const file = await fileService.getFileById(id);
    
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(file);
    
  } catch (error) {
    console.error('Get file by ID error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[id]
 * 
 * Delete a file document and its metadata.
 * 
 * Protected: Requires valid JWT token
 * 
 * Path Parameters:
 * - id: File document ID
 * 
 * Response:
 * - 204: File deleted successfully
 * - 401: Unauthorized - No token provided or invalid token
 * - 404: File not found
 * - 500: Internal server error
 * 
 * Requirements:
 * - 4.1: File metadata cleanup
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const fileService = getFileService();
    const { id } = await params;
    
    // Delete file
    await fileService.deleteFile(id);
    
    return new NextResponse(null, { status: 204 });
    
  } catch (error) {
    console.error('Delete file error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files/[id]
 * 
 * Update file usage status or other metadata.
 * 
 * Protected: Requires valid JWT token
 * 
 * Path Parameters:
 * - id: File document ID
 * 
 * Request Body:
 * - markAsUsed: Boolean to mark file as used (anti-duplication)
 * 
 * Response:
 * - 200: File updated successfully
 * - 400: Invalid request data
 * - 401: Unauthorized - No token provided or invalid token
 * - 404: File not found
 * - 500: Internal server error
 * 
 * Requirements:
 * - 3.3: File usage status management for anti-duplication
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const fileService = getFileService();
    const { id } = await params;
    
    // Parse request body
    const body = await request.json();
    const { markAsUsed } = body;
    
    // Validate request
    if (typeof markAsUsed !== 'boolean') {
      return NextResponse.json(
        { error: 'markAsUsed must be a boolean value' },
        { status: 400 }
      );
    }
    
    // Update file usage status
    if (markAsUsed) {
      await fileService.markFileAsUsed(id);
    }
    
    // Get updated file
    const updatedFile = await fileService.getFileById(id);
    
    if (!updatedFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedFile);
    
  } catch (error) {
    console.error('Update file error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}