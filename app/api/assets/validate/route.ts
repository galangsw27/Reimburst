/**
 * Asset Validation API Routes
 * 
 * This file provides API endpoints for asset validation operations.
 * It includes asset number uniqueness validation and integration with
 * the existing n8n webhook for asset matching.
 * 
 * Endpoints:
 * - POST /api/assets/validate - Validate asset number uniqueness
 * - POST /api/assets/validate/match - Match asset via n8n webhook
 * - POST /api/assets/validate/date - Validate asset registration date
 * 
 * Requirements: 3.1, 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { assetService } from '@/lib/services/database/assetService';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * POST /api/assets/validate
 * 
 * Validate asset number uniqueness.
 * 
 * Request Body:
 * - assetNumber: string (required)
 * 
 * Requirements:
 * - 3.2: Provide API endpoint for asset number uniqueness validation
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

    const body = await request.json();
    const { assetNumber, registrationDate, transactionDate, description } = body;

    // Handle different validation types based on request body
    if (assetNumber && !registrationDate && !transactionDate && !description) {
      // Asset number uniqueness validation
      if (!assetNumber.trim()) {
        return NextResponse.json(
          { error: 'Asset number is required' },
          { status: 400 }
        );
      }

      const isUnique = await assetService.validateAssetNumber(assetNumber.trim());

      return NextResponse.json({
        success: true,
        data: {
          assetNumber: assetNumber.trim(),
          isUnique: isUnique,
          message: isUnique ? 'Asset number is available' : 'Asset number already exists'
        }
      });
    }

    if (registrationDate && transactionDate) {
      // Date validation
      const regDate = new Date(registrationDate);
      const txnDate = new Date(transactionDate);

      if (isNaN(regDate.getTime()) || isNaN(txnDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO date format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }

      const isValid = await assetService.validateAssetRegistrationDate(regDate, txnDate);

      return NextResponse.json({
        success: true,
        data: {
          registrationDate: registrationDate,
          transactionDate: transactionDate,
          isValid: isValid,
          message: isValid 
            ? 'Asset registration date is valid' 
            : 'Asset registration date cannot be greater than transaction date'
        }
      });
    }

    if (description) {
      // Asset matching via webhook
      if (!description.trim()) {
        return NextResponse.json(
          { error: 'Description is required for asset matching' },
          { status: 400 }
        );
      }

      const matchResult = await assetService.matchAssetViaWebhook(description.trim());

      return NextResponse.json({
        success: true,
        data: matchResult,
        message: 'Asset matching completed'
      });
    }

    // If none of the validation types match
    return NextResponse.json(
      { 
        error: 'Invalid validation request. Provide assetNumber for uniqueness check, registrationDate+transactionDate for date validation, or description for asset matching' 
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error validating asset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}