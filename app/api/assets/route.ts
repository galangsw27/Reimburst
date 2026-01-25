/**
 * Assets API Routes
 * 
 * This file provides REST API endpoints for asset management operations.
 * It integrates with the DatabaseAssetService and includes proper error handling,
 * authentication, and authorization checks.
 * 
 * Endpoints:
 * - GET /api/assets - Retrieve assets with optional filtering
 * - POST /api/assets - Create a new asset
 * 
 * Requirements: 3.1, 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { assetService, CreateAssetInput, AssetFilters } from '@/lib/services/database/assetService';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * GET /api/assets
 * 
 * Retrieve assets with optional filtering.
 * Supports query parameters for filtering by status, createdBy, assetNumber, and description.
 * 
 * Query Parameters:
 * - status: 'ACTIVE' | 'INACTIVE'
 * - createdBy: User ID who created the asset
 * - assetNumber: Asset number (partial match)
 * - description: Asset description (partial match)
 * - activeOnly: 'true' to get only active assets
 * 
 * Requirements:
 * - 3.1: Provide API endpoint for retrieving assets
 * - Authentication required for all users
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: AssetFilters = {};
    
    const status = searchParams.get('status');
    if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
      filters.status = status;
    }
    
    const createdBy = searchParams.get('createdBy');
    if (createdBy) {
      filters.createdBy = createdBy;
    }
    
    const assetNumber = searchParams.get('assetNumber');
    if (assetNumber) {
      filters.assetNumber = assetNumber;
    }
    
    const description = searchParams.get('description');
    if (description) {
      filters.description = description;
    }
    
    const activeOnly = searchParams.get('activeOnly');
    if (activeOnly === 'true') {
      filters.status = 'ACTIVE';
    }

    // Get assets based on filters
    const assets = await assetService.getAllAssets(filters);

    return NextResponse.json({
      success: true,
      data: assets,
      count: assets.length
    });

  } catch (error) {
    console.error('Error retrieving assets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve assets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets
 * 
 * Create a new asset.
 * Requires authentication and appropriate role permissions.
 * 
 * Request Body:
 * - assetNumber: string (required, must be unique)
 * - description: string (required)
 * - registrationDate: string (required, ISO date format)
 * 
 * Requirements:
 * - 3.1: Provide API endpoint for creating assets
 * - 3.2: Enforce asset number uniqueness validation
 * - Role-based access: tester, lead, head can create assets (not finance)
 */
export async function POST(request: NextRequest) {
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

    // Check role permissions - tester, lead, head can create assets (not finance)
    if (!['tester', 'lead', 'head'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create assets' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.assetNumber || !body.description || !body.registrationDate) {
      return NextResponse.json(
        { error: 'Missing required fields: assetNumber, description, registrationDate' },
        { status: 400 }
      );
    }

    // Validate and parse registration date
    const registrationDate = new Date(body.registrationDate);
    if (isNaN(registrationDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid registration date format. Use ISO date format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Prepare asset data
    const assetData: CreateAssetInput = {
      assetNumber: body.assetNumber.trim(),
      description: body.description.trim(),
      registrationDate: registrationDate,
      createdBy: user.userId
    };

    // Create the asset
    const newAsset = await assetService.createAsset(assetData);

    return NextResponse.json({
      success: true,
      data: newAsset,
      message: 'Asset created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating asset:', error);
    
    // Handle specific validation errors
    if (error instanceof Error) {
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
        error: 'Failed to create asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}