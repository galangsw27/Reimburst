/**
 * Reimbursements API Routes
 * 
 * This file implements the API endpoints for reimbursement operations.
 * Routes automatically use the appropriate service (Mock or Database) based on DATABASE_MODE.
 * All routes require JWT authentication.
 * 
 * Requirements: 6.5, 6.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReimbursementService } from '@/lib/services/factory';
import { ReimbursementFilters } from '@/lib/services/types';
import { ReimbursementStatus } from '@/lib/types';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * GET /api/reimbursements
 * 
 * Retrieves reimbursements with optional filtering by status or userId.
 * 
 * Protected: Requires valid JWT token
 * Users can only see their own reimbursements unless they are head, lead, or finance
 * 
 * Query Parameters:
 * - status: Filter by reimbursement status (pending, approved, rejected)
 * - userId: Filter by user ID
 * 
 * Requirements: 6.5
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    const reimbursementService = getReimbursementService();
    const { searchParams } = new URL(request.url);
    
    // Build filters from query parameters
    const filters: ReimbursementFilters = {};
    
    const status = searchParams.get('status');
    if (status) {
      filters.status = status as ReimbursementStatus;
    }
    
    let userId = searchParams.get('userId');
    
    // Regular users can only see their own reimbursements
    if (user!.role === 'user') {
      userId = user!.userId;
    }
    
    if (userId) {
      filters.userId = userId;
    }
    
    const reimbursements = await reimbursementService.getReimbursements(filters);
    
    return NextResponse.json(reimbursements);
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reimbursements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reimbursements
 * 
 * Creates a new reimbursement.
 * Validates that amount is positive.
 * 
 * Protected: Requires valid JWT token
 * Users can only create reimbursements for themselves
 * 
 * Requirements: 6.6
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    const reimbursementService = getReimbursementService();
    const data = await request.json();
    
    // Validate amount is positive
    if (!data.amount || data.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!data.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // Regular users can only create reimbursements for themselves
    if (user!.role === 'user' && data.userId !== user!.userId) {
      return NextResponse.json(
        { error: 'You can only create reimbursements for yourself' },
        { status: 403 }
      );
    }
    
    if (!data.description) {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      );
    }
    
    const reimbursement = await reimbursementService.createReimbursement(data);
    return NextResponse.json(reimbursement, { status: 201 });
  } catch (error) {
    console.error('Error creating reimbursement:', error);
    
    // Return more detailed error message
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create reimbursement' },
      { status: 500 }
    );
  }
}
