/**
 * Tests for reimbursementService
 * 
 * This file contains unit tests for the reimbursement service functionality.
 * Tests cover:
 * - Receipt processing via OCR webhook
 * - Asset matching via AI webhook
 * - Project-specific webhook submissions
 * - Approval workflow status updates
 * 
 * Requirements: 7.1, 7.2, 9.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import {
  processReceipt,
  matchAsset,
  submitToProject,
  updateStatus,
  reimbursementService,
} from './reimbursementService'
import { Reimbursement, ReimbursementStatus } from '@/lib/types'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('reimbursementService', () => {
  // Store original env vars
  const originalEnv = process.env

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Set up test environment variables
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_WEBHOOK_URL: 'https://test.com/webhook/ocr',
      NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL: 'https://test.com/webhook/asset',
      NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL: 'https://test.com/webhook/maxstream',
      NEXT_PUBLIC_MYORBIT_WEBHOOK_URL: 'https://test.com/webhook/myorbit',
      NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL: 'https://test.com/webhook/duniagames',
    }
  })

  afterEach(() => {
    // Restore original env vars
    process.env = originalEnv
  })

  describe('processReceipt', () => {
    it('should successfully process a receipt image', async () => {
      const mockResponse = {
        data: {
          amount: 50000,
          date: '2024-01-15',
          description: 'Office supplies',
          merchant: 'Stationery Store',
        },
      }

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANS...'
      const result = await processReceipt(imageBase64)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse.data)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/ocr',
        { image: imageBase64 }
      )
    })

    it('should handle OCR webhook errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const result = await processReceipt('invalid-image')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should throw error when NEXT_PUBLIC_WEBHOOK_URL is not configured', async () => {
      delete process.env.NEXT_PUBLIC_WEBHOOK_URL

      const result = await processReceipt('test-image')

      expect(result.success).toBe(false)
      expect(result.error).toContain('NEXT_PUBLIC_WEBHOOK_URL is not configured')
    })

    it('should handle unknown errors', async () => {
      mockedAxios.post.mockRejectedValueOnce('String error')

      const result = await processReceipt('test-image')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error occurred')
    })
  })

  describe('matchAsset', () => {
    it('should successfully match an asset', async () => {
      const mockResponse = {
        data: {
          matched: true,
          assetId: 'ASSET-001',
          assetName: 'Company Laptop',
          employeeName: 'John Doe',
          department: 'Engineering',
          matchedBy: 'email' as const,
          matchedValue: 'john@company.com',
          confidence: 0.95,
          verifiedDate: '2024-01-15T10:00:00Z',
        },
      }

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      const result = await matchAsset('Laptop repair for john@company.com')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse.data)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/asset',
        { description: 'Laptop repair for john@company.com' }
      )
    })

    it('should handle asset matching errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Asset not found'))

      const result = await matchAsset('Unknown asset')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Asset not found')
    })

    it('should throw error when NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL is not configured', async () => {
      delete process.env.NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL

      const result = await matchAsset('test description')

      expect(result.success).toBe(false)
      expect(result.error).toContain('NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL is not configured')
    })
  })

  describe('submitToProject', () => {
    const mockReimbursement: Reimbursement = {
      id: 'reimb-001',
      employeeName: 'John Doe',
      employeeEmail: 'john@company.com',
      userId: 'user-001',
      date: '2024-01-15',
      amount: 50000,
      description: 'Office supplies',
      project: 'MaxStream',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    }

    it('should submit to MaxStream webhook', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      await submitToProject(mockReimbursement, 'MaxStream')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/maxstream',
        mockReimbursement
      )
    })

    it('should submit to MyOrbit webhook', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      await submitToProject(mockReimbursement, 'MyOrbit')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/myorbit',
        mockReimbursement
      )
    })

    it('should submit to DuniaGames webhook', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      await submitToProject(mockReimbursement, 'Dunia Games')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/duniagames',
        mockReimbursement
      )
    })

    it('should handle case-insensitive project names', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      await submitToProject(mockReimbursement, 'MAXSTREAM')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/maxstream',
        mockReimbursement
      )
    })

    it('should handle project names with spaces', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      await submitToProject(mockReimbursement, 'Dunia Games')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/duniagames',
        mockReimbursement
      )
    })

    it('should throw error for unconfigured project webhook', async () => {
      await expect(
        submitToProject(mockReimbursement, 'UnknownProject')
      ).rejects.toThrow('Webhook URL not configured for project: UnknownProject')
    })

    it('should throw error when project webhook URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL

      await expect(
        submitToProject(mockReimbursement, 'MaxStream')
      ).rejects.toThrow('Webhook URL not configured for project: MaxStream')
    })

    it('should handle webhook submission errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(
        submitToProject(mockReimbursement, 'MaxStream')
      ).rejects.toThrow('Project submission failed: Network timeout')
    })
  })

  describe('updateStatus', () => {
    const mockReimbursements: Reimbursement[] = [
      {
        id: 'reimb-001',
        employeeName: 'John Doe',
        employeeEmail: 'john@company.com',
        userId: 'user-001',
        date: '2024-01-15',
        amount: 50000,
        description: 'Office supplies',
        project: 'MaxStream',
        status: 'pending',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'reimb-002',
        employeeName: 'Jane Smith',
        employeeEmail: 'jane@company.com',
        userId: 'user-002',
        date: '2024-01-16',
        amount: 75000,
        description: 'Travel expenses',
        project: 'MyOrbit',
        status: 'pending',
        createdAt: '2024-01-16T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
      },
    ]

    it('should update status of a specific reimbursement', () => {
      const result = updateStatus(mockReimbursements, 'reimb-001', 'approved_by_head')

      expect(result[0].status).toBe('approved_by_head')
      expect(result[0].updatedAt).not.toBe('2024-01-15T10:00:00Z')
      expect(result[1].status).toBe('pending') // Other reimbursement unchanged
    })

    it('should update updatedAt timestamp', () => {
      const beforeUpdate = new Date().toISOString()
      const result = updateStatus(mockReimbursements, 'reimb-001', 'approved_by_lead')
      const afterUpdate = new Date().toISOString()

      expect(result[0].updatedAt >= beforeUpdate).toBe(true)
      expect(result[0].updatedAt <= afterUpdate).toBe(true)
    })

    it('should handle approval workflow transitions', () => {
      let result = mockReimbursements

      // pending → approved_by_head
      result = updateStatus(result, 'reimb-001', 'approved_by_head')
      expect(result[0].status).toBe('approved_by_head')

      // approved_by_head → approved_by_lead
      result = updateStatus(result, 'reimb-001', 'approved_by_lead')
      expect(result[0].status).toBe('approved_by_lead')

      // approved_by_lead → approved_by_finance
      result = updateStatus(result, 'reimb-001', 'approved_by_finance')
      expect(result[0].status).toBe('approved_by_finance')
    })

    it('should handle rejection status', () => {
      const result = updateStatus(mockReimbursements, 'reimb-001', 'rejected')

      expect(result[0].status).toBe('rejected')
    })

    it('should not modify original array', () => {
      const originalStatus = mockReimbursements[0].status
      updateStatus(mockReimbursements, 'reimb-001', 'approved_by_head')

      expect(mockReimbursements[0].status).toBe(originalStatus)
    })

    it('should return unchanged array when ID not found', () => {
      const result = updateStatus(mockReimbursements, 'non-existent-id', 'approved_by_head')

      expect(result).toEqual(mockReimbursements)
    })

    it('should preserve all other reimbursement fields', () => {
      const result = updateStatus(mockReimbursements, 'reimb-001', 'approved_by_head')

      expect(result[0].id).toBe(mockReimbursements[0].id)
      expect(result[0].employeeName).toBe(mockReimbursements[0].employeeName)
      expect(result[0].amount).toBe(mockReimbursements[0].amount)
      expect(result[0].description).toBe(mockReimbursements[0].description)
    })
  })

  describe('reimbursementService object', () => {
    it('should export all service methods', () => {
      expect(reimbursementService.processReceipt).toBeDefined()
      expect(reimbursementService.matchAsset).toBeDefined()
      expect(reimbursementService.submitToProject).toBeDefined()
      expect(reimbursementService.updateStatus).toBeDefined()
    })

    it('should have correct method signatures', () => {
      expect(typeof reimbursementService.processReceipt).toBe('function')
      expect(typeof reimbursementService.matchAsset).toBe('function')
      expect(typeof reimbursementService.submitToProject).toBe('function')
      expect(typeof reimbursementService.updateStatus).toBe('function')
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle empty string for processReceipt', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} })

      const result = await processReceipt('')

      expect(result.success).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/ocr',
        { image: '' }
      )
    })

    it('should handle empty string for matchAsset', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} })

      const result = await matchAsset('')

      expect(result.success).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/webhook/asset',
        { description: '' }
      )
    })

    it('should handle empty reimbursements array in updateStatus', () => {
      const result = updateStatus([], 'reimb-001', 'approved_by_head')

      expect(result).toEqual([])
    })

    it('should handle multiple status updates on same reimbursement', () => {
      const reimbursements: Reimbursement[] = [
        {
          id: 'reimb-001',
          employeeName: 'John Doe',
          employeeEmail: 'john@company.com',
          userId: 'user-001',
          date: '2024-01-15',
          amount: 50000,
          description: 'Test',
          project: 'MaxStream',
          status: 'pending',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
      ]

      let result = reimbursements
      result = updateStatus(result, 'reimb-001', 'approved_by_head')
      result = updateStatus(result, 'reimb-001', 'approved_by_lead')
      result = updateStatus(result, 'reimb-001', 'approved_by_finance')

      expect(result[0].status).toBe('approved_by_finance')
    })
  })
})
