/**
 * Reimbursements API Routes
 * 
 * This file implements the API endpoints for reimbursement operations.
 * Routes automatically use the appropriate service (Mock or Database) based on DATABASE_MODE.
 * All routes require JWT authentication.
 * 
 * Requirements: 6.5, 6.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReimbursementService } from '@/lib/services/factory';
import { ReimbursementFilters } from '@/lib/services/types';
import { ReimbursementStatus } from '@/lib/types';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/reimbursements
 * 
 * Retrieves reimbursements with optional filtering by status or userId.
 * 
 * Protected: Requires valid JWT token
 * Users can only see their own reimbursements unless they are head, lead, or finance
 * 
 * Query Parameters:
 * - status: Filter by reimbursement status (pending, approved, rejected)
 * - userId: Filter by user ID
 * 
 * Requirements: 6.5
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    const reimbursementService = getReimbursementService();
    const { searchParams } = new URL(request.url);
    
    // Build filters from query parameters
    const filters: ReimbursementFilters = {};
    
    const status = searchParams.get('status');
    if (status) {
      filters.status = status as ReimbursementStatus;
    }
    
    let userId = searchParams.get('userId');
    
    // Regular users can only see their own reimbursements
    if (user!.role === 'user') {
      userId = user!.userId;
    }
    
    if (userId) {
      filters.userId = userId;
    }
    
    const reimbursements = await reimbursementService.getReimbursements(filters);
    
    return NextResponse.json(reimbursements);
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reimbursements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reimbursements
 * 
 * Creates a new reimbursement.
 * Validates that amount is positive.
 * 
 * Protected: Requires valid JWT token
 * Users can only create reimbursements for themselves
 * 
 * Requirements: 6.6
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    const reimbursementService = getReimbursementService();
    const data = await request.json();
    
    // Validate amount is positive
    if (!data.amount || data.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!data.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // Regular users can only create reimbursements for themselves
    if (user!.role === 'user' && data.userId !== user!.userId) {
      return NextResponse.json(
        { error: 'You can only create reimbursements for yourself' },
        { status: 403 }
      );
    }
    
    if (!data.description) {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      );
    }
    
    const reimbursement = await reimbursementService.createReimbursement(data);

    // Save evidence to Google Drive via n8n webhook (server-side only, no logging for security)
    const gdriveWebhookUrl = process.env.N8N_GDRIVE_WEBHOOK_URL;
    
    if (gdriveWebhookUrl && (data.folderEvidence || data.evidence2Image)) {
      try {
        const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
        
        // Function to save single evidence to GDrive
        const saveToGdrive = async (filePath: string | null, label: string): Promise<string | null> => {
          if (!filePath) return null;
          
          // Check if it's a base64 string (already uploaded, not from local storage)
          if (filePath.startsWith('data:')) {
            // Already a base64 data URL
            const base64Data = filePath.split(',')[1];
            const ext = filePath.match(/data:image\/(\w+);base64/)?.[1] || 'jpg';
            const fileName = `${label}_${Date.now()}.${ext}`;
            
            try {
              const response = await axios.post(gdriveWebhookUrl, {
                reimbursementId: reimbursement.id,
                projectName: data.project,
                fileName: fileName,
                base64: base64Data
              }, { timeout: 30000 });
              
              if (response.data?.evidenceFolder || response.data?.folderUrl || response.data?.webViewLink) {
                return response.data.evidenceFolder || response.data.folderUrl || response.data.webViewLink;
              }
            } catch (gdriveError) {
              console.error(`Failed to save ${label} to GDrive:`, gdriveError);
            }
            return null;
          }
          
          // It's a local file path - read and convert to base64
          const fullPath = path.join(uploadDir, path.basename(filePath));
          if (fs.existsSync(fullPath)) {
            const fileBuffer = fs.readFileSync(fullPath);
            const base64Data = fileBuffer.toString('base64');
            const ext = path.extname(filePath).slice(1) || 'jpg';
            const fileName = `${label}_${path.basename(filePath)}`;
            
            try {
              const response = await axios.post(gdriveWebhookUrl, {
                reimbursementId: reimbursement.id,
                projectName: data.project,
                fileName: fileName,
                base64: base64Data
              }, { timeout: 30000 });
              
              if (response.data?.evidenceFolder || response.data?.folderUrl || response.data?.webViewLink) {
                return response.data.evidenceFolder || response.data.folderUrl || response.data.webViewLink;
              }
            } catch (gdriveError) {
              console.error(`Failed to save ${label} to GDrive:`, gdriveError);
            }
          }
          return null;
        };

        // Save evidence 1 (main evidence) to GDrive
        const gdriveUrl1 = await saveToGdrive(data.folderEvidence, 'evidence1');
        
        // Save evidence 2 (pendukung) to GDrive
        const gdriveUrl2 = await saveToGdrive(data.evidence2Image, 'evidence2');

        // Update reimbursement with GDrive URLs if successful
        if (gdriveUrl1 || gdriveUrl2) {
          const updateData: any = {};
          if (gdriveUrl1) updateData.folderEvidence = gdriveUrl1;
          if (gdriveUrl2) {
            updateData.evidence2Image = gdriveUrl2;
          }
          
          await reimbursementService.updateReimbursement(reimbursement.id, updateData);
          
          // Refresh the reimbursement data
          const updated = await reimbursementService.getReimbursementById(reimbursement.id);
          if (updated) {
            return NextResponse.json(updated, { status: 201 });
          }
        }
      } catch (error) {
        console.error('Error saving evidence to GDrive:', error);
        // Continue even if GDrive save fails - don't block reimbursement creation
      }
    }
    
    return NextResponse.json(reimbursement, { status: 201 });
  } catch (error) {
    console.error('Error creating reimbursement:', error);
    
    // Return more detailed error message
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create reimbursement' },
      { status: 500 }
    );
  }
}
