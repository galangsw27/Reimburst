/**
 * Reimbursement Service for Next.js 16 Migration
 * 
 * This service handles reimbursement-related operations including:
 * - Receipt processing via OCR webhook
 * - Asset matching via AI webhook
 * - Project-specific webhook submissions
 * - Approval workflow status updates
 * 
 * Requirements: 7.1, 7.2, 9.2
 */

import axios from 'axios'
import { apiClient } from '@/lib/api/client'
import { Reimbursement, ReimbursementStatus, OCRResponse, AssetMatchResponse, AssetMatchResult } from '@/lib/types'

/**
 * Get runtime configuration from API
 * This allows environment variables to be loaded at runtime instead of build time
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
 * Process a receipt image using the OCR webhook
 * 
 * Sends the image file directly to the n8n OCR webhook for AI processing.
 * The webhook extracts information like amount, date, description, and merchant.
 * 
 * @param file - Image file to process
 * @returns OCR processing result with extracted data
 * @throws Error if webhook call fails or returns error
 * 
 * Requirements: 7.1 - OCR Service integration
 */
export async function processReceipt(file: File): Promise<OCRResponse> {
  try {
    // Use server-side API route to call webhook (URL kept secure server-side)
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post('/api/ocr/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    console.error('Receipt processing failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Match a transaction description to an asset using AI webhook
 * 
 * Sends the description to the asset matching webhook which uses AI to
 * identify the associated asset, employee, and department.
 * 
 * @param description - Transaction description to match
 * @returns Asset matching result with matched asset details
 * @throws Error if webhook call fails or returns error
 * 
 * Requirements: 7.2 - Asset Matcher integration
 */
export async function matchAsset(description: string): Promise<AssetMatchResponse> {
  try {
    // Use server-side API route to call webhook (URL kept secure server-side)
    const response = await apiClient.post('/api/asset/match', {
      description,
    })
    
    const output = response.data.output || response.data.data || response.data
    const asset = output.asset || output
    
    const matchResult: AssetMatchResult = {
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
    }
    
    return {
      success: true,
      data: matchResult,
    }
  } catch (error) {
    console.error('Asset matching failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get the webhook URL for a specific project
 * 
 * Maps project names to their corresponding webhook URLs from environment variables.
 * Supports MaxStream, MyOrbit, and DuniaGames projects.
 * 
 * @param project - Project name (case-insensitive)
 * @returns Webhook URL for the project
 * @throws Error if project webhook URL is not configured
 */
async function getProjectWebhookUrl(project: string): Promise<string> {
  const normalizedProject = project.toLowerCase().replace(/\s+/g, '')
  
  // Try build-time env vars first
  let webhookUrls: Record<string, string | undefined> = {
    maxstream: process.env.NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL,
    myorbit: process.env.NEXT_PUBLIC_MYORBIT_WEBHOOK_URL,
    duniagames: process.env.NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL,
  }
  
  let webhookUrl = webhookUrls[normalizedProject]
  
  // If not available at build time, try runtime config
  if (!webhookUrl) {
    const config = await getRuntimeConfig()
    if (config) {
      webhookUrls = {
        maxstream: config.maxstreamWebhookUrl,
        myorbit: config.myorbitWebhookUrl,
        duniagames: config.duniagamesWebhookUrl,
      }
      webhookUrl = webhookUrls[normalizedProject]
    }
  }
  
  if (!webhookUrl) {
    throw new Error(`Webhook URL not configured for project: ${project}`)
  }
  
  return webhookUrl
}

/**
 * Submit a reimbursement to a project-specific webhook
 * 
 * Routes the reimbursement data to the appropriate project webhook
 * (MaxStream, MyOrbit, or DuniaGames) based on the project field.
 * 
 * @param reimbursement - Reimbursement object to submit
 * @param project - Project name for webhook routing
 * @throws Error if submission fails or webhook URL not configured
 * 
 * Requirements: 7.2 - Project-specific webhook integration
 */
export async function submitToProject(
  reimbursement: Reimbursement,
  project: string
): Promise<void> {
  try {
    const webhookUrl = await getProjectWebhookUrl(project)
    
    await axios.post(webhookUrl, reimbursement)
  } catch (error) {
    console.error(`Failed to submit to project ${project}:`, error)
    throw new Error(
      `Project submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Update the status of a reimbursement in the approval workflow
 * 
 * Creates a new array with the updated reimbursement status and timestamp.
 * This is used for the approval workflow transitions:
 * pending → approved_by_head → approved_by_lead → approved_by_finance
 * 
 * @param reimbursements - Array of all reimbursements
 * @param id - ID of the reimbursement to update
 * @param status - New status to set
 * @returns New array with updated reimbursement
 * 
 * Requirements: 9.2 - Approval workflow status updates
 */
export function updateStatus(
  reimbursements: Reimbursement[],
  id: string,
  status: ReimbursementStatus
): Reimbursement[] {
  return reimbursements.map(reimbursement =>
    reimbursement.id === id
      ? {
          ...reimbursement,
          status,
          updatedAt: new Date().toISOString(),
        }
      : reimbursement
  )
}

/**
 * Reimbursement service object with all methods
 */
export const reimbursementService = {
  processReceipt,
  matchAsset,
  submitToProject,
  updateStatus,
}

export default reimbursementService
