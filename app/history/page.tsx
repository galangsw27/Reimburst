'use client'

import { HistoryList } from '@/components/HistoryList'
import { useSearchParams } from 'next/navigation'

export default function HistoryPage() {
  const searchParams = useSearchParams()
  const showDownload = searchParams.get('download') === 'true'

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {showDownload ? 'Download Excel' : 'Reimbursement History'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {showDownload 
            ? 'Export approved reimbursements to Excel or Google Sheets'
            : 'View all your reimbursement requests and their status'}
        </p>
      </div>
      <HistoryList showDownload={showDownload} />
    </div>
  )
}
