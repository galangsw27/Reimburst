import { NextRequest, NextResponse } from 'next/server';
import { getReimbursementService } from '@/lib/services/factory';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { reimbursementId, folderEvidence } = data;

    if (!reimbursementId || !folderEvidence) {
      return NextResponse.json(
        { error: 'reimbursementId and folderEvidence are required' },
        { status: 400 }
      );
    }

    const reimbursementService = getReimbursementService();

    // Memperbarui url folder_evidence di database
    // updateReimbursement sudah mendukung field folderEvidence yang kita tambahkan sebelumnya
    const updated = await reimbursementService.updateReimbursement(reimbursementId, {
      folderEvidence: folderEvidence
    });

    return NextResponse.json({ 
      success: true, 
      message: 'GDrive folder evidence updated successfully',
      data: updated 
    });
  } catch (error) {
    console.error('Error updating GDrive folder evidence:', error);
    return NextResponse.json(
      { error: 'Failed to update GDrive folder evidence' },
      { status: 500 }
    );
  }
}
