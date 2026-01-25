/**
 * Files API Routes
 * 
 * This module provides REST API endpoints for file management operations.
 * It handles file upload with metadata tracking, auto-rename functionality,
 * and anti-duplication checking.
 * 
 * Endpoints:
 * - POST /api/files - Upload file with metadata creation
 * - GET /api/files - Get all files with optional filtering
 * 
 * Features:
 * - File upload with auto-rename ([sequence]_transaction_id.ext)
 * - Anti-duplication checking
 * - File metadata tracking in database
 * - Integration with existing storage system
 * - Comprehensive error handling
 * 
 * Requirements: 4.1, 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFileService } from '@/lib/services/factory';
import { FileDocumentFilters } from '@/lib/services/types';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * POST /api/files
 * 
 * Upload a file with metadata creation and auto-rename functionality.
 * 
 * Protected: Requires valid JWT token
 * 
 * Request Body: FormData with:
 * - file: File object to upload
 * - requestId: Request ID (transaction ID) for the file
 * 
 * Response:
 * - 201: File uploaded successfully with metadata
 * - 400: Invalid request data or validation failed
 * - 401: Unauthorized - No token provided or invalid token
 * - 409: File already exists (anti-duplication)
 * - 500: Internal server error
 * 
 * Requirements:
 * - 4.1: Auto-rename files with [sequence]_transaction_id.ext format
 * - 3.3: Anti-duplication checking before upload
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const fileService = getFileService();
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const requestId = formData.get('requestId') as string;
    
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }
    
    // Validate file size (example: 10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }
    
    // Upload file with metadata creation
    const fileDocument = await fileService.uploadFile({
      requestId,
      file
    });
    
    return NextResponse.json(fileDocument, { status: 201 });
    
  } catch (error) {
    console.error('File upload error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('already used')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      
      if (error.message.includes('validation')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files
 * 
 * Retrieve files with optional filtering.
 * 
 * Protected: Requires valid JWT token
 * 
 * Query Parameters:
 * - requestId: Filter by request ID
 * - isUsed: Filter by usage status (true/false)
 * - mimeType: Filter by MIME type
 * 
 * Response:
 * - 200: Array of file documents
 * - 400: Invalid query parameters
 * - 401: Unauthorized - No token provided or invalid token
 * - 500: Internal server error
 * 
 * Requirements:
 * - 4.1: File metadata retrieval with filtering
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const fileService = getFileService();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters: FileDocumentFilters = {};
    
    const requestId = searchParams.get('requestId');
    if (requestId) {
      filters.requestId = requestId;
    }
    
    const isUsed = searchParams.get('isUsed');
    if (isUsed !== null) {
      if (isUsed === 'true') {
        filters.isUsed = true;
      } else if (isUsed === 'false') {
        filters.isUsed = false;
      } else {
        return NextResponse.json(
          { error: 'isUsed parameter must be "true" or "false"' },
          { status: 400 }
        );
      }
    }
    
    const mimeType = searchParams.get('mimeType');
    if (mimeType) {
      filters.mimeType = mimeType;
    }
    
    // Get files with filters
    const files = await fileService.getAllFiles(filters);
    
    return NextResponse.json(files);
    
  } catch (error) {
    console.error('Get files error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}