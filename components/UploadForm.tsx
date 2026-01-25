'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle2, AlertCircle, Loader2, Send, X, Database } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useReimbursements } from '@/lib/hooks/useReimbursements'
import { invalidateReimbursementsCache } from '@/lib/hooks/useReimbursements'
import { useAuth } from '@/providers/AuthProvider'
import { reimbursementService } from '@/lib/services/reimbursementService'
import { ReimbursementData, Reimbursement, AppState, ProjectType, AssetMatchResult, FileDocument, Project } from '@/lib/types'
import { apiClient } from '@/lib/api/client'

interface UploadFormProps {
  onSuccess: () => void
  initialProject?: string // Auto-select project from parent
}

export const UploadForm: React.FC<UploadFormProps> = ({ onSuccess, initialProject }) => {
  const { user } = useAuth()
  const { addReimbursement } = useReimbursements()
  
  const [state, setState] = useState<AppState>('upload')
  const [data, setData] = useState<ReimbursementData>({
    nama: '',
    msisdnEmail: '',
    project: 'MaxStream',
    tgl: '', time: '', trxId: '', transaksi: '', paymentType: '',
    amount: 0, bAdmin: 0, bKirim: 0, bLayanan: 0, diskon: 0,
    loginStatus: 'Login', total: 0, by: '', remark: ''
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [isCheckingAsset, setIsCheckingAsset] = useState(false)
  const [assetCheckResult, setAssetCheckResult] = useState<AssetMatchResult | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<FileDocument[]>([])
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load available projects from database
  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true)
        const response = await apiClient.get('/api/projects?status=ACTIVE')
        const projects = response.data as Project[]
        setAvailableProjects(projects)
        
        // Set default project based on initialProject prop or first available
        if (initialProject && projects.some(p => p.name === initialProject)) {
          setData(prev => ({ ...prev, project: initialProject as ProjectType }))
        } else if (projects.length > 0 && !data.project) {
          setData(prev => ({ ...prev, project: projects[0].name as ProjectType }))
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
        setValidationErrors(prev => [...prev, 'Failed to load available projects'])
        // Fallback to hardcoded projects
        setAvailableProjects([
          { id: '1', projectId: '5-002-079', name: 'MaxStream', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', projectId: '5-002-080', name: 'MyOrbit', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
          { id: '3', projectId: '5-002-081', name: 'Dunia Games', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() }
        ])
      } finally {
        setIsLoadingProjects(false)
      }
    }

    loadProjects()
  }, [initialProject]) // Add initialProject as dependency

  // Image file validation
  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.' }
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return { valid: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' }
    }

    return { valid: true }
  }

  // Enhanced file validation with FileService API integration
  const validateFileForUpload = async (file: File, requestId: string): Promise<{ valid: boolean; error?: string }> => {
    // Basic file validation
    const basicValidation = validateImageFile(file)
    if (!basicValidation.valid) {
      return basicValidation
    }

    try {
      // Check with FileService API for anti-duplication
      const response = await apiClient.post('/api/files/validate', {
        requestId,
        fileName: file.name
      })
      
      if (!response.data.valid) {
        return { 
          valid: false, 
          error: response.data.error || 'File tidak valid untuk diupload.' 
        }
      }

      return { valid: true }
    } catch (error) {
      console.error('File validation error:', error)
      return { 
        valid: false, 
        error: 'Gagal memvalidasi file. Silakan coba lagi.' 
      }
    }
  }

  // Convert image to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setState('processing')
    setError(null)
    setCurrentFile(file)

    try {
      // Generate request ID for this upload session
      const requestId = `REQ-${Date.now()}`

      // Enhanced file validation with FileService integration
      const validation = await validateFileForUpload(file, requestId)
      if (!validation.valid) {
        setError(validation.error || 'File tidak valid')
        setState('error')
        return
      }

      // Convert to base64 for preview only
      const base64Image = await convertToBase64(file)
      setPreviewUrl(base64Image)

      // Upload file using FileService API with auto-rename and anti-duplication
      const formData = new FormData()
      formData.append('file', file)
      formData.append('requestId', requestId)

      const uploadResponse = await apiClient.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const fileDocument = uploadResponse.data as FileDocument

      // Store uploaded file metadata
      setUploadedFiles([fileDocument])

      // Process receipt with OCR webhook - send file directly
      const ocrResponse = await reimbursementService.processReceipt(file)

      if (!ocrResponse.success || !ocrResponse.data) {
        throw new Error(ocrResponse.error || 'OCR processing failed')
      }

      const responseData = ocrResponse.data as any

      // Parse OCR response data
      const parseJsonData = (data: unknown): Record<string, unknown> => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return data as Record<string, unknown>
        }
        if (typeof data === 'string') {
          let jsonString = data.trim()
          // Remove markdown code blocks
          if (jsonString.includes('```')) {
            jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
          }
          // Remove escaped newlines and extra spaces
          jsonString = jsonString.replace(/\\n/g, '').replace(/\s+/g, ' ')
          try {
            const parsed = JSON.parse(jsonString)
            return typeof parsed === 'object' ? parsed : {}
          } catch (e) {
            console.error('JSON parse error:', e)
            return {}
          }
        }
        return {}
      }

      let extracted: Record<string, unknown>
      // Check if data is wrapped in a "data" field
      if (responseData.data !== undefined) {
        extracted = parseJsonData(responseData.data)
      } else if (responseData.success && responseData.message) {
        extracted = parseJsonData(responseData)
      } else {
        extracted = parseJsonData(responseData)
      }

      // Helper functions for parsing
      const parseNumber = (val: unknown): number => {
        if (val === undefined || val === null || val === '') return 0
        if (typeof val === 'number') return val
        
        let strVal = String(val).trim()
        strVal = strVal.replace(/Rp\.?/gi, '').trim()
        
        const isNegative = strVal.startsWith('-')
        if (isNegative) {
          strVal = strVal.substring(1).trim()
        }
        
        const cleanVal = strVal.replace(/\./g, '').replace(/,/g, '.')
        const parsed = parseFloat(cleanVal)
        const result = isNaN(parsed) ? 0 : parsed
        
        return isNegative ? -result : result
      }

      const getString = (val: unknown): string => {
        if (val === undefined || val === null) return ''
        return String(val).trim()
      }

      const parseDate = (val: unknown): string => {
        if (val === undefined || val === null || val === '') return ''
        const dateStr = String(val).trim()

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr
        }

        const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
        const ddmmyyyyMatch = dateStr.match(ddmmyyyyRegex)
        if (ddmmyyyyMatch) {
          const day = ddmmyyyyMatch[1].padStart(2, '0')
          const month = ddmmyyyyMatch[2].padStart(2, '0')
          const year = ddmmyyyyMatch[3]
          return `${year}-${month}-${day}`
        }

        const ddmmyyyyDashRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/
        const ddmmyyyyDashMatch = dateStr.match(ddmmyyyyDashRegex)
        if (ddmmyyyyDashMatch) {
          const day = ddmmyyyyDashMatch[1].padStart(2, '0')
          const month = ddmmyyyyDashMatch[2].padStart(2, '0')
          const year = ddmmyyyyDashMatch[3]
          return `${year}-${month}-${day}`
        }

        const months: Record<string, string> = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
          'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
          'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'mei': '05', 'juni': '06',
          'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
        }

        const monthNameRegex = /(\d{1,2})[\s\-\/]?([a-zA-Z]+)[\s\-\/]?(\d{4})?/i
        const monthNameMatch = dateStr.match(monthNameRegex)

        if (monthNameMatch) {
          const day = monthNameMatch[1].padStart(2, '0')
          const monthName = monthNameMatch[2].toLowerCase().substring(0, 3)
          const month = months[monthName] || months[monthNameMatch[2].toLowerCase()] || '01'
          const year = monthNameMatch[3] || new Date().getFullYear().toString()
          return `${year}-${month}-${day}`
        }

        return dateStr
      }

      const parseTime = (val: unknown): string => {
        if (val === undefined || val === null || val === '') return ''
        const timeStr = String(val).trim()
        
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
          const parts = timeStr.split(':')
          const hours = parts[0].padStart(2, '0')
          const minutes = parts[1].padStart(2, '0')
          return `${hours}:${minutes}`
        }
        
        return timeStr
      }

      setData({
        nama: data.nama, // Preserve nama yang sudah diisi
        msisdnEmail: data.msisdnEmail, // Preserve msisdnEmail yang sudah diisi
        project: data.project,
        tgl: parseDate(extracted.tanggal),
        time: parseTime(extracted.waktu),
        trxId: getString(extracted.trx_id),
        transaksi: getString(extracted.transaksi),
        paymentType: getString(extracted.payment_type),
        amount: parseNumber(extracted.amount),
        bAdmin: parseNumber(extracted.b_admin),
        bKirim: parseNumber(extracted.b_kirim),
        bLayanan: parseNumber(extracted.b_layanan),
        diskon: parseNumber(extracted.diskon),
        loginStatus: getString(extracted.login_non_login) || 'Login',
        total: parseNumber(extracted.total),
        by: '',
        remark: ''
      })

      // Asset check result will be preserved in state
      // No need to reset assetCheckResult here

      setState('review')
    } catch (err) {
      console.error('Upload error:', err)
      
      // Clean up uploaded file if OCR processing fails
      if (uploadedFiles.length > 0) {
        try {
          await apiClient.delete(`/api/files/${uploadedFiles[0].id}`)
          setUploadedFiles([])
        } catch (cleanupError) {
          console.error('File cleanup error:', cleanupError)
        }
      }
      
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Gagal memproses gambar. Pastikan webhook n8n aktif.')
      }
      setState('error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous validation errors
    setValidationErrors([])
    
    if (!user) {
      setError('User tidak terautentikasi')
      setState('error')
      return
    }

    // Enhanced validation
    const errors: string[] = []
    
    if (!data.nama.trim()) {
      errors.push('Nama harus diisi')
    }
    
    if (!data.msisdnEmail.trim()) {
      errors.push('MSISDN/Email harus diisi')
    }
    
    if (!data.project) {
      errors.push('Project harus dipilih')
    }
    
    if (!data.tgl) {
      errors.push('Tanggal transaksi harus diisi')
    }
    
    if (data.total <= 0) {
      errors.push('Total amount harus lebih besar dari 0')
    }
    
    if (uploadedFiles.length === 0) {
      errors.push('File struk harus diupload')
    }
    
    // Validate selected project is still active
    const selectedProject = availableProjects.find(p => p.name === data.project)
    if (!selectedProject) {
      errors.push('Project yang dipilih tidak valid atau tidak aktif')
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors)
      setState('upload')
      return
    }

    setState('processing')

    try {
      // Use the result from the manual "Check Asset" button click if available
      // This ensures we don't call the n8n webhook again during submission
      const assetMatchResult = assetCheckResult

      // Mark uploaded files as used to prevent duplication
      for (const fileDoc of uploadedFiles) {
        await apiClient.patch(`/api/files/${fileDoc.id}`, {
          markAsUsed: true
        })
      }

      // Create reimbursement object with enhanced data (without id - let database generate it)
      const newReimbursement: Partial<Reimbursement> = {
        employeeName: data.nama || user.name,
        employeeEmail: data.msisdnEmail || user.email,
        userId: user.id,
        date: data.tgl,
        amount: data.total,
        description: data.transaksi || `${data.transaksi} - ${data.paymentType}`,
        project: data.project,
        status: 'pending' as const,
        receiptImage: previewUrl || undefined,
        asset: assetMatchResult?.assetName,
        paymentMethod: data.paymentType, // Store payment method
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        leadId: user.leadId,
        leadName: user.leadName,
      }

      // Add extra fields that will be used by the API but not in the type
      const requestData = {
        ...newReimbursement,
        projectId: selectedProject?.id, // Include project ID for database reference
        assetId: assetMatchResult?.assetId, // Include asset ID for database reference
        documents: uploadedFiles, // Include file metadata for tracking
        // Additional transaction details
        transactionId: data.trxId,
        transactionTime: data.time,
        transactionAmount: data.amount,
        adminFee: data.bAdmin,
        shippingFee: data.bKirim,
        serviceFee: data.bLayanan,
        discount: data.diskon,
        loginStatus: data.loginStatus,
        by: data.by,
        folderEvidence: uploadedFiles.length > 0 ? uploadedFiles[0].filePath : null,
      }

      await addReimbursement(requestData as Reimbursement)
      
      // Invalidate cache so new data appears immediately
      invalidateReimbursementsCache()
      
      setState('success')
      
      setTimeout(() => {
        onSuccess()
      }, 1500) // Reduced to 1.5 seconds for faster redirect
    } catch (err) {
      console.error('Submit error:', err)
      
      if (err instanceof Error) {
        // Check if it's a validation error from the backend
        if (err.message.includes('validation') || err.message.includes('Invalid') || err.message.includes('tidak boleh') || err.message.includes('required')) {
          setValidationErrors([err.message])
          setState('upload')
        } else {
          setError(err.message)
          setState('error')
        }
      } else {
        setError('Gagal mengirim data.')
        setState('error')
      }
    }
  }

  const handleCheckAsset = async () => {
    if (!data.msisdnEmail) {
      setError('Masukkan MSISDN/Email terlebih dahulu')
      return
    }

    setIsCheckingAsset(true)
    setError(null)
    
    try {
      // Try to get webhook URL from build-time env first
      let webhookUrl = process.env.NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL
      
      // If not available at build time, try runtime config
      if (!webhookUrl) {
        try {
          const configResponse = await apiClient.get('/api/config')
          webhookUrl = configResponse.data.assetMatchWebhookUrl
        } catch (configError) {
          console.error('Failed to load runtime config:', configError)
        }
      }
      
      if (!webhookUrl) {
        throw new Error('Asset matching webhook URL tidak dikonfigurasi. Hubungi administrator.')
      }
      
      const response = await apiClient.post(webhookUrl, {
        msisdn_email: data.msisdnEmail,
        timestamp: new Date().toISOString()
      })
      
      // Response structure: { data: { matched, assetId, assetName, ... } }
      const responseData = response.data.data || response.data
      
      const matchResult: AssetMatchResult = {
        matched: responseData.matched || false,
        assetId: responseData.assetId || undefined,
        assetName: responseData.assetName || undefined,
        employeeName: responseData.employeeName || undefined,
        department: responseData.department || undefined,
        matchedBy: responseData.matchedBy || 'email',
        matchedValue: responseData.matchedValue || data.msisdnEmail,
        confidence: responseData.confidence || 0,
        verifiedDate: responseData.verifiedDate || new Date().toISOString()
      }
      
      setAssetCheckResult(matchResult)
    } catch (err) {
      console.error('Asset check error:', err)
      setError('Gagal melakukan asset matching. Silakan coba lagi.')
      setAssetCheckResult(null)
    } finally {
      setIsCheckingAsset(false)
    }
  }

  const reset = () => {
    setState('upload')
    setPreviewUrl(null)
    setCurrentFile(null)
    setUploadedFiles([])
    setData({
      nama: '',
      msisdnEmail: '',
      project: (availableProjects.length > 0 ? availableProjects[0].name : 'MaxStream') as ProjectType,
      tgl: '', time: '', trxId: '', transaksi: '', paymentType: '',
      amount: 0, bAdmin: 0, bKirim: 0, bLayanan: 0, diskon: 0,
      loginStatus: 'Login', total: 0, by: '', remark: ''
    })
    setError(null)
    setValidationErrors([])
    setAssetCheckResult(null)
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center text-center">
          <AlertCircle className="w-20 h-20 text-destructive mb-8" />
          <h2 className="text-3xl font-bold mb-3 text-white">Tidak Terautentikasi</h2>
          <p className="text-muted-foreground text-lg">Silakan login terlebih dahulu</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {state === 'upload' && (
        <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Informasi Pengajuan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Validation Errors Display */}
              {validationErrors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-semibold text-red-500">Validation Errors</h3>
                  </div>
                  <ul className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-xs text-red-600 flex items-start gap-1">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setValidationErrors([])}
                    className="mt-2 h-6 px-2 text-xs text-red-600 hover:text-red-700"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear Errors
                  </Button>
                </div>
              )}

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 text-blue-400">Informasi User</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nama User:</span>
                    <p className="font-medium text-white">{user.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead:</span>
                    <p className="font-medium text-white">{user.leadName || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-primary">Informasi Pengaju</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleCheckAsset}
                    disabled={isCheckingAsset || !data.msisdnEmail}
                  >
                    {isCheckingAsset ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Check Asset
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Nama <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      value={data.nama} 
                      onChange={e => setData({ ...data, nama: e.target.value })}
                      placeholder="Masukkan nama lengkap"
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      MSISDN / Email <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      value={data.msisdnEmail} 
                      onChange={e => {
                        setData({ ...data, msisdnEmail: e.target.value })
                        setAssetCheckResult(null)
                      }}
                      placeholder="08123456789 atau email@company.com"
                      required
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Akan digunakan untuk matching dengan database asset
                    </p>
                  </div>
                </div>
                
                {assetCheckResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 rounded-lg border"
                    style={{
                      backgroundColor: assetCheckResult.matched ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      borderColor: assetCheckResult.matched ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'
                    }}
                  >
                    {assetCheckResult.matched ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Match Found!
                          {assetCheckResult.confidence && (
                            <span className="text-xs bg-green-500/20 px-2 py-1 rounded">
                              {(assetCheckResult.confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Asset ID:</span>
                            <p className="font-medium">{assetCheckResult.assetId}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Asset Name:</span>
                            <p className="font-medium">{assetCheckResult.assetName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Employee:</span>
                            <p className="font-medium">{assetCheckResult.employeeName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Department:</span>
                            <p className="font-medium">{assetCheckResult.department}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Matched By:</span>
                            <p className="font-medium capitalize">{assetCheckResult.matchedBy}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Matched Value:</span>
                            <p className="font-medium">{assetCheckResult.matchedValue}</p>
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-600">
                          ✓ Asset verified. Anda dapat melanjutkan upload struk.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          Asset tidak ditemukan
                        </div>
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500 font-medium">
                          ⚠ Harap gunakan asset yang valid / terdaftar.
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Project <span className="text-red-500">*</span>
                </Label>
                <Select value={data.project} onValueChange={val => setData({ ...data, project: val as ProjectType })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingProjects ? (
                      <div className="flex items-center gap-2 p-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading projects...</span>
                      </div>
                    ) : availableProjects.length > 0 ? (
                      availableProjects.map(project => (
                        <SelectItem key={project.id} value={project.name}>
                          <div className="flex flex-col">
                            <span>{project.name}</span>
                            <span className="text-xs text-muted-foreground">{project.projectId}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No active projects available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {availableProjects.length === 0 && !isLoadingProjects && (
                  <p className="text-xs text-yellow-600">No active projects available. Contact administrator.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`transition-all ${!assetCheckResult?.matched ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:border-primary/50'}`} 
            onClick={() => {
              if (assetCheckResult?.matched) {
                fileInputRef.current?.click()
              }
            }}
          >
            <CardContent className="py-16 flex flex-col items-center text-center">
              <motion.div
                className={`mb-8 p-6 rounded-3xl border ${!assetCheckResult?.matched ? 'bg-muted border-muted-foreground/20' : 'bg-primary/10 border-primary/20'}`}
                whileHover={assetCheckResult?.matched ? { scale: 1.1, rotate: 5 } : {}}
              >
                <Upload className={`w-16 h-16 ${!assetCheckResult?.matched ? 'text-muted-foreground' : 'text-primary'}`} />
              </motion.div>
              <h2 className="text-3xl font-bold mb-3 text-white">Klik untuk Upload Struk</h2>
              {!assetCheckResult?.matched ? (
                <p className="text-yellow-500 font-medium mb-8">⚠️ Silakan lakukan "Check Asset" terlebih dahulu</p>
              ) : (
                <p className="text-muted-foreground text-lg mb-8">Mendukung format JPG, PNG (Max 5MB)</p>
              )}
              <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
              <Button 
                size="lg" 
                className="shadow-lg shadow-primary/30"
                disabled={!assetCheckResult?.matched}
              >
                Pilih File Struk
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {state === 'processing' && (
        <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <Card>
            <CardContent className="py-20 flex flex-col items-center text-center">
              <Loader2 className="w-20 h-20 text-primary animate-spin mb-8" />
              <h2 className="text-3xl font-bold mb-3 text-white">Sedang Memproses...</h2>
              <p className="text-muted-foreground text-lg">AI sedang membaca data dari struk Anda</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {state === 'review' && (
        <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Review Data</CardTitle>
                  <CardDescription>Periksa dan edit data sebelum mengirim</CardDescription>
                </div>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-xl border border-border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowImageModal(true)}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Upload Status */}
                {uploadedFiles.length > 0 && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <h3 className="text-sm font-semibold text-green-400 mb-3">File Berhasil Diupload</h3>
                    {uploadedFiles.map((fileDoc, index) => (
                      <div key={fileDoc.id} className="flex items-center justify-between text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="font-medium">{fileDoc.originalFileName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground ml-6">
                            <span>Renamed to: </span>
                            <span className="font-mono bg-muted px-2 py-1 rounded">{fileDoc.systemFileName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground ml-6">
                            Size: {(fileDoc.fileSize / 1024).toFixed(1)} KB | Type: {fileDoc.mimeType}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-primary">Informasi Pengaju</h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleCheckAsset}
                      disabled={isCheckingAsset || !data.msisdnEmail}
                    >
                      {isCheckingAsset ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        'Check Asset'
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Nama <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        value={data.nama} 
                        onChange={e => setData({ ...data, nama: e.target.value })}
                        placeholder="Masukkan nama lengkap"
                        required
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        MSISDN / Email <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        value={data.msisdnEmail} 
                        onChange={e => {
                          setData({ ...data, msisdnEmail: e.target.value })
                          setAssetCheckResult(null)
                        }}
                        placeholder="08123456789 atau email@company.com"
                        required
                        className="bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        Akan digunakan untuk matching dengan database asset
                      </p>
                    </div>
                  </div>
                  
                  {assetCheckResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-3 rounded-lg border"
                      style={{
                        backgroundColor: assetCheckResult.matched ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        borderColor: assetCheckResult.matched ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'
                      }}
                    >
                      {assetCheckResult.matched ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Asset Ditemukan!
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Asset:</span>
                              <p className="font-medium">{assetCheckResult.assetName}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Employee:</span>
                              <p className="font-medium">{assetCheckResult.employeeName}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-red-500 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Asset tidak ditemukan
                          </div>
                          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500 font-medium">
                            ⚠ Harap gunakan asset yang valid / terdaftar.
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-4">Detail Transaksi</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tanggal</Label>
                      <Input type="date" value={data.tgl} onChange={e => setData({ ...data, tgl: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Waktu</Label>
                      <Input type="time" value={data.time} onChange={e => setData({ ...data, time: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>TRX ID</Label>
                      <Input value={data.trxId} onChange={e => setData({ ...data, trxId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Transaksi</Label>
                      <Input value={data.transaksi} onChange={e => setData({ ...data, transaksi: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Type</Label>
                      <Input value={data.paymentType} onChange={e => setData({ ...data, paymentType: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input type="number" value={data.amount} onChange={e => setData({ ...data, amount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>B. Admin</Label>
                      <Input type="number" value={data.bAdmin} onChange={e => setData({ ...data, bAdmin: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>B. Kirim</Label>
                      <Input type="number" value={data.bKirim} onChange={e => setData({ ...data, bKirim: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>B. Layanan</Label>
                      <Input type="number" value={data.bLayanan} onChange={e => setData({ ...data, bLayanan: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Diskon</Label>
                      <Input type="number" value={data.diskon} onChange={e => setData({ ...data, diskon: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Login Status</Label>
                      <Select value={data.loginStatus} onValueChange={val => setData({ ...data, loginStatus: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Login">Login</SelectItem>
                          <SelectItem value="Non Login">Non Login</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Total</Label>
                      <Input type="number" value={data.total} onChange={e => setData({ ...data, total: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>By</Label>
                      <Input value={data.by} onChange={e => setData({ ...data, by: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Remark</Label>
                      <Input value={data.remark} onChange={e => setData({ ...data, remark: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={reset}>Batal</Button>
                  <Button type="submit" size="lg" className="flex-1">
                    <Send className="w-5 h-5 mr-2" />
                    Submit Reimbursement
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {state === 'success' && (
        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Card>
            <CardContent className="py-16 flex flex-col items-center text-center">
              <motion.div
                className="mb-8 p-6 bg-emerald-500/20 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <CheckCircle2 className="w-20 h-20 text-emerald-400" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-3 text-white">Berhasil!</h2>
              <p className="text-muted-foreground text-lg">Reimbursement berhasil diajukan</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {state === 'error' && (
        <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-destructive/50">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <motion.div className="mb-8 p-6 bg-destructive/20 rounded-full" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <AlertCircle className="w-20 h-20 text-destructive" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-3 text-white">Terjadi Kesalahan</h2>
              <p className="text-muted-foreground text-lg mb-8">{error}</p>
              <Button size="lg" onClick={reset}>Coba Lagi</Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {showImageModal && previewUrl && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowImageModal(false)}
        >
          <motion.div
            className="relative max-w-4xl max-h-[90vh]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
