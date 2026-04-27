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
import { existsSync } from 'fs';
import path from 'path';

const TEMPLATE_FILENAME = 'Template_Form.xlsx';
const TEMPLATE_SHEET_NAME = 'Reimburse';
const TEMPLATE_DATA_START_ROW = 11;
const TEMPLATE_DATA_END_ROW = 125;
const TEMPLATE_FOOTER_NAME_ROW = 135;

type ReportExcelRow = Reimbursement & {
  projectCode?: string | null;
  remark?: string | null;
  transactionId?: string | null;
  transactionTime?: string | null;
  paymentMethod?: string | null;
  transactionAmount?: number | null;
  adminFee?: number | null;
  shippingFee?: number | null;
  serviceFee?: number | null;
  discount?: number | null;
  loginStatus?: string | null;
  by?: string | null;
  folderEvidence?: string | null;
  folderEvidence2?: string | null;
};

/**
 * DatabaseReportService implements IReportService using PostgreSQL database.
 *
 * This service executes SQL queries against the reimbursements table with JOINs
 * to include user, project, and lead information for comprehensive reporting.
 * Generates Excel files using ExcelJS library with a workbook template.
 */
export class DatabaseReportService implements IReportService {
  async generateExcelReport(filters: ReportFilters): Promise<Buffer> {
    const isValid = await this.validateReportFilters(filters);
    if (!isValid) {
      throw new Error('Invalid report filters provided');
    }

    const reportData = await this.getReportData(filters) as ReportExcelRow[];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.getTemplatePath());

    const templateWorksheet = workbook.getWorksheet(TEMPLATE_SHEET_NAME) || workbook.worksheets[0];
    if (!templateWorksheet) {
      throw new Error('Excel template worksheet not found');
    }

    if (reportData.length === 0) {
      this.prepareSheetForNoData(templateWorksheet);
      templateWorksheet.name = 'No Data';
    } else {
      templateWorksheet.name = this.generateWorksheetName(reportData);
      this.populateTemplateSheet(templateWorksheet, reportData);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getReportData(filters: ReportFilters): Promise<Reimbursement[]> {
    if (!db.isInitialized()) {
      const config = getDatabaseConfig();
      db.initialize(config.connectionString!, config.poolConfig!);
    }

    let query = `
      SELECT
        r.id::text,
        r.user_id::text as "userId",
        COALESCE(r.employee_name, u.name) as "employeeName",
        COALESCE(r.employee_email, u.email) as "employeeEmail",
        r.amount,
        r.description,
        r.status,
        COALESCE(r.date, r.submission_date::date) as date,
        COALESCE(r.project, 'MaxStream') as project,
        r.receipt_image as "receiptImage",
        r.receipt_image_2 as "receiptImage2",
        r.asset,
        r.approvals,
        r.rejection_reason as "rejectionReason",
        r.approval_date as "approvalDate",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        COALESCE(r.lead_id::text, u.lead_id::text) as "leadId",
        COALESCE(r.lead_name, l.name) as "leadName",
        p.project_id as "projectCode",
        r.transaction_id as "transactionId",
        r.transaction_time as "transactionTime",
        r.payment_method as "paymentMethod",
        r.transaction_amount as "transactionAmount",
        r.admin_fee as "adminFee",
        r.shipping_fee as "shippingFee",
        r.service_fee as "serviceFee",
        r.discount,
        r.login_status as "loginStatus",
        r.by,
        r.folder_evidence as "folderEvidence",
        r.folder_evidence_2 as "folderEvidence2"
      FROM reimbursements r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN users l ON COALESCE(r.lead_id, u.lead_id) = l.id
      LEFT JOIN projects p ON r.project_id = p.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

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

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY r.submission_date DESC`;

    const result = await db.query(query, params);

    return result.rows.map((row) => ({
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
      receiptImage2: row.receiptImage2,
      asset: row.asset,
      approvals: row.approvals || {},
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      leadId: row.leadId,
      leadName: row.leadName,
      transactionId: row.transactionId,
      transactionTime: row.transactionTime,
      paymentMethod: row.paymentMethod,
      transactionAmount: row.transactionAmount ? parseFloat(row.transactionAmount) : undefined,
      adminFee: row.adminFee ? parseFloat(row.adminFee) : 0,
      shippingFee: row.shippingFee ? parseFloat(row.shippingFee) : 0,
      serviceFee: row.serviceFee ? parseFloat(row.serviceFee) : 0,
      discount: row.discount ? parseFloat(row.discount) : 0,
      loginStatus: row.loginStatus,
      by: row.by,
      folderEvidence: row.folderEvidence,
      folderEvidence2: row.folderEvidence2,
      projectCode: row.projectCode,
    } as ReportExcelRow));
  }

  async validateReportFilters(filters: ReportFilters): Promise<boolean> {
    try {
      if (!db.isInitialized()) {
        const config = getDatabaseConfig();
        db.initialize(config.connectionString!, config.poolConfig!);
      }

      if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
        return false;
      }

      if (filters.projectId) {
        const projectIdNum = parseInt(filters.projectId);
        if (isNaN(projectIdNum) || projectIdNum <= 0) {
          return false;
        }
      }

      if (filters.status && filters.status.length > 0) {
        const validStatuses = [
          'pending',
          'approved_by_lead',
          'approved_by_head',
          'approved_by_finance',
          'rejected',
        ];
        const invalidStatus = filters.status.find((status) => !validStatuses.includes(status));
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

  async getReportSummary(filters: ReportFilters): Promise<ReportSummary> {
    if (!db.isInitialized()) {
      const config = getDatabaseConfig();
      db.initialize(config.connectionString!, config.poolConfig!);
    }

    try {
      let baseQuery = `
        FROM reimbursements r
        INNER JOIN users u ON r.user_id = u.id
        LEFT JOIN users l ON COALESCE(r.lead_id, u.lead_id) = l.id
        LEFT JOIN projects p ON r.project_id = p.id
      `;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

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

      const totalQuery = `
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(r.amount), 0) as total_amount
        ${baseQuery}
        ${whereClause}
      `;

      const totalResult = await db.query(totalQuery, params);
      const totalData = totalResult.rows[0];

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

      statusResult.rows.forEach((row) => {
        if (row.status in statusBreakdown) {
          statusBreakdown[row.status as keyof typeof statusBreakdown] = parseInt(row.count);
        }
      });

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

      projectResult.rows.forEach((row) => {
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

  private getTemplatePath(): string {
    const templatePath = path.join(process.cwd(), 'public', 'templates', TEMPLATE_FILENAME);
    if (!existsSync(templatePath)) {
      throw new Error(`Excel template not found at ${templatePath}`);
    }

    return templatePath;
  }

  private prepareSheetForNoData(worksheet: ExcelJS.Worksheet): void {
    this.clearTemplateDataArea(worksheet);
    worksheet.getCell('G3').value = new Date();
    worksheet.getCell('G4').value = '';
    worksheet.getCell('G5').value = 'No reimbursement data';
    worksheet.getCell('G6').value = '';
    worksheet.getCell('G7').value = '';
    worksheet.getCell('G8').value = '';
    worksheet.getCell(`E${TEMPLATE_DATA_START_ROW}`).value = 'No reimbursement data found for the selected filters';
  }

  private populateTemplateSheet(
    worksheet: ExcelJS.Worksheet,
    reimbursements: ReportExcelRow[]
  ): void {
    this.clearTemplateDataArea(worksheet);
    const firstReimbursement = reimbursements[0];
    const submissionDate = this.getLatestSubmissionDate(reimbursements)
      || this.parseDateValue(firstReimbursement.createdAt)
      || this.parseDateValue(firstReimbursement.date)
      || new Date();

    worksheet.getCell('G3').value = submissionDate;
    worksheet.getCell('G4').value = '';
    worksheet.getCell('G5').value = this.getSharedValue(reimbursements, (item) => item.employeeName, 'Multiple Employees');
    worksheet.getCell('G6').value = this.getSharedValue(reimbursements, (item) => this.getBusinessUnit(item.project), 'Multiple Units');
    worksheet.getCell('G7').value = this.getSharedValue(reimbursements, (item) => item.project, 'Multiple Projects');
    worksheet.getCell('G8').value = this.getSharedValue(reimbursements, (item) => item.projectCode || '', '');

    reimbursements.slice(0, TEMPLATE_DATA_END_ROW - TEMPLATE_DATA_START_ROW + 1).forEach((reimbursement, index) => {
      const rowNumber = TEMPLATE_DATA_START_ROW + index;
      const transactionDate = this.parseDateValue(reimbursement.date) || submissionDate;
      const transactionTime = this.parseTimeValue(reimbursement.transactionTime);
      const amount = this.normalizeNumber(reimbursement.transactionAmount) ?? this.normalizeNumber(reimbursement.amount) ?? 0;
      const adminFee = this.normalizeNumber(reimbursement.adminFee) ?? 0;
      const serviceFee = this.normalizeNumber(reimbursement.serviceFee) ?? 0;
      const totalAmount = this.normalizeNumber(reimbursement.amount) ?? amount + adminFee + serviceFee;
      const comment = this.getPrimaryComment(reimbursement);
      const remark = this.getRemarkText(reimbursement, comment);
      const approvedText = this.getApprovedLabel(reimbursement.status);

      worksheet.getCell(`A${rowNumber}`).value = index + 1;
      worksheet.getCell(`B${rowNumber}`).value = transactionDate;
      worksheet.getCell(`C${rowNumber}`).value = transactionTime;
      worksheet.getCell(`D${rowNumber}`).value = reimbursement.transactionId || reimbursement.id;
      worksheet.getCell(`E${rowNumber}`).value = reimbursement.description || '';
      worksheet.getCell(`F${rowNumber}`).value = reimbursement.paymentMethod || '';
      worksheet.getCell(`G${rowNumber}`).value = amount;
      worksheet.getCell(`H${rowNumber}`).value = adminFee > 0 ? adminFee : null;
      worksheet.getCell(`I${rowNumber}`).value = this.normalizeNumber(reimbursement.shippingFee) ?? 0;
      worksheet.getCell(`J${rowNumber}`).value = serviceFee > 0 ? serviceFee : null;
      worksheet.getCell(`K${rowNumber}`).value = this.normalizeNumber(reimbursement.discount) ?? 0;
      worksheet.getCell(`L${rowNumber}`).value = reimbursement.loginStatus || '';
      worksheet.getCell(`M${rowNumber}`).value = {
        formula: `SUM(G${rowNumber}:K${rowNumber})`,
        result: totalAmount,
      };
      worksheet.getCell(`N${rowNumber}`).value = reimbursement.by || '';
      worksheet.getCell(`O${rowNumber}`).value = reimbursement.folderEvidence || reimbursement.receiptImage || '';
      worksheet.getCell(`P${rowNumber}`).value = remark;
      worksheet.getCell(`Q${rowNumber}`).value = approvedText;
      worksheet.getCell(`R${rowNumber}`).value = comment;
    });

    worksheet.getCell('D135').value = this.getSharedValue(reimbursements, (item) => item.employeeName, '');
    worksheet.getCell('E135').value = this.getSharedValue(reimbursements, (item) => item.leadName || '', '');
    worksheet.getCell('F135').value = this.getSharedValue(reimbursements, (item) => item.approvals?.head?.by || '', '');
    worksheet.getCell('O136').value = this.getSharedValue(reimbursements, (item) => item.approvals?.finance?.by || '', '');
  }

  private clearTemplateDataArea(worksheet: ExcelJS.Worksheet): void {
    for (let rowIndex = TEMPLATE_DATA_START_ROW; rowIndex <= TEMPLATE_DATA_END_ROW; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      for (let cellIndex = 1; cellIndex <= 17; cellIndex++) {
        row.getCell(cellIndex).value = null;
      }
    }

    ['D135', 'E135', 'F135', 'O136'].forEach((cellRef) => {
      worksheet.getCell(cellRef).value = '';
    });
  }

  private generateWorksheetName(reimbursements: ReportExcelRow[]): string {
    const projectName = this.getSharedValue(reimbursements, (item) => item.project, 'Reimbursement');
    const dateLabel = this.formatSheetDate(this.getLatestSubmissionDate(reimbursements)?.toISOString() || reimbursements[0]?.date);
    return this.sanitizeWorksheetName(`${projectName} ${dateLabel}`);
  }

  private sanitizeWorksheetName(name: string): string {
    const sanitized = name.replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    return sanitized.slice(0, 31) || 'Sheet';
  }

  private formatSheetDate(value?: string | null): string {
    const parsed = this.parseDateValue(value);
    if (!parsed) {
      return 'No Date';
    }

    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, '0'),
      String(parsed.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private parseDateValue(value?: string | Date | null): Date | null {
    if (!value) {
      return null;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseTimeValue(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.length <= 5 ? `${trimmed}:00` : trimmed;
    const parsed = new Date(`1899-12-30T${normalized}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeNumber(value?: number | string | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const normalized = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private getBusinessUnit(project?: string | null): string {
    if (!project) {
      return '';
    }

    const businessUnitMap: Record<string, string> = {
      'Dunia Games': 'S&P',
      'MaxStream': 'S&P',
      'MyOrbit': 'S&P',
    };

    return businessUnitMap[project] || project;
  }

  private getApprovedLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved_by_lead':
        return 'Approved by Lead';
      case 'submitted_to_head':
        return 'Submitted to Head';
      case 'approved_by_head':
        return 'Approved by Head';
      case 'submitted_to_finance':
        return 'Submitted to Finance';
      case 'approved_by_finance':
        return 'Approved by Finance';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  private getPrimaryComment(reimbursement: ReportExcelRow): string {
    const trimmedRejectionReason = reimbursement.rejectionReason?.trim();
    if (trimmedRejectionReason) {
      return trimmedRejectionReason;
    }

    const approvalComments = [
      reimbursement.approvals?.finance?.comment?.trim(),
      reimbursement.approvals?.head?.comment?.trim(),
      reimbursement.approvals?.lead?.comment?.trim(),
    ].filter(Boolean);

    return approvalComments[0] || '';
  }

  private getRemarkText(reimbursement: ReportExcelRow, primaryComment: string): string {
    const remarkParts = new Set<string>();

    if (reimbursement.remark?.trim()) {
      remarkParts.add(reimbursement.remark.trim());
    }

    if (reimbursement.asset?.trim()) {
      remarkParts.add(`Asset: ${reimbursement.asset.trim()}`);
    }

    const approvalNotes: Array<[string, string | undefined]> = [
      ['Lead', reimbursement.approvals?.lead?.comment?.trim()],
      ['Head', reimbursement.approvals?.head?.comment?.trim()],
      ['Finance', reimbursement.approvals?.finance?.comment?.trim()],
    ];

    approvalNotes.forEach(([label, note]) => {
      if (note && note !== primaryComment) {
        remarkParts.add(`${label}: ${note}`);
      }
    });

    return Array.from(remarkParts).join(' | ');
  }

  private getSharedValue(
    reimbursements: ReportExcelRow[],
    selector: (item: ReportExcelRow) => string,
    fallback: string
  ): string {
    const values = Array.from(new Set(reimbursements.map((item) => selector(item).trim()).filter(Boolean)));
    if (values.length === 1) {
      return values[0];
    }

    return fallback;
  }

  private getLatestSubmissionDate(reimbursements: ReportExcelRow[]): Date | null {
    const dates = reimbursements
      .map((item) => this.parseDateValue(item.createdAt) || this.parseDateValue(item.date))
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => right.getTime() - left.getTime());

    return dates[0] || null;
  }
}
