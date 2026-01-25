/**
 * Report Summary API Route
 * 
 * Handles HTTP requests for report summary statistics.
 * Provides aggregated data for dashboard and reporting overview.
 * 
 * Requirements: 6.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseReportService } from '@/lib/services/database/reportService';
import { ReportFilters } from '@/lib/services/types';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

const reportService = new DatabaseReportService();

/**
 * GET /api/reports/summary
 * 
 * Retrieve report summary statistics with optional filtering
 * 
 * Protected: Requires valid JWT token
 * 
 * Query parameters:
 * - projectId: Filter by project ID
 * - userName: Filter by user name (partial match)
 * - leadName: Filter by lead name (partial match)
 * - dateFrom: Filter by start date (YYYY-MM-DD)
 * - dateTo: Filter by end date (YYYY-MM-DD)
 * - status: Filter by status (comma-separated list)
 * 
 * Requirements:
 * - 6.1: Provide report summary statistics with filtering
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: ReportFilters = {};
    
    if (searchParams.get('projectId')) {
      filters.projectId = searchParams.get('projectId')!;
    }
    
    if (searchParams.get('userName')) {
      filters.userName = searchParams.get('userName')!;
    }
    
    if (searchParams.get('leadName')) {
      filters.leadName = searchParams.get('leadName')!;
    }
    
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!);
    }
    
    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!);
    }
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',') as any[];
    }
    
    // Validate filters
    const isValid = await reportService.validateReportFilters(filters);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid filter parameters' },
        { status: 400 }
      );
    }
    
    // Get report summary
    const reportSummary = await reportService.getReportSummary(filters);
    
    return NextResponse.json({
      success: true,
      summary: reportSummary,
      filters: filters,
    });
  } catch (error: any) {
    console.error('Error in report summary API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get report summary',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports/summary
 * 
 * Get report summary with filters provided in request body
 * 
 * Protected: Requires valid JWT token
 * 
 * Request body:
 * {
 *   filters: ReportFilters
 * }
 * 
 * Requirements:
 * - 6.1: Support report summary with POST method for complex filters
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  if (error) return error;
  
  try {
    const body = await request.json();
    const { filters = {} } = body;
    
    // Convert date strings to Date objects if provided
    if (filters.dateFrom && typeof filters.dateFrom === 'string') {
      filters.dateFrom = new Date(filters.dateFrom);
    }
    
    if (filters.dateTo && typeof filters.dateTo === 'string') {
      filters.dateTo = new Date(filters.dateTo);
    }
    
    // Validate filters
    const isValid = await reportService.validateReportFilters(filters);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid filter parameters' },
        { status: 400 }
      );
    }
    
    // Get report summary
    const reportSummary = await reportService.getReportSummary(filters);
    
    return NextResponse.json({
      success: true,
      summary: reportSummary,
      filters: filters,
    });
  } catch (error: any) {
    console.error('Error in report summary API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get report summary',
        details: error.message 
      },
      { status: 500 }
    );
  }
}