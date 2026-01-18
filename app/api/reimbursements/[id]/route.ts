/**
 * Reimbursement by ID API Routes
 * 
 * This file implements the API endpoints for individual reimbursement operations.
 * Routes automatically use the appropriate service (Mock or Database) based on DATABASE_MODE.
 * All routes require JWT authentication.
 * 
 * Requirements: 6.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReimbursementService } from '@/lib/services/factory';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * GET /api/reimbursements/[id]
 * 
 * Retrieves a specific reimbursement by ID.
 * Returns 404 if reimbursement not found.
 * 
 * Protected: Requires valid JWT token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const reimbursementService = getReimbursementService();
    const reimbursement = await reimbursementService.getReimbursementById(id);
    
    if (!reimbursement) {
      return NextResponse.json(
        { error: 'Reimbursement not found' },
        { status: 404 }
      );
    }
    
    // Regular users can only see their own reimbursements
    if (user!.role === 'user' && reimbursement.userId !== user!.userId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only view your own reimbursements' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(reimbursement);
  } catch (error) {
    console.error('Error fetching reimbursement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reimbursement' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reimbursements/[id]
 * 
 * Updates a reimbursement's status or other fields.
 * Returns 404 if reimbursement not found.
 * 
 * Protected: Requires valid JWT token
 * Only head, lead, and finance can update reimbursements
 * 
 * Requirements: 6.7
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and authorize (only head, lead, finance can update)
  const { user, error } = authenticateAndAuthorize(request, ['head', 'lead', 'finance']);
  
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const reimbursementService = getReimbursementService();
    const data = await request.json();
    
    const reimbursement = await reimbursementService.updateReimbursement(id, data);
    return NextResponse.json(reimbursement);
  } catch (error) {
    if (error instanceof Error && error.message === 'Reimbursement not found') {
      return NextResponse.json(
        { error: 'Reimbursement not found' },
        { status: 404 }
      );
    }
    
    console.error('Error updating reimbursement:', error);
    return NextResponse.json(
      { error: 'Failed to update reimbursement' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reimbursements/[id]
 * 
 * Deletes a reimbursement by ID.
 * Returns 404 if reimbursement not found.
 * 
 * Protected: Requires valid JWT token
 * Only head and finance can delete reimbursements
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and authorize (only head and finance can delete)
  const { user, error } = authenticateAndAuthorize(request, ['head', 'finance']);
  
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const reimbursementService = getReimbursementService();
    
    await reimbursementService.deleteReimbursement(id);
    return NextResponse.json({ success: true, message: 'Reimbursement deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Reimbursement not found') {
      return NextResponse.json(
        { error: 'Reimbursement not found' },
        { status: 404 }
      );
    }
    
    console.error('Error deleting reimbursement:', error);
    return NextResponse.json(
      { error: 'Failed to delete reimbursement' },
      { status: 500 }
    );
  }
}
