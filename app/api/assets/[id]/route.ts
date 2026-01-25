/**
 * Individual Asset API Routes
 * 
 * This file provides REST API endpoints for individual asset operations.
 * It handles GET, PUT, and DELETE operations for specific assets by ID.
 * 
 * Endpoints:
 * - GET /api/assets/[id] - Retrieve a specific asset
 * - PUT /api/assets/[id] - Update a specific asset
 * - DELETE /api/assets/[id] - Delete a specific asset
 * 
 * Requirements: 3.1, 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { assetService, UpdateAssetInput } from '@/lib/services/database/assetService';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * GET /api/assets/[id]
 * 
 * Retrieve a specific asset by ID.
 * 
 * Requirements:
 * - 3.1: Provide API endpoint for retrieving individual assets
 * - Authentication required for all users
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const asset = await assetService.getAssetById(id);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: asset
    });

  } catch (error) {
    console.error('Error retrieving asset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/assets/[id]
 * 
 * Update a specific asset by ID.
 * Supports partial updates - only provided fields are updated.
 * 
 * Request Body (all fields optional):
 * - assetNumber: string (must be unique if provided)
 * - description: string
 * - registrationDate: string (ISO date format)
 * - status: 'ACTIVE' | 'INACTIVE'
 * 
 * Requirements:
 * - 3.1: Provide API endpoint for updating assets
 * - 3.2: Enforce asset number uniqueness validation
 * - Role-based access: tester, lead, head can update assets (not finance)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check role permissions - tester, lead, head can update assets (not finance)
    if (!['tester', 'lead', 'head'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update assets' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Prepare update data
    const updateData: UpdateAssetInput = {};

    if (body.assetNumber !== undefined) {
      updateData.assetNumber = body.assetNumber.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description.trim();
    }

    if (body.registrationDate !== undefined) {
      const registrationDate = new Date(body.registrationDate);
      if (isNaN(registrationDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid registration date format. Use ISO date format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
      updateData.registrationDate = registrationDate;
    }

    if (body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be ACTIVE or INACTIVE' },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    // Update the asset
    const updatedAsset = await assetService.updateAsset(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedAsset,
      message: 'Asset updated successfully'
    });

  } catch (error) {
    console.error('Error updating asset:', error);
    
    // Handle specific validation errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        );
      }
      
      if (error.message.includes('required') || error.message.includes('cannot be')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 } // Bad Request
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to update asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assets/[id]
 * 
 * Delete a specific asset by ID.
 * 
 * Requirements:
 * - 3.1: Provide API endpoint for deleting assets
 * - Role-based access: tester, lead, head can delete assets (not finance)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check role permissions - tester, lead, head can delete assets (not finance)
    if (!['tester', 'lead', 'head'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete assets' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await assetService.deleteAsset(id);

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting asset:', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}