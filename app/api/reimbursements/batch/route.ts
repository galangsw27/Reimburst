/**
 * Batch Reimbursements API Route
 * 
 * This file implements the API endpoint for batch operations on reimbursements.
 * Currently supports batch approval.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReimbursementService } from '@/lib/services/factory';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * POST /api/reimbursements/batch
 * 
 * Performs batch operations on reimbursements.
 * 
 * Body:
 * - action: 'approve'
 * - ids: string[] - Array of reimbursement IDs
 * - data: UpdateReimbursementInput - Approval data
 * 
 * Protected: Requires valid JWT token (Lead, Head, or Finance)
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  // Only allow lead, head, or finance to perform batch operations
  if (!['lead', 'head', 'finance'].includes(user!.role)) {
    return NextResponse.json(
      { error: 'Unauthorized: Insufficient permissions for batch operations' },
      { status: 403 }
    );
  }

  try {
    const reimbursementService = getReimbursementService();
    const { action, ids, data } = await request.json();
    
    if (action !== 'approve') {
      return NextResponse.json(
        { error: `Unsupported action: ${action}` },
        { status: 400 }
      );
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty ids array' },
        { status: 400 }
      );
    }

    const updated = await reimbursementService.batchApprove(ids, data);
    
    return NextResponse.json({
      message: `Successfully processed batch ${action} for ${updated.length} items`,
      count: updated.length,
      items: updated
    });
  } catch (error) {
    console.error('Batch operation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch operation failed' },
      { status: 500 }
    );
  }
}
