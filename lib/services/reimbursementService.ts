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
import { Reimbursement, ReimbursementStatus, OCRResponse, AssetMatchResponse } from '@/lib/types'

/**
 * Process a receipt image using the OCR webhook
 * 
 * Sends the base64-encoded image to the n8n OCR webhook for AI processing.
 * The webhook extracts information like amount, date, description, and merchant.
 * 
 * @param imageBase64 - Base64-encoded receipt image
 * @returns OCR processing result with extracted data
 * @throws Error if webhook call fails or returns error
 * 
 * Requirements: 7.1 - OCR Service integration
 */
export async function processReceipt(imageBase64: string): Promise<OCRResponse> {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL
    
    if (!webhookUrl) {
      throw new Error('NEXT_PUBLIC_WEBHOOK_URL is not configured')
    }
    
    const response = await axios.post(webhookUrl, {
      image: imageBase64,
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
    const webhookUrl = process.env.NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL
    
    if (!webhookUrl) {
      throw new Error('NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL is not configured')
    }
    
    const response = await axios.post(webhookUrl, {
      description,
    })
    
    return {
      success: true,
      data: response.data,
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
function getProjectWebhookUrl(project: string): string {
  const normalizedProject = project.toLowerCase().replace(/\s+/g, '')
  
  const webhookUrls: Record<string, string | undefined> = {
    maxstream: process.env.NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL,
    myorbit: process.env.NEXT_PUBLIC_MYORBIT_WEBHOOK_URL,
    duniagames: process.env.NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL,
  }
  
  const webhookUrl = webhookUrls[normalizedProject]
  
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
    const webhookUrl = getProjectWebhookUrl(project)
    
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
