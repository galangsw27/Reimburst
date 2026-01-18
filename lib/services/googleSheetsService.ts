// Google Sheets Service for Next.js Reimbursement System
// Handles Google Sheets export functionality via webhook (no OAuth required)

import { Reimbursement, ProjectType } from '@/lib/types'
import axios from 'axios'

// Project configuration with webhook URLs
export interface ProjectConfig {
  id: string
  name: string
  spreadsheetId: string
  sheetName: string
  webhookUrl?: string // Google Apps Script webhook URL
}

/**
 * Get runtime configuration from API
 */
async function getRuntimeConfig() {
  try {
    const response = await axios.get('/api/config')
    return response.data
  } catch (error) {
    console.error('Failed to load runtime config:', error)
    return null
  }
}

/**
 * Get project configurations with runtime webhook URLs
 */
async function getProjects(): Promise<ProjectConfig[]> {
  // Try build-time env vars first
  let maxstreamUrl = process.env.NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL || ''
  let myorbitUrl = process.env.NEXT_PUBLIC_MYORBIT_WEBHOOK_URL || ''
  let duniagamesUrl = process.env.NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL || ''
  
  // If not available at build time, try runtime config
  if (!maxstreamUrl || !myorbitUrl || !duniagamesUrl) {
    const config = await getRuntimeConfig()
    if (config) {
      maxstreamUrl = maxstreamUrl || config.maxstreamWebhookUrl || ''
      myorbitUrl = myorbitUrl || config.myorbitWebhookUrl || ''
      duniagamesUrl = duniagamesUrl || config.duniagamesWebhookUrl || ''
    }
  }
  
  return [
    {
      id: 'maxstream',
      name: 'MaxStream',
      spreadsheetId: '1lOhILZhnSQR-fESsPuhDexVNYgyjG6MoAkDuk2a9iAU',
      sheetName: 'Sheet1',
      webhookUrl: maxstreamUrl,
    },
    {
      id: 'myorbit',
      name: 'MyOrbit',
      spreadsheetId: '15fcJRGyDM6_Ecd229Fjb7t6VsCQmMiJg3qrsint5_PM',
      sheetName: 'Sheet1',
      webhookUrl: myorbitUrl,
    },
    {
      id: 'duniagames',
      name: 'Dunia Games',
      spreadsheetId: '', // Add spreadsheet ID when available
      sheetName: 'Sheet1',
      webhookUrl: duniagamesUrl,
    },
  ]
}

// Static project configurations (for backward compatibility)
export const PROJECTS: ProjectConfig[] = [
  {
    id: 'maxstream',
    name: 'MaxStream',
    spreadsheetId: '1lOhILZhnSQR-fESsPuhDexVNYgyjG6MoAkDuk2a9iAU',
    sheetName: 'Sheet1',
    webhookUrl: process.env.NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL || '',
  },
  {
    id: 'myorbit',
    name: 'MyOrbit',
    spreadsheetId: '15fcJRGyDM6_Ecd229Fjb7t6VsCQmMiJg3qrsint5_PM',
    sheetName: 'Sheet1',
    webhookUrl: process.env.NEXT_PUBLIC_MYORBIT_WEBHOOK_URL || '',
  },
  {
    id: 'duniagames',
    name: 'Dunia Games',
    spreadsheetId: '', // Add spreadsheet ID when available
    sheetName: 'Sheet1',
    webhookUrl: process.env.NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL || '',
  },
]

// Row structure for Google Sheets
interface ReimbursementRow {
  no?: number
  tgl: string
  time: string
  trxId: string
  transaksi: string
  paymentType: string
  amount: number
  bAdmin: number
  bKirim: number
  bLayanan: number
  diskon: number
  loginStatus: string
  total: number
  by: string
  remark: string
}

/**
 * Format date from yyyy-mm-dd to dd/mm/yyyy for Google Sheets
 */
const formatDateForSheet = (dateStr: string): string => {
  if (!dateStr) return ''
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`
  }
  return dateStr
}

/**
 * Get project configuration by project name or ID
 */
const getProjectConfig = async (projectIdentifier: string): Promise<ProjectConfig | undefined> => {
  const projects = await getProjects()
  const normalized = projectIdentifier.toLowerCase().replace(/\s+/g, '')
  return projects.find(
    p => p.id === normalized || p.name.toLowerCase().replace(/\s+/g, '') === normalized
  )
}

/**
 * Export reimbursements to Google Sheets via webhook
 * This method uses Google Apps Script webhook to append data without OAuth
 */
export const exportToSheets = async (
  reimbursements: Reimbursement[],
  projectName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const project = await getProjectConfig(projectName)
    
    if (!project) {
      throw new Error(`Project not found: ${projectName}`)
    }
    
    if (!project.webhookUrl) {
      throw new Error(
        `Webhook URL not configured for project: ${project.name}. Please setup Google Apps Script webhook.`
      )
    }

    // Convert reimbursements to sheet rows
    const rows = reimbursements.map(r => {
      // Extract time from createdAt or use current time
      const time = r.createdAt ? new Date(r.createdAt).toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }) : ''

      return {
        tgl: formatDateForSheet(r.date),
        time: time,
        trxId: r.id,
        transaksi: r.description,
        paymentType: 'Reimbursement',
        amount: r.amount,
        bAdmin: 0,
        bKirim: 0,
        bLayanan: 0,
        diskon: 0,
        loginStatus: 'N/A',
        total: r.amount,
        by: r.employeeName,
        remark: r.asset || 'N/A',
      }
    })

    // Send to Google Apps Script webhook
    const response = await fetch(project.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows }),
      mode: 'no-cors', // Important for Google Apps Script
    })

    // Note: With no-cors mode, we can't read the response
    // But the request will still be processed by Apps Script
    console.log(`${rows.length} rows sent to ${project.name} via webhook`)

    return {
      success: true,
      message: `Successfully exported ${rows.length} reimbursement(s) to ${project.name}`,
    }
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export to Google Sheets',
    }
  }
}

/**
 * Format reimbursements for export
 * Returns a 2D array suitable for spreadsheet export
 */
export const formatForExport = (reimbursements: Reimbursement[]): string[][] => {
  // Header row
  const headers = [
    'Date',
    'Employee',
    'Amount',
    'Description',
    'Project',
    'Status',
    'Asset',
  ]

  // Data rows
  const rows = reimbursements.map(r => [
    r.date,
    r.employeeName,
    r.amount.toString(),
    r.description,
    r.project,
    r.status,
    r.asset || 'N/A',
  ])

  return [headers, ...rows]
}

/**
 * Download Excel from Google Sheets
 * Opens the Google Sheets export URL in a new tab
 */
export const downloadExcelFromSheet = async (projectName: string): Promise<void> => {
  const project = await getProjectConfig(projectName)
  
  if (!project) {
    throw new Error(`Project not found: ${projectName}`)
  }
  
  if (!project.spreadsheetId) {
    throw new Error(`Spreadsheet ID not configured for project: ${project.name}`)
  }

  // Google Sheets export URL for Excel format
  const exportUrl = `https://docs.google.com/spreadsheets/d/${project.spreadsheetId}/export?format=xlsx&gid=0`
  
  // Open in new tab to trigger download
  window.open(exportUrl, '_blank')
}

/**
 * Get the Google Sheets URL for viewing
 */
export const getSpreadsheetUrl = async (projectName: string): Promise<string> => {
  const project = await getProjectConfig(projectName)
  
  if (!project || !project.spreadsheetId) {
    return ''
  }
  
  return `https://docs.google.com/spreadsheets/d/${project.spreadsheetId}/edit`
}

/**
 * Google Sheets Service
 * Main export object for the service
 */
export const googleSheetsService = {
  exportToSheets,
  formatForExport,
  downloadExcelFromSheet,
  getSpreadsheetUrl,
  PROJECTS,
}
