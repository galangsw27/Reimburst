/**
 * File Validation API Route
 * 
 * This module provides REST API endpoint for file upload validation.
 * It validates file constraints and checks anti-duplication rules
 * before allowing file upload.
 * 
 * Endpoints:
 * - POST /api/files/validate - Validate file upload constraints
 * 
 * Features:
 * - File upload validation with anti-duplication checking
 * - Integration with FileService for validation logic
 * - Comprehensive error handling
 * 
 * Requirements: 4.1, 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFileService } from '@/lib/services/factory';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * POST /api/files/validate
 * 
 * Validate file upload constraints and anti-duplication rules.
 * 
 * Protected: Requires valid JWT token
 * 
 * Request Body:
 * - requestId: Request ID (transaction ID) for the file
 * - fileName: Original filename to validate
 * 
 * Response:
 * - 200: Validation result with valid flag and optional error message
 * - 400: Invalid request data
 * - 401: Unauthorized - No token provided or invalid token
 * - 500: Internal server error
 * 
 * Requirements:
 * - 4.1: File upload validation
 * - 3.3: Anti-duplication checking
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const fileService = getFileService();
    
    // Parse request body
    const body = await request.json();
    const { requestId, fileName } = body;
    
    // Validate required fields
    if (!requestId) {
      return NextResponse.json({
        valid: false,
        error: 'Request ID is required'
      });
    }
    
    if (!fileName) {
      return NextResponse.json({
        valid: false,
        error: 'File name is required'
      });
    }
    
    // Validate file upload with FileService
    const isValid = await fileService.validateFileUpload(requestId, fileName);
    
    if (!isValid) {
      return NextResponse.json({
        valid: false,
        error: 'File dengan nama yang sama sudah digunakan dalam request lain atau tidak valid untuk diupload.'
      });
    }
    
    return NextResponse.json({
      valid: true
    });
    
  } catch (error) {
    console.error('File validation error:', error);
    
    return NextResponse.json({
      valid: false,
      error: 'Gagal memvalidasi file. Silakan coba lagi.'
    });
  }
}