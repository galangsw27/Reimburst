'use client'

import React, { useState } from 'react'
import { RequestTable } from './RequestTable'
import { Reimbursement } from '@/lib/types'

/**
 * Example usage of the RequestTable component
 * This demonstrates how to use the RequestTable with sample data
 */
export default function RequestTableExample() {
  const [selectedRequest, setSelectedRequest] = useState<Reimbursement | null>(null)

  // Sample data
  const sampleRequests: Reimbursement[] = [
    {
      id: 'REQ-001',
      no: 1,
      employeeName: 'John Doe',
      employeeEmail: 'john@example.com',
      userId: 'user-1',
      date: '2024-01-15',
      amount: 150000,
      description: 'Office supplies purchase for Q1 2024',
      project: 'MaxStream',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'REQ-002',
      no: 2,
      employeeName: 'Jane Smith',
      employeeEmail: 'jane@example.com',
      userId: 'user-2',
      date: '2024-01-20',
      amount: 250000,
      description: 'Client meeting expenses - lunch and transportation',
      project: 'MyOrbit',
      status: 'approved_by_head',
      createdAt: '2024-01-20T10:00:00Z',
      updatedAt: '2024-01-20T10:00:00Z',
      approvedBy: {
        head: 'manager@example.com',
      },
    },
    {
      id: 'REQ-003',
      no: 3,
      employeeName: 'Bob Johnson',
      employeeEmail: 'bob@example.com',
      userId: 'user-3',
      date: '2024-01-25',
      amount: 500000,
      description: 'Travel reimbursement - Jakarta to Surabaya',
      project: 'Dunia Games',
      status: 'approved_by_finance',
      createdAt: '2024-01-25T10:00:00Z',
      updatedAt: '2024-01-25T10:00:00Z',
      approvedBy: {
        head: 'manager@example.com',
        lead: 'lead@example.com',
        finance: 'finance@example.com',
      },
    },
    {
      id: 'REQ-004',
      no: 4,
      employeeName: 'Alice Brown',
      employeeEmail: 'alice@example.com',
      userId: 'user-4',
      date: '2024-01-10',
      amount: 75000,
      description: 'Software subscription - Adobe Creative Cloud',
      project: 'MaxStream',
      status: 'rejected',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z',
      rejectionReason: 'Duplicate request',
    },
    {
      id: 'REQ-005',
      no: 5,
      employeeName: 'Charlie Wilson',
      employeeEmail: 'charlie@example.com',
      userId: 'user-5',
      date: '2024-01-18',
      amount: 320000,
      description: 'Team building event expenses',
      project: 'MyOrbit',
      status: 'approved_by_lead',
      createdAt: '2024-01-18T10:00:00Z',
      updatedAt: '2024-01-18T10:00:00Z',
      approvedBy: {
        head: 'manager@example.com',
        lead: 'lead@example.com',
      },
    },
  ]

  const handleViewDetail = (request: Reimbursement) => {
    setSelectedRequest(request)
    console.log('View detail for request:', request.id)
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">RequestTable Component Example</h1>
        <p className="text-muted-foreground">
          This example demonstrates the RequestTable component with sample reimbursement data.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Basic Usage</h2>
        <RequestTable
          requests={sampleRequests}
          onViewDetail={handleViewDetail}
        />
      </div>

      {selectedRequest && (
        <div className="p-4 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-semibold mb-2">Selected Request Details</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="font-medium">Request ID:</dt>
            <dd>{selectedRequest.id}</dd>
            <dt className="font-medium">Employee:</dt>
            <dd>{selectedRequest.employeeName}</dd>
            <dt className="font-medium">Email:</dt>
            <dd>{selectedRequest.employeeEmail}</dd>
            <dt className="font-medium">Project:</dt>
            <dd>{selectedRequest.project}</dd>
            <dt className="font-medium">Amount:</dt>
            <dd>Rp {selectedRequest.amount.toLocaleString('id-ID')}</dd>
            <dt className="font-medium">Status:</dt>
            <dd>{selectedRequest.status}</dd>
            <dt className="font-medium">Description:</dt>
            <dd className="col-span-2">{selectedRequest.description}</dd>
          </dl>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Loading State</h2>
        <RequestTable
          requests={[]}
          onViewDetail={handleViewDetail}
          loading={true}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Empty State</h2>
        <RequestTable
          requests={[]}
          onViewDetail={handleViewDetail}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Features</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Columns:</strong> Request ID, Employee, Subject, Status, Date, Amount, Actions
          </li>
          <li>
            <strong>Status Badges:</strong> Color-coded badges for different approval statuses
          </li>
          <li>
            <strong>Amount Formatting:</strong> Indonesian Rupiah format (Rp X,XXX)
          </li>
          <li>
            <strong>Date Formatting:</strong> DD/MM/YYYY format
          </li>
          <li>
            <strong>Default Sorting:</strong> Sorted by date descending (newest first)
          </li>
          <li>
            <strong>View Detail Button:</strong> Each row has a button to view full details
          </li>
          <li>
            <strong>Keyboard Navigation:</strong> Use arrow keys to navigate, Enter to view details
          </li>
          <li>
            <strong>Responsive:</strong> Horizontal scroll on mobile devices
          </li>
        </ul>
      </div>
    </div>
  )
}
