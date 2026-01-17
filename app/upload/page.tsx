'use client'

import { useRouter } from 'next/navigation'
import { UploadForm } from '@/components/UploadForm'

export default function UploadPage() {
  const router = useRouter()

  const handleSuccess = () => {
    // Redirect to dashboard after successful upload
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Upload Reimbursement</h1>
          <p className="text-muted-foreground">Upload struk dan ajukan reimbursement Anda</p>
        </div>
        
        <UploadForm onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
