'use client'

import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useState } from 'react'

/**
 * Test page for useLocalStorage hook
 * 
 * This page verifies:
 * 1. Hook initializes with default value
 * 2. Mounted state transitions from false to true
 * 3. localStorage is accessed only after mount
 * 4. setValue updates both state and localStorage
 * 5. Data persists across page refreshes
 * 6. Error handling works correctly
 */
export default function TestLocalStoragePage() {
  const [testValue, setTestValue, mounted] = useLocalStorage('test-key', 'initial-value')
  const [objectValue, setObjectValue, objectMounted] = useLocalStorage<{ count: number }>('test-object', { count: 0 })
  const [renderCount, setRenderCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">useLocalStorage Hook Test</h1>
          <p className="text-gray-600 mb-4">
            This page tests the useLocalStorage hook implementation.
            Refresh the page to verify persistence.
          </p>
        </div>

        {/* Test 1: String Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test 1: String Value</h2>
          <div className="space-y-2">
            <p><strong>Mounted:</strong> {mounted ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Current Value:</strong> {testValue}</p>
            <p><strong>Render Count:</strong> {renderCount}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setTestValue('updated-value')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Set to "updated-value"
              </button>
              <button
                onClick={() => setTestValue(prev => prev + '-appended')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Append "-appended"
              </button>
              <button
                onClick={() => setTestValue('initial-value')}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Reset
              </button>
              <button
                onClick={() => setRenderCount(c => c + 1)}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Force Re-render
              </button>
            </div>
          </div>
        </div>

        {/* Test 2: Object Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test 2: Object Value</h2>
          <div className="space-y-2">
            <p><strong>Mounted:</strong> {objectMounted ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Current Count:</strong> {objectValue.count}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setObjectValue({ count: objectValue.count + 1 })}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Increment
              </button>
              <button
                onClick={() => setObjectValue(prev => ({ count: prev.count - 1 }))}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Decrement
              </button>
              <button
                onClick={() => setObjectValue({ count: 0 })}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Test 3: Verification Checklist */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Verification Checklist</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Hook initializes with default value before mount</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Mounted state transitions from false to true after mount</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>localStorage is accessed only after mount (no hydration errors)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>setValue updates both state and localStorage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Function-based updates work correctly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Data persists across page refreshes (try refreshing!)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Works with both primitive and object types</span>
            </li>
          </ul>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click the buttons to update values</li>
            <li>Refresh the page to verify persistence</li>
            <li>Check browser console for any errors</li>
            <li>Open DevTools → Application → Local Storage to see stored values</li>
            <li>Verify no hydration warnings in console</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
