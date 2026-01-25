'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { UploadForm } from '@/components/UploadForm'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get project from query param if provided (from project panel)
  const initialProject = searchParams.get('project') || undefined

  const handleSuccess = () => {
    // Redirect to requests page to see the newly added request
    router.push('/requests')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Upload Reimbursement</h1>
            <p className="text-muted-foreground">Upload struk dan ajukan reimbursement Anda</p>
            {initialProject && (
              <p className="text-primary text-sm mt-2">Project: {initialProject}</p>
            )}
          </div>
          
          <UploadForm onSuccess={handleSuccess} initialProject={initialProject} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
