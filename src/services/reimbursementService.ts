import { ReimbursementRequest, ReimbursementStatus, ReimbursementData, AssetMatchResult } from '../types';
import { getCurrentProject } from './googleSheetsService';

const STORAGE_KEY = 'reimbursement_requests';

// Get all reimbursement requests from localStorage
export const getAllRequests = (): ReimbursementRequest[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

// Save requests to localStorage
const saveRequests = (requests: ReimbursementRequest[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
};

// Create new reimbursement request
export const createRequest = (
    userId: string,
    userName: string,
    data: ReimbursementData,
    imageUrl?: string
): ReimbursementRequest => {
    const requests = getAllRequests();
    const newRequest: ReimbursementRequest = {
        id: `REQ-${Date.now()}`,
        no: requests.length + 1,
        userId,
        userName,
        submittedDate: new Date().toISOString(),
        data,
        status: 'pending',
        imageUrl,
        approvals: {},
    };
    
    requests.push(newRequest);
    saveRequests(requests);
    return newRequest;
};

// Get requests by user ID
export const getRequestsByUser = (userId: string): ReimbursementRequest[] => {
    return getAllRequests().filter(req => req.userId === userId);
};

// Get pending requests for approval
export const getPendingRequests = (role: 'head' | 'lead' | 'finance'): ReimbursementRequest[] => {
    const requests = getAllRequests();
    
    if (role === 'head' || role === 'lead') {
        return requests.filter(req => 
            req.status === 'pending' || 
            (req.status === 'approved_head' && role === 'lead' && !req.approvals.lead) ||
            (req.status === 'approved_lead' && role === 'head' && !req.approvals.head)
        );
    }
    
    if (role === 'finance') {
        return requests.filter(req => 
            (req.status === 'approved_head' && req.approvals.head) ||
            (req.status === 'approved_lead' && req.approvals.lead)
        );
    }
    
    return [];
};

// Approve request
export const approveRequest = (
    requestId: string,
    role: 'head' | 'lead' | 'finance',
    approverName: string,
    comment?: string,
    assetMatch?: AssetMatchResult
): ReimbursementRequest | null => {
    const requests = getAllRequests();
    const request = requests.find(req => req.id === requestId);
    
    if (!request) return null;
    
    const approval = {
        approved: true,
        by: approverName,
        date: new Date().toISOString(),
        comment,
        ...(role === 'finance' && assetMatch ? { assetMatch } : {})
    };
    
    if (role === 'head') {
        request.approvals.head = approval;
        // Check if lead also approved
        if (request.approvals.lead) {
            request.status = 'approved_lead';
        } else {
            request.status = 'approved_head';
        }
    } else if (role === 'lead') {
        request.approvals.lead = approval;
        // Check if head also approved
        if (request.approvals.head) {
            request.status = 'approved_head';
        } else {
            request.status = 'approved_lead';
        }
    } else if (role === 'finance') {
        request.approvals.finance = approval as any;
        request.status = 'approved_finance';
    }
    
    saveRequests(requests);
    return request;
};

// Reject request
export const rejectRequest = (
    requestId: string,
    role: 'head' | 'lead' | 'finance',
    approverName: string,
    reason: string
): ReimbursementRequest | null => {
    const requests = getAllRequests();
    const request = requests.find(req => req.id === requestId);
    
    if (!request) return null;
    
    request.status = 'rejected';
    request.rejectionReason = reason;
    request.approvals[role] = {
        approved: false,
        by: approverName,
        date: new Date().toISOString(),
        comment: reason,
    };
    
    saveRequests(requests);
    return request;
};

// Get approved requests (for finance to download)
export const getApprovedRequests = (): ReimbursementRequest[] => {
    return getAllRequests().filter(req => req.status === 'approved_finance');
};

// Export to Excel format (returns CSV data)
export const exportToExcel = (requests: ReimbursementRequest[]): string => {
    const headers = [
        'No', 'Request ID', 'Submitted By', 'Nama', 'MSISDN/Email', 
        'Date', 'Time', 'TRX ID', 'Transaction', 'Payment Type', 
        'Amount', 'B.Admin', 'B.Kirim', 'B.Layanan', 'Diskon', 
        'Login Status', 'Total', 'By', 'Remark',
        'Status', 'Approved By Head', 'Approved By Lead', 'Approved By Finance',
        'Asset Matched', 'Asset ID', 'Employee Name', 'Department'
    ];
    
    const rows = requests.map(req => [
        req.no,
        req.id,
        req.userName,
        req.data.nama,
        req.data.msisdnEmail,
        req.data.tgl,
        req.data.time,
        req.data.trxId,
        req.data.transaksi,
        req.data.paymentType,
        req.data.amount,
        req.data.bAdmin,
        req.data.bKirim,
        req.data.bLayanan,
        req.data.diskon,
        req.data.loginStatus,
        req.data.total,
        req.data.by,
        req.data.remark,
        req.status,
        req.approvals.head?.by || '-',
        req.approvals.lead?.by || '-',
        req.approvals.finance?.by || '-',
        req.approvals.finance?.assetMatch?.matched ? 'Yes' : 'No',
        req.approvals.finance?.assetMatch?.assetId || '-',
        req.approvals.finance?.assetMatch?.employeeName || '-',
        req.approvals.finance?.assetMatch?.department || '-',
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
};

// Get dashboard statistics
export const getDashboardStats = (userId?: string) => {
    const requests = userId ? getRequestsByUser(userId) : getAllRequests();
    
    return {
        totalRequests: requests.length,
        pendingApproval: requests.filter(r => r.status === 'pending' || r.status === 'approved_head' || r.status === 'approved_lead').length,
        approved: requests.filter(r => r.status === 'approved_finance').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        totalAmount: requests.reduce((sum, r) => sum + r.data.total, 0),
    };
};


// AI Agent Asset Matching via n8n Webhook
export const matchAssetWithAI = async (msisdnEmail: string): Promise<AssetMatchResult> => {
    const ASSET_MATCH_WEBHOOK_URL = import.meta.env.VITE_ASSET_MATCH_WEBHOOK_URL || '';
    
    if (!ASSET_MATCH_WEBHOOK_URL) {
        console.warn('VITE_ASSET_MATCH_WEBHOOK_URL not configured, using mock data');
        return mockAssetMatch(msisdnEmail);
    }
    
    try {
        const response = await fetch(ASSET_MATCH_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                msisdn_email: msisdnEmail,
                timestamp: new Date().toISOString(),
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse response from n8n
        // Expected format:
        // {
        //   "matched": true/false,
        //   "asset_id": "AST-001",
        //   "asset_name": "Laptop Dell",
        //   "employee_name": "John Doe",
        //   "department": "IT",
        //   "confidence": 0.95
        // }
        
        const isMSISDN = /^(\+62|62|0)8[1-9][0-9]{6,9}$/.test(msisdnEmail);
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msisdnEmail);
        
        return {
            matched: data.matched || false,
            assetId: data.asset_id || undefined,
            assetName: data.asset_name || undefined,
            employeeName: data.employee_name || undefined,
            department: data.department || undefined,
            matchedBy: isMSISDN ? 'msisdn' : 'email',
            matchedValue: msisdnEmail,
            confidence: data.confidence || 0,
            verifiedDate: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Asset matching error:', error);
        // Fallback to mock if webhook fails
        return mockAssetMatch(msisdnEmail);
    }
};

// Mock asset matching (fallback when webhook not configured)
const mockAssetMatch = (msisdnEmail: string): AssetMatchResult => {
    const isMSISDN = /^(\+62|62|0)8[1-9][0-9]{6,9}$/.test(msisdnEmail);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msisdnEmail);
    
    // Mock database lookup
    const mockDatabase: Record<string, { assetId: string; name: string; department: string }> = {
        '081234567890': { assetId: 'AST-001', name: 'John Doe', department: 'IT' },
        '081234567891': { assetId: 'AST-002', name: 'Jane Smith', department: 'Finance' },
        '081234567892': { assetId: 'AST-003', name: 'Bob Johnson', department: 'Marketing' },
        'john@company.com': { assetId: 'AST-001', name: 'John Doe', department: 'IT' },
        'jane@company.com': { assetId: 'AST-002', name: 'Jane Smith', department: 'Finance' },
        'bob@company.com': { assetId: 'AST-003', name: 'Bob Johnson', department: 'Marketing' },
    };
    
    const normalizedKey = msisdnEmail.replace(/^(\+62|62)/, '0');
    const match = mockDatabase[normalizedKey] || mockDatabase[msisdnEmail];
    
    if (match) {
        return {
            matched: true,
            assetId: match.assetId,
            assetName: `Asset ${match.assetId}`,
            employeeName: match.name,
            department: match.department,
            matchedBy: isMSISDN ? 'msisdn' : 'email',
            matchedValue: msisdnEmail,
            confidence: 0.95,
            verifiedDate: new Date().toISOString(),
        };
    }
    
    return {
        matched: false,
        matchedBy: isMSISDN ? 'msisdn' : 'email',
        matchedValue: msisdnEmail,
        confidence: 0,
        verifiedDate: new Date().toISOString(),
    };
};

