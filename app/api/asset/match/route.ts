/**
 * Asset Matching API Route
 * 
 * Server-side endpoint for matching transactions to assets via AI webhook.
 * This keeps webhook URLs server-side to prevent URL leakage.
 * 
 * Endpoint: POST /api/asset/match
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';
import axios from 'axios';

/**
 * POST /api/asset/match
 * 
 * Match a transaction description to an asset using AI webhook (server-side).
 * Webhook URL is kept server-side for security.
 * 
 * Request Body:
 * - description: Transaction description to match
 * 
 * Response:
 * - Asset matching result with matched asset details
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    // Get webhook URL from server-side environment (not exposed to client)
    const webhookUrl = process.env.ASSET_MATCH_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL is not configured.');
      return NextResponse.json(
        { error: 'Asset matching service is not configured. Contact administrator.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const response = await axios.post(webhookUrl, {
      description,
    }, {
      timeout: 30000, // 30 second timeout
    });

    const output = response.data.output || response.data.data || response.data;
    const asset = output.asset || output;
    
    const matchResult = {
      matched: output.matched || false,
      assetId: asset.asset_id || output.assetId || undefined,
      assetName: asset.asset_name || output.assetName || undefined,
      assetDetail: asset.asset_detail || output.assetDetail || undefined,
      employeeName: asset.employee_name || output.employeeName || undefined,
      department: asset.department || output.department || undefined,
      matchedBy: output.matchedField || output.matchedBy || 'email',
      matchedValue: output.searchedFor || output.matchedValue || description,
      confidence: output.confidence || 0,
      verifiedDate: output.verifiedDate || new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: matchResult,
    });
  } catch (error) {
    console.error('Asset matching failed:', error);
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message || 'Asset matching failed' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to match asset' },
      { status: 500 }
    );
  }
}