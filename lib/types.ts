// Type definitions for Next.js 16 Reimbursement System
// Migrated from src/types.ts

// User and Authentication Types
export type UserRole = 'user' | 'head' | 'lead' | 'finance'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  picture?: string
  leadId?: string // For users, reference to their lead
  leadName?: string // For display
}

// Reimbursement Types
export type ReimbursementStatus = 
  | 'pending' 
  | 'approved_by_head' 
  | 'approved_by_lead' 
  | 'approved_by_finance' 
  | 'rejected'

export type ProjectType = 'MaxStream' | 'MyOrbit' | 'Dunia Games'

export interface Reimbursement {
  id: string
  no?: number
  employeeName: string
  employeeEmail: string
  userId: string
  date: string
  amount: number
  description: string
  project: ProjectType
  status: ReimbursementStatus
  receiptImage?: string
  imageUrl?: string
  asset?: string
  createdAt: string
  updatedAt: string
  approvedBy?: {
    head?: string
    lead?: string
    finance?: string
  }
  approvals?: {
    head?: { approved: boolean; by: string; date: string; comment?: string }
    lead?: { approved: boolean; by: string; date: string; comment?: string }
    finance?: { approved: boolean; by: string; date: string; comment?: string; assetMatch?: AssetMatchResult }
  }
  rejectionReason?: string
  leadId?: string // Lead assigned to this user
  leadName?: string // Lead name for display
}

// Legacy ReimbursementData structure (for backward compatibility)
export interface ReimbursementData {
  nama: string
  msisdnEmail: string
  project: ProjectType
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

// Legacy ReimbursementRequest structure (for backward compatibility)
export interface ReimbursementRequest {
  id: string
  no: number
  userId: string
  userName: string
  leadId?: string
  leadName?: string
  submittedDate: string
  data: ReimbursementData
  status: ReimbursementStatus
  imageUrl?: string
  approvals: {
    head?: { approved: boolean; by: string; date: string; comment?: string }
    lead?: { approved: boolean; by: string; date: string; comment?: string }
    finance?: { approved: boolean; by: string; date: string; comment?: string; assetMatch?: AssetMatchResult }
  }
  rejectionReason?: string
}

// Asset Matching Types
export interface AssetMatchResult {
  matched: boolean
  assetId?: string
  assetName?: string
  employeeName?: string
  department?: string
  matchedBy: 'msisdn' | 'email'
  matchedValue: string
  confidence?: number
  verifiedDate: string
}

// Dashboard Types
export interface DashboardStats {
  total: number
  pending: number
  approved: number
  rejected: number
  totalAmount: number
  // Legacy fields for backward compatibility
  totalRequests?: number
  pendingApproval?: number
}

export interface ProjectGroup {
  project: ProjectType
  reimbursements: Reimbursement[]
  totalAmount: number
}

// Application State Types
export type AppState = 'upload' | 'processing' | 'review' | 'success' | 'error'

// Authentication Context Types
export interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isAuthenticated: boolean
}

// Webhook Response Types
export interface OCRResponse {
  success: boolean
  data?: {
    amount?: number
    date?: string
    description?: string
    merchant?: string
  }
  error?: string
}

export interface AssetMatchResponse {
  success: boolean
  data?: AssetMatchResult
  error?: string
}

// Google Sheets Export Types
export interface ExportData {
  Date: string
  Employee: string
  Amount: string
  Description: string
  Project: string
  Status: string
  Asset: string
}
