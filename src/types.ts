export type ProjectType = 'MaxStream' | 'MyOrbit' | 'Dunia Games';

export interface ReimbursementData {
    nama: string;
    msisdnEmail: string;
    project: ProjectType;
    tgl: string;
    time: string;
    trxId: string;
    transaksi: string;
    paymentType: string;
    amount: number;
    bAdmin: number;
    bKirim: number;
    bLayanan: number;
    diskon: number;
    loginStatus: string;
    total: number;
    by: string;
    remark: string;
}

export type AppState = 'upload' | 'processing' | 'review' | 'success' | 'error';

// New types for reimbursement management system
export type UserRole = 'user' | 'head' | 'lead' | 'finance';

export type ReimbursementStatus = 'pending' | 'approved_head' | 'approved_lead' | 'approved_finance' | 'rejected';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    leadId?: string; // For users, reference to their lead
    leadName?: string; // For display
}

export interface ReimbursementRequest {
    id: string;
    no: number;
    userId: string;
    userName: string;
    leadId?: string; // Lead assigned to this user
    leadName?: string; // Lead name for display
    submittedDate: string;
    data: ReimbursementData;
    status: ReimbursementStatus;
    imageUrl?: string;
    approvals: {
        head?: { approved: boolean; by: string; date: string; comment?: string };
        lead?: { approved: boolean; by: string; date: string; comment?: string };
        finance?: { approved: boolean; by: string; date: string; comment?: string; assetMatch?: AssetMatchResult };
    };
    rejectionReason?: string;
}

export interface AssetMatchResult {
    matched: boolean;
    assetId?: string;
    assetName?: string;
    employeeName?: string;
    department?: string;
    matchedBy: 'msisdn' | 'email';
    matchedValue: string;
    confidence?: number;
    verifiedDate: string;
}

export interface DashboardStats {
    totalRequests: number;
    pendingApproval: number;
    approved: number;
    rejected: number;
    totalAmount: number;
}
