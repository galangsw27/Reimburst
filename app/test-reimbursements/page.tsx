'use client'

import { useReimbursements } from '@/lib/hooks/useReimbursements'
import { Reimbursement } from '@/lib/types'
import { useState } from 'react'

/**
 * Test page for useReimbursements hook
 * 
 * This page demonstrates and tests all functionality of the useReimbursements hook:
 * - Adding reimbursements
 * - Updating reimbursements
 * - Deleting reimbursements
 * - Querying by status
 * - Querying by project
 * - Hydration safety (mounted flag)
 */
export default function TestReimbursementsPage() {
  const {
    reimbursements,
    addReimbursement,
    updateReimbursement,
    deleteReimbursement,
    getByStatus,
    getByProject,
    mounted,
  } = useReimbursements()

  const [selectedStatus, setSelectedStatus] = useState<string>('pending')
  const [selectedProject, setSelectedProject] = useState<string>('MaxStream')

  // Create a test reimbursement
  const createTestReimbursement = (): Reimbursement => ({
    id: `test-${Date.now()}`,
    employeeName: 'Test User',
    employeeEmail: 'test@example.com',
    userId: 'test-user-id',
    date: new Date().toISOString().split('T')[0],
    amount: Math.floor(Math.random() * 500) + 50,
    description: 'Test expense for verification',
    project: selectedProject as any,
    status: selectedStatus as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const handleAddReimbursement = () => {
    const newReimbursement = createTestReimbursement()
    addReimbursement(newReimbursement)
  }

  const handleUpdateFirst = () => {
    if (reimbursements.length > 0) {
      updateReimbursement(reimbursements[0].id, {
        amount: 999,
        description: 'Updated test expense',
      })
    }
  }

  const handleDeleteFirst = () => {
    if (reimbursements.length > 0) {
      deleteReimbursement(reimbursements[0].id)
    }
  }

  const handleClearAll = () => {
    reimbursements.forEach(r => deleteReimbursement(r.id))
  }

  const pendingReimbursements = getByStatus('pending')
  const approvedReimbursements = getByStatus('approved_by_head')
  const maxstreamReimbursements = getByProject('MaxStream')
  const myorbitReimbursements = getByProject('MyOrbit')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">useReimbursements Hook Test Page</h1>

        {/* Hydration Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Hydration Status</h2>
          <div className="flex items-center gap-4">
            <span className="font-medium">Mounted:</span>
            <span className={`px-3 py-1 rounded ${mounted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {mounted ? 'Yes ✓' : 'No (Loading...)'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            The mounted flag ensures localStorage is only accessed after hydration completes.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status for new reimbursement:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="pending">Pending</option>
                <option value="approved_by_head">Approved by Head</option>
                <option value="approved_by_lead">Approved by Lead</option>
                <option value="approved_by_finance">Approved by Finance</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Project for new reimbursement:</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="MaxStream">MaxStream</option>
                <option value="MyOrbit">MyOrbit</option>
                <option value="Dunia Games">Dunia Games</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAddReimbursement}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Reimbursement
            </button>
            <button
              onClick={handleUpdateFirst}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={reimbursements.length === 0}
            >
              Update First
            </button>
            <button
              onClick={handleDeleteFirst}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              disabled={reimbursements.length === 0}
            >
              Delete First
            </button>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              disabled={reimbursements.length === 0}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{reimbursements.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{pendingReimbursements.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Approved (Head)</div>
            <div className="text-2xl font-bold text-green-600">{approvedReimbursements.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-2xl font-bold">
              ${reimbursements.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Query Results */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">MaxStream Project</h3>
            <div className="text-2xl font-bold text-blue-600">{maxstreamReimbursements.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">MyOrbit Project</h3>
            <div className="text-2xl font-bold text-purple-600">{myorbitReimbursements.length}</div>
          </div>
        </div>

        {/* All Reimbursements */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">All Reimbursements ({reimbursements.length})</h2>
          
          {reimbursements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No reimbursements yet. Click "Add Reimbursement" to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">ID</th>
                    <th className="text-left py-2 px-3">Employee</th>
                    <th className="text-left py-2 px-3">Amount</th>
                    <th className="text-left py-2 px-3">Description</th>
                    <th className="text-left py-2 px-3">Project</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursements.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs font-mono">{r.id.slice(0, 12)}...</td>
                      <td className="py-2 px-3">{r.employeeName}</td>
                      <td className="py-2 px-3 font-semibold">${r.amount}</td>
                      <td className="py-2 px-3">{r.description}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {r.project}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Test Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Test Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Verify "Mounted" shows "Yes ✓" after page loads (hydration safety)</li>
            <li>Click "Add Reimbursement" multiple times with different statuses and projects</li>
            <li>Verify statistics update correctly (Total, Pending, Approved counts)</li>
            <li>Verify project counts update correctly (MaxStream, MyOrbit)</li>
            <li>Click "Update First" to modify the first reimbursement</li>
            <li>Click "Delete First" to remove the first reimbursement</li>
            <li>Refresh the page and verify data persists (localStorage integration)</li>
            <li>Click "Clear All" to reset the test data</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
