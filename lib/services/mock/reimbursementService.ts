/**
 * Mock Reimbursement Service Implementation
 * 
 * This service provides hardcoded reimbursement data for testing and development without requiring a database.
 * It implements the IReimbursementService interface with in-memory data operations.
 * 
 * Mock Data Structure:
 * - Sample reimbursements for various users
 * - Different statuses (pending, approved_by_head, approved_by_lead, approved_by_finance, rejected)
 * - Various projects (MaxStream, MyOrbit, Dunia Games)
 * 
 * Requirements: 7.3, 9.3
 */

import { Reimbursement } from '@/lib/types';
import {
  IReimbursementService,
  CreateReimbursementInput,
  UpdateReimbursementInput,
  ReimbursementFilters,
} from '../types';

export class MockReimbursementService implements IReimbursementService {
  private reimbursements: Reimbursement[] = [
    // Pending reimbursements
    {
      id: '1',
      no: 1,
      employeeName: 'User One',
      employeeEmail: 'user1@company.com',
      userId: '6',
      date: '2024-01-15',
      amount: 150000,
      description: 'Team lunch meeting',
      project: 'MaxStream',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      leadId: '3',
      leadName: 'Lead One',
    },
    {
      id: '2',
      no: 2,
      employeeName: 'User Two',
      employeeEmail: 'user2@company.com',
      userId: '7',
      date: '2024-01-16',
      amount: 250000,
      description: 'Client meeting expenses',
      project: 'MyOrbit',
      status: 'pending',
      createdAt: '2024-01-16T11:00:00Z',
      updatedAt: '2024-01-16T11:00:00Z',
      leadId: '3',
      leadName: 'Lead One',
    },
    
    // Approved by head
    {
      id: '3',
      no: 3,
      employeeName: 'User Three',
      employeeEmail: 'user3@company.com',
      userId: '8',
      date: '2024-01-10',
      amount: 500000,
      description: 'Conference registration',
      project: 'Dunia Games',
      status: 'approved_by_head',
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-12T14:00:00Z',
      approvedBy: {
        head: 'Head User',
      },
      approvals: {
        head: {
          approved: true,
          by: 'Head User',
          date: '2024-01-12T14:00:00Z',
          comment: 'Approved for conference',
        },
      },
      leadId: '3',
      leadName: 'Lead One',
    },
    
    // Approved by lead
    {
      id: '4',
      no: 4,
      employeeName: 'User Six',
      employeeEmail: 'user6@company.com',
      userId: '11',
      date: '2024-01-12',
      amount: 180000,
      description: 'Office supplies',
      project: 'MaxStream',
      status: 'approved_by_lead',
      createdAt: '2024-01-12T10:00:00Z',
      updatedAt: '2024-01-13T15:00:00Z',
      approvedBy: {
        lead: 'Lead Two',
      },
      approvals: {
        lead: {
          approved: true,
          by: 'Lead Two',
          date: '2024-01-13T15:00:00Z',
          comment: 'Approved',
        },
      },
      leadId: '4',
      leadName: 'Lead Two',
    },
    
    // Approved by finance (fully approved)
    {
      id: '5',
      no: 5,
      employeeName: 'User Ten',
      employeeEmail: 'user10@company.com',
      userId: '15',
      date: '2024-01-05',
      amount: 350000,
      description: 'Travel expenses',
      project: 'MyOrbit',
      status: 'approved_by_finance',
      createdAt: '2024-01-05T08:00:00Z',
      updatedAt: '2024-01-08T16:00:00Z',
      approvedBy: {
        head: 'Head User',
        lead: 'Lead Three',
        finance: 'Finance User',
      },
      approvals: {
        head: {
          approved: true,
          by: 'Head User',
          date: '2024-01-06T10:00:00Z',
          comment: 'Approved',
        },
        lead: {
          approved: true,
          by: 'Lead Three',
          date: '2024-01-07T11:00:00Z',
          comment: 'Approved',
        },
        finance: {
          approved: true,
          by: 'Finance User',
          date: '2024-01-08T16:00:00Z',
          comment: 'Payment processed',
        },
      },
      leadId: '5',
      leadName: 'Lead Three',
    },
    
    // Rejected reimbursement
    {
      id: '6',
      no: 6,
      employeeName: 'User Four',
      employeeEmail: 'user4@company.com',
      userId: '9',
      date: '2024-01-08',
      amount: 1000000,
      description: 'Personal expense',
      project: 'MaxStream',
      status: 'rejected',
      createdAt: '2024-01-08T09:00:00Z',
      updatedAt: '2024-01-09T10:00:00Z',
      rejectionReason: 'Not a valid business expense',
      leadId: '3',
      leadName: 'Lead One',
    },
    
    // More pending reimbursements for variety
    {
      id: '7',
      no: 7,
      employeeName: 'User Seven',
      employeeEmail: 'user7@company.com',
      userId: '12',
      date: '2024-01-18',
      amount: 120000,
      description: 'Software subscription',
      project: 'Dunia Games',
      status: 'pending',
      createdAt: '2024-01-18T13:00:00Z',
      updatedAt: '2024-01-18T13:00:00Z',
      leadId: '4',
      leadName: 'Lead Two',
    },
    {
      id: '8',
      no: 8,
      employeeName: 'User Eleven',
      employeeEmail: 'user11@company.com',
      userId: '16',
      date: '2024-01-20',
      amount: 200000,
      description: 'Marketing materials',
      project: 'MyOrbit',
      status: 'pending',
      createdAt: '2024-01-20T14:00:00Z',
      updatedAt: '2024-01-20T14:00:00Z',
      leadId: '5',
      leadName: 'Lead Three',
    },
  ];

  /**
   * Retrieve reimbursements with optional filtering
   * @param filters - Optional filters to apply to the query
   * @returns Promise resolving to array of reimbursements matching the filters
   */
  async getReimbursements(filters?: ReimbursementFilters): Promise<Reimbursement[]> {
    let result = [...this.reimbursements]; // Return a copy to prevent external modifications

    if (!filters) {
      return result;
    }

    // Apply userId filter
    if (filters.userId) {
      result = result.filter(r => r.userId === filters.userId);
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter(r => r.status === filters.status);
    }

    // Apply date range filters
    if (filters.startDate) {
      result = result.filter(r => r.date >= filters.startDate!);
    }
    if (filters.endDate) {
      result = result.filter(r => r.date <= filters.endDate!);
    }

    // Apply amount range filters
    if (filters.minAmount !== undefined) {
      result = result.filter(r => r.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      result = result.filter(r => r.amount <= filters.maxAmount!);
    }

    return result;
  }

  /**
   * Retrieve a specific reimbursement by ID
   * @param id - The reimbursement ID to look up
   * @returns Promise resolving to the reimbursement or null if not found
   */
  async getReimbursementById(id: string): Promise<Reimbursement | null> {
    const reimbursement = this.reimbursements.find(r => r.id === id);
    return reimbursement ? { ...reimbursement } : null; // Return a copy if found
  }

  /**
   * Create a new reimbursement
   * @param data - The reimbursement data to create
   * @returns Promise resolving to the created reimbursement
   * @throws Error if validation fails
   */
  async createReimbursement(data: CreateReimbursementInput): Promise<Reimbursement> {
    // Validate amount is positive
    if (data.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Generate new ID and number
    const newId = String(this.reimbursements.length + 1);
    const newNo = this.reimbursements.length + 1;

    // Get current timestamp
    const now = new Date().toISOString();

    // Create new reimbursement
    const newReimbursement: Reimbursement = {
      id: newId,
      no: newNo,
      employeeName: '', // Will be populated from user lookup in real implementation
      employeeEmail: '', // Will be populated from user lookup in real implementation
      userId: data.userId,
      date: data.date || new Date().toISOString().split('T')[0],
      amount: data.amount,
      description: data.description,
      project: (data.project as any) || 'MaxStream',
      status: 'pending',
      receiptImage: data.receiptImage,
      createdAt: now,
      updatedAt: now,
    };

    this.reimbursements.push(newReimbursement);
    return { ...newReimbursement };
  }

  /**
   * Update an existing reimbursement
   * @param id - The reimbursement ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated reimbursement
   * @throws Error if reimbursement not found or validation fails
   */
  async updateReimbursement(
    id: string,
    data: UpdateReimbursementInput
  ): Promise<Reimbursement> {
    const index = this.reimbursements.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error('Reimbursement not found');
    }

    // Validate amount if provided
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Start with current reimbursement data
    const updatedReimbursement: Reimbursement = { ...this.reimbursements[index] };

    // Update fields that are provided
    if (data.amount !== undefined) {
      updatedReimbursement.amount = data.amount;
    }
    if (data.description !== undefined) {
      updatedReimbursement.description = data.description;
    }
    if (data.status !== undefined) {
      updatedReimbursement.status = data.status;
    }
    if (data.approvalDate !== undefined) {
      // Store approval date in approvals structure based on status
      if (!updatedReimbursement.approvals) {
        updatedReimbursement.approvals = {};
      }
    }
    if (data.rejectionReason !== undefined) {
      updatedReimbursement.rejectionReason = data.rejectionReason;
    }
    if (data.approvedBy !== undefined) {
      updatedReimbursement.approvedBy = {
        ...updatedReimbursement.approvedBy,
        ...data.approvedBy,
      };
    }

    // Update timestamp
    updatedReimbursement.updatedAt = new Date().toISOString();

    this.reimbursements[index] = updatedReimbursement;
    return { ...updatedReimbursement };
  }
}
