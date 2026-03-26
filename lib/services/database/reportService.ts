/**
 * Database Report Service Implementation
 * 
 * This service provides report generation operations using PostgreSQL database queries.
 * It implements the IReportService interface with database-backed operations.
 * 
 * Features:
 * - Excel report generation with ExcelJS
 * - Report data aggregation with filtering
 * - Support for project, user, lead, and date range filters
 * - Report summary statistics
 * - Parameterized queries to prevent SQL injection
 * 
 * Requirements: 6.1
 */

import { Reimbursement } from '@/lib/types';
import {
  IReportService,
  ReportFilters,
  ReportSummary,
} from '../types';
import { db } from '@/lib/database/connection';
import { getDatabaseConfig } from '@/lib/config/database';
import * as ExcelJS from 'exceljs';

/**
 * DatabaseReportService implements IReportService using PostgreSQL database.
 * 
 * This service executes SQL queries against the reimbursements table with JOINs
 * to include user, project, and lead information for comprehensive reporting.
 * Generates Excel files using ExcelJS library with proper formatting and styling.
 * 
 * Requirements:
 * - 6.1: Implement reporting with Excel export and filtering capabilities
 */
export class DatabaseReportService implements IReportService {
  /**
   * Generate Excel report with applied filters
   * 
   * Creates a formatted Excel workbook with reimbursement data matching the filters.
   * Includes proper headers, styling, and data formatting.
   * 
   * @param filters - The filters to apply to the report data
   * @returns Promise resolving to Excel file buffer
   * @throws Error if report generation fails
   * 
   * Requirements:
   * - 6.1: Generate Excel reports with filtering (project, user, lead, date range)
   */
  async generateExcelReport(filters: ReportFilters): Promise<Buffer> {
    // Validate filters first
    const isValid = await this.validateReportFilters(filters);
    if (!isValid) {
      throw new Error('Invalid report filters provided');
    }

    // Get the report data
    const reportData = await this.getReportData(filters);
    const reportSummary = await this.getReportSummary(filters);

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reimbursement Report');

    // Set up the header row
    const headers = [
      'No',
      'Employee Name',
      'Employee Email',
      'Lead Name',
      'Date',
      'Amount',
      'Description',
      'Project',
      'Status',
      'Asset',
      'Submission Date',
      'Approval Date'
    ];

    // Add headers with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Add data rows
    reportData.forEach((reimbursement, index) => {
      const row = worksheet.addRow([
        index + 1,
        reimbursement.employeeName,
        reimbursement.employeeEmail,
        reimbursement.leadName || '-',
        reimbursement.date,
        reimbursement.amount,
        reimbursement.description,
        reimbursement.project,
        this.formatStatus(reimbursement.status),
        reimbursement.asset || '-',
        new Date(reimbursement.createdAt).toLocaleDateString('id-ID'),
        reimbursement.approvals?.finance?.date ? 
          new Date(reimbursement.approvals.finance.date).toLocaleDateString('id-ID') : '-'
      ]);

      // Add borders to data cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Format amount column as currency
      const amountCell = row.getCell(6);
      amountCell.numFmt = 'Rp #,##0.00';
      amountCell.alignment = { horizontal: 'right' };

      // Color code status column
      const statusCell = row.getCell(9);
      switch (reimbursement.status) {
        case 'approved_by_finance':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'C6EFCE' }
          };
          break;
        case 'rejected':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC7CE' }
          };
          break;
        case 'pending':
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEB9C' }
          };
          break;
        default:
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'BDD7EE' }
          };
      }
    });

    // Add summary section
    const summaryStartRow = reportData.length + 3;
    
    // Summary title
    const summaryTitleCell = worksheet.getCell(`A${summaryStartRow}`);
    summaryTitleCell.value = 'REPORT SUMMARY';
    summaryTitleCell.font = { bold: true, size: 14 };
    summaryTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };
    summaryTitleCell.font.color = { argb: 'FFFFFF' };
    worksheet.mergeCells(`A${summaryStartRow}:L${summaryStartRow}`);

    // Summary data
    const summaryData = [
      ['Total Reimbursements:', reportSummary.totalReimbursements],
      ['Total Amount:', `Rp ${reportSummary.totalAmount.toLocaleString('id-ID')}`],
      ['Pending:', reportSummary.statusBreakdown.pending],
      ['Approved by Lead:', reportSummary.statusBreakdown.approved_by_lead],
      ['Approved by Head:', reportSummary.statusBreakdown.approved_by_head],
      ['Approved by Finance:', reportSummary.statusBreakdown.approved_by_finance],
      ['Rejected:', reportSummary.statusBreakdown.rejected],
    ];

    summaryData.forEach((data, index) => {
      const row = worksheet.addRow(['', data[0], data[1]]);
      const labelCell = row.getCell(2);
      const valueCell = row.getCell(3);
      
      labelCell.font = { bold: true };
      if (typeof data[0] === 'string' && data[0].includes('Total Amount')) {
        valueCell.numFmt = 'Rp #,##0.00';
      }
    });

    // Auto-fit columns
    for (let i = 1; i <= headers.length; i++) {
      const column = worksheet.getColumn(i);
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    }

    // Generate and return the buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Get report data with applied filters
   * 
   * Executes SQL query with JOINs to get comprehensive reimbursement data
   * including user, project, and lead information.
   * 
   * @param filters - The filters to apply to the data
   * @returns Promise resolving to array of reimbursements matching the filters
   * 
   * Requirements:
    * - 6.1: Support filtering by project, user, lead, and date range
   */
  async getReportData(filters: ReportFilters): Promise<Reimbursement[]> {
    // Ensure database is initialized
    if (!db.isInitialized()) {
      console.log('DEBUG: Database not initialized, initializing now...');
      const config = getDatabaseConfig();
      console.log('DEBUG: Database config - mode:', config.mode, 'connectionString:', config.connectionString);
      db.initialize(config.connectionString!, config.poolConfig!);
    }
    
    // Build the base query with JOINs
    let query = `
      SELECT 
        r.id::text,
        r.user_id::text as "userId",
        COALESCE(r.employee_name, u.name) as "employeeName",
        COALESCE(r.employee_email, u.email) as "employeeEmail",
        r.amount,
        r.description,
        r.status,
        COALESCE(r.date, r.submission_date::text) as date,
        COALESCE(r.project, 'MaxStream') as project,
        r.receipt_image as "receiptImage",
        r.asset,
        r.approvals,
        r.rejection_reason as "rejectionReason",
        r.approval_date as "approvalDate",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        COALESCE(r.lead_id::text, u.lead_id::text) as "leadId",
        COALESCE(r.lead_name, l.name) as "leadName",
        p.name as "projectName",
        p.project_id as "projectCode"
      FROM reimbursements r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN users l ON COALESCE(r.lead_id, u.lead_id) = l.id
      LEFT JOIN projects p ON r.project_id = p.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.projectId) {
      conditions.push(`r.project_id = $${paramIndex}`);
      params.push(parseInt(filters.projectId));
      paramIndex++;
    }

    if (filters.userName) {
      conditions.push(`(COALESCE(r.employee_name, u.name) ILIKE $${paramIndex})`);
      params.push(`%${filters.userName}%`);
      paramIndex++;
    }

    if (filters.leadName) {
      conditions.push(`(COALESCE(r.lead_name, l.name) ILIKE $${paramIndex})`);
      params.push(`%${filters.leadName}%`);
      paramIndex++;
    }

    if (filters.dateFrom) {
      conditions.push(`r.submission_date >= $${paramIndex}`);
      params.push(filters.dateFrom.toISOString().split('T')[0]);
      paramIndex++;
    }

    if (filters.dateTo) {
      conditions.push(`r.submission_date <= $${paramIndex}`);
      params.push(filters.dateTo.toISOString().split('T')[0]);
      paramIndex++;
    }

    if (filters.status && filters.status.length > 0) {
      const statusPlaceholders = filters.status.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`r.status IN (${statusPlaceholders})`);
      params.push(...filters.status);
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Order by submission date (newest first)
    query += ` ORDER BY r.submission_date DESC`;

    const result = await db.query(query, params);

    // Transform database rows to Reimbursement objects
    return result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      employeeName: row.employeeName,
      employeeEmail: row.employeeEmail,
      amount: parseFloat(row.amount),
      description: row.description,
      status: row.status,
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      project: row.project,
      receiptImage: row.receiptImage,
      asset: row.asset,
      approvals: row.approvals || {},
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
    }));
  }

  /**
   * Validate report filters
   * 
   * Checks if the provided filters are valid and within acceptable ranges.
   * 
   * @param filters - The filters to validate
   * @returns Promise resolving to true if filters are valid, false otherwise
   * 
   * Requirements:
   * - 6.1: Validate report filter parameters
   */
  async validateReportFilters(filters: ReportFilters): Promise<boolean> {
    try {
      // Check if database is initialized
      if (!db.isInitialized()) {
        console.log('DEBUG: Database not initialized, initializing now...');
        const config = getDatabaseConfig();
        db.initialize(config.connectionString!, config.poolConfig!);
      }
      
      // Validate date range
      if (filters.dateFrom && filters.dateTo) {
        if (filters.dateFrom > filters.dateTo) {
          return false;
        }
      }

      // Validate project ID format if provided (should be numeric string)
      if (filters.projectId) {
        const projectIdNum = parseInt(filters.projectId);
        if (isNaN(projectIdNum) || projectIdNum <= 0) {
          return false;
        }
      }

      // Validate status values if provided
      if (filters.status && filters.status.length > 0) {
        const validStatuses = ['pending', 'approved_by_lead', 'approved_by_head', 'approved_by_finance', 'rejected'];
        const invalidStatus = filters.status.find(status => !validStatuses.includes(status));
        if (invalidStatus) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating report filters:', error);
      return false;
    }
  }

  /**
   * Get report summary statistics
   * 
   * Calculates summary statistics for the filtered data including totals,
   * status breakdown, and project breakdown.
   * 
   * @param filters - The filters to apply to the summary
   * @returns Promise resolving to report summary data
   * 
   * Requirements:
   * - 6.1: Provide report summary statistics
   */
  async getReportSummary(filters: ReportFilters): Promise<ReportSummary> {
    // Ensure database is initialized
    if (!db.isInitialized()) {
      console.log('DEBUG: Database not initialized in getReportSummary, initializing now...');
      const config = getDatabaseConfig();
      console.log('DEBUG: Database config - mode:', config.mode, 'connectionString:', config.connectionString);
      db.initialize(config.connectionString!, config.poolConfig!);
    }
    
    try {
    // Build the base query for summary statistics
    let baseQuery = `
      FROM reimbursements r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN users l ON COALESCE(r.lead_id, u.lead_id) = l.id
      LEFT JOIN projects p ON r.project_id = p.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Apply the same filters as getReportData
    if (filters.projectId) {
      conditions.push(`r.project_id = $${paramIndex}`);
      params.push(parseInt(filters.projectId));
      paramIndex++;
    }

    if (filters.userName) {
      conditions.push(`(COALESCE(r.employee_name, u.name) ILIKE $${paramIndex})`);
      params.push(`%${filters.userName}%`);
      paramIndex++;
    }

    if (filters.leadName) {
      conditions.push(`(COALESCE(r.lead_name, l.name) ILIKE $${paramIndex})`);
      params.push(`%${filters.leadName}%`);
      paramIndex++;
    }

    if (filters.dateFrom) {
      conditions.push(`r.submission_date >= $${paramIndex}`);
      params.push(filters.dateFrom.toISOString().split('T')[0]);
      paramIndex++;
    }

    if (filters.dateTo) {
      conditions.push(`r.submission_date <= $${paramIndex}`);
      params.push(filters.dateTo.toISOString().split('T')[0]);
      paramIndex++;
    }

    if (filters.status && filters.status.length > 0) {
      const statusPlaceholders = filters.status.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`r.status IN (${statusPlaceholders})`);
      params.push(...filters.status);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // Get total count and amount
    const totalQuery = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(r.amount), 0) as total_amount
      ${baseQuery}
      ${whereClause}
    `;

    console.log('DEBUG: Executing totalQuery:', totalQuery, 'params:', params);
    const totalResult = await db.query(totalQuery, params);
    console.log('DEBUG: Query result:', totalResult.rows);
    const totalData = totalResult.rows[0];

    // Get status breakdown
    const statusQuery = `
      SELECT 
        r.status,
        COUNT(*) as count
      ${baseQuery}
      ${whereClause}
      GROUP BY r.status
    `;

    const statusResult = await db.query(statusQuery, params);
    const statusBreakdown = {
      pending: 0,
      approved_by_lead: 0,
      approved_by_head: 0,
      approved_by_finance: 0,
      rejected: 0,
    };

    statusResult.rows.forEach(row => {
      if (row.status in statusBreakdown) {
        statusBreakdown[row.status as keyof typeof statusBreakdown] = parseInt(row.count);
      }
    });

    // Get project breakdown
    const projectQuery = `
      SELECT 
        COALESCE(p.name, r.project, 'MaxStream') as project_name,
        COUNT(*) as count,
        COALESCE(SUM(r.amount), 0) as amount
      ${baseQuery}
      ${whereClause}
      GROUP BY COALESCE(p.name, r.project, 'MaxStream')
      ORDER BY amount DESC
    `;

    const projectResult = await db.query(projectQuery, params);
    const projectBreakdown: { [projectName: string]: { count: number; amount: number } } = {};

    projectResult.rows.forEach(row => {
      projectBreakdown[row.project_name] = {
        count: parseInt(row.count),
        amount: parseFloat(row.amount),
      };
    });

    return {
      totalReimbursements: parseInt(totalData.total_count),
      totalAmount: parseFloat(totalData.total_amount),
      statusBreakdown,
      projectBreakdown,
    };
    } catch (error) {
      console.error('Error getting report summary:', error);
      throw error;
    }
  }

  /**
   * Format status for display in Excel
   * 
   * @param status - The status to format
   * @returns Formatted status string
   */
  private formatStatus(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved_by_lead':
        return 'Approved by Lead';
      case 'approved_by_head':
        return 'Approved by Head';
      case 'approved_by_finance':
        return 'Approved by Finance';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }
}