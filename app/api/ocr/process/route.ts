/**
 * OCR Processing API Route
 * 
 * Server-side endpoint for processing receipts via OCR webhook.
 * This keeps webhook URLs server-side to prevent URL leakage.
 * 
 * Endpoint: POST /api/ocr/process
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';
import axios from 'axios';

/**
 * POST /api/ocr/process
 * 
 * Process a receipt image using the OCR webhook (server-side).
 * Webhook URL is kept server-side for security.
 * 
 * Request Body:
 * - file: Base64 encoded image data
 * 
 * Response:
 * - OCR processing result with extracted data
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    // Get webhook URL from server-side environment (not exposed to client)
    const webhookUrl = process.env.WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('WEBHOOK_URL is not configured.');
      return NextResponse.json(
        { error: 'OCR service is not configured. Contact administrator.' },
        { status: 500 }
      );
    }

    // Use formData() for multipart form data, not json()
    const formData = await request.formData();
    
    // Convert Next.js FormData to regular FormData for axios
    const n8nFormData = new FormData();
    
    // Get the file from the form
    const file = formData.get('file');
    if (file && file instanceof Blob) {
      n8nFormData.append('file', file);
    }

    const response = await axios.post(webhookUrl, n8nFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout for OCR processing
    });

    // Parse the OCR response - n8n returns JSON as string in data.data
    let ocrData = response.data;
    
    // Check if we have data.data as a string that needs parsing
    if (ocrData?.data && typeof ocrData.data === 'string') {
      // Extract JSON from markdown code block if present
      let jsonStr = ocrData.data;
      
      // Remove markdown code block markers if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      try {
        ocrData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse OCR response:', parseError);
        // Return the raw data if parsing fails
      }
    }

    return NextResponse.json({
      success: true,
      data: ocrData,
    });
  } catch (error) {
    console.error('OCR processing failed:', error);
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message || 'OCR processing failed' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process receipt' },
      { status: 500 }
    );
  }
}