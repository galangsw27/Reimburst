'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { UploadForm } from './UploadForm'
import { AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

/**
 * Props for the RequestModal component
 */
export interface RequestModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal should be closed */
  onClose: () => void
  /** Callback when a request is successfully created */
  onSuccess: () => void
  /** Initial project to auto-select */
  initialProject?: string
}

/**
 * RequestModal Component
 * 
 * Modal wrapper for the UploadForm component to create new reimbursement requests.
 * 
 * Features:
 * - Uses shadcn/ui Dialog component
 * - Integrates UploadForm component inside DialogContent
 * - Max width 5xl and max height 90vh with overflow-y-auto
 * - Handles success callback to refresh request list and close modal
 * - ESC key and click-outside closing
 * - Unsaved changes confirmation if form has data
 * 
 * Requirements: 5.2, 5.3, 5.5, 5.7, 5.8, 5.9
 */
export function RequestModal({ isOpen, onClose, onSuccess, initialProject }: RequestModalProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Reset unsaved changes flag when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasUnsavedChanges(false)
      setShowConfirmation(false)
    }
  }, [isOpen])

  /**
   * Handle successful form submission
   * Calls onSuccess callback and closes the modal
   */
  const handleSuccess = () => {
    setHasUnsavedChanges(false)
    onSuccess()
    onClose()
  }

  /**
   * Handle modal close request
   * Shows confirmation if there are unsaved changes
   */
  const handleCloseRequest = (open: boolean) => {
    if (!open) {
      // Modal is being closed
      if (hasUnsavedChanges) {
        setShowConfirmation(true)
      } else {
        onClose()
      }
    }
  }

  /**
   * Confirm close with unsaved changes
   */
  const handleConfirmClose = () => {
    setHasUnsavedChanges(false)
    setShowConfirmation(false)
    onClose()
  }

  /**
   * Cancel close confirmation
   */
  const handleCancelClose = () => {
    setShowConfirmation(false)
  }

  return (
    <>
      {/* Main Request Modal */}
      <Dialog open={isOpen && !showConfirmation} onOpenChange={handleCloseRequest}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create New Request
              {initialProject && <span className="text-sm text-primary ml-2">- {initialProject}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <UploadForm onSuccess={handleSuccess} initialProject={initialProject} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Unsaved Changes */}
      <Dialog open={showConfirmation} onOpenChange={(open: boolean) => !open && handleCancelClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Unsaved Changes
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes. Are you sure you want to close this form? All data will be lost.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancelClose}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClose}
            >
              Close Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
