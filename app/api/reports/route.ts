/**
 * Reports API Routes
 * 
 * Handles HTTP requests for report generation and data retrieval.
 * Supports Excel export with filtering capabilities.
 * 
 * Requirements: 6.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseReportService } from '@/lib/services/database/reportService';
import { ReportFilters } from '@/lib/services/types';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

const reportService = new DatabaseReportService();

/**
 * GET /api/reports
 * 
 * Retrieve report data with optional filtering
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
 * - format: Response format ('json' or 'excel')
 * 
 * Requirements:
 * - 6.1: Support report data retrieval with filtering
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
    
    const format = searchParams.get('format') || 'json';
    
    // Validate filters
    const isValid = await reportService.validateReportFilters(filters);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid filter parameters' },
        { status: 400 }
      );
    }
    
    if (format === 'excel') {
      // Generate Excel report
      const excelBuffer = await reportService.generateExcelReport(filters);
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `reimbursement_report_${timestamp}.xlsx`;
      
      return new NextResponse(excelBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': excelBuffer.length.toString(),
        },
      });
    } else {
      // Return JSON data
      const reportData = await reportService.getReportData(filters);
      const reportSummary = await reportService.getReportSummary(filters);
      
      return NextResponse.json({
        success: true,
        data: reportData,
        summary: reportSummary,
        filters: filters,
      });
    }
  } catch (error: any) {
    console.error('Error in reports API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports
 * 
 * Generate report with filters provided in request body
 * Supports both JSON and Excel format responses
 * 
 * Request body:
 * {
 *   filters: ReportFilters,
 *   format: 'json' | 'excel'
 * }
 * 
 * Requirements:
 * - 6.1: Support report generation with POST method for complex filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters = {}, format = 'json' } = body;
    
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
    
    if (format === 'excel') {
      // Generate Excel report
      const excelBuffer = await reportService.generateExcelReport(filters);
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `reimbursement_report_${timestamp}.xlsx`;
      
      return new NextResponse(excelBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': excelBuffer.length.toString(),
        },
      });
    } else {
      // Return JSON data
      const reportData = await reportService.getReportData(filters);
      const reportSummary = await reportService.getReportSummary(filters);
      
      return NextResponse.json({
        success: true,
        data: reportData,
        summary: reportSummary,
        filters: filters,
      });
    }
  } catch (error: any) {
    console.error('Error in reports API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report',
        details: error.message 
      },
      { status: 500 }
    );
  }
}