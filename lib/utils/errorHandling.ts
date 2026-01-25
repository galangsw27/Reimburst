/**
 * Error Handling Utilities
 * 
 * Provides utilities for handling errors, retrying failed operations,
 * and displaying error messages to users.
 * 
 * Requirements: 8.5, 11.7
 */

/**
 * Fetch with automatic retry and exponential backoff
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise with the response data
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        // Don't retry on authentication errors
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication error: ${response.status} ${response.statusText}`)
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      lastError = error as Error

      // Don't retry on authentication errors
      if (lastError.message.includes('401') || lastError.message.includes('Authentication')) {
        throw lastError
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

/**
 * Handle authentication errors
 * Clears local storage and redirects to login page
 * 
 * @param error - The error object
 */
export function handleAuthError(error: Error): void {
  if (
    error.message.includes('401') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('Authentication')
  ) {
    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      // Redirect to login
      window.location.href = '/login'
    }
  }
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Display validation errors component props
 */
export interface ValidationErrorsProps {
  errors: ValidationError[]
}

/**
 * Get user-friendly error message from error object
 * 
 * @param error - The error object
 * @param context - Context where the error occurred
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown, context: string): string {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return 'The requested item was not found.'
    }
    if (error.message.includes('permission') || error.message.includes('403')) {
      return 'You do not have permission to perform this action.'
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Your session has expired. Please login again.'
    }
    if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }

    // Return the error message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes('Error:')) {
      return error.message
    }
  }

  return `An error occurred while ${context}. Please try again.`
}

/**
 * Handle data error and return error info
 * 
 * @param error - The error object
 * @param context - Context where the error occurred
 * @returns Error information object
 */
export function handleDataError(error: unknown, context: string): {
  error: string
  canRetry: boolean
  originalError: Error | null
} {
  console.error(`Data error in ${context}:`, error)

  const errorMessage = getUserFriendlyErrorMessage(error, context)
  const canRetry = !errorMessage.includes('permission') && !errorMessage.includes('session expired')

  return {
    error: errorMessage,
    canRetry,
    originalError: error instanceof Error ? error : null
  }
}

/**
 * Error logging interface
 */
export interface ErrorLog {
  timestamp: Date
  component: string
  action: string
  error: Error
  userId?: string
  context?: Record<string, any>
}

/**
 * Log error for debugging and monitoring
 * 
 * @param log - Error log object
 */
export function logError(log: ErrorLog): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Log:', log)
  }

  // In production, you would send to error tracking service (Sentry, LogRocket, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service
    // Example: Sentry.captureException(log.error, { extra: log })
  }

  // Store in local storage for debugging (keep last 50 errors)
  if (typeof window !== 'undefined') {
    try {
      const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]')
      errorLogs.push({
        ...log,
        timestamp: log.timestamp.toISOString(),
        error: {
          message: log.error.message,
          stack: log.error.stack
        }
      })
      localStorage.setItem('errorLogs', JSON.stringify(errorLogs.slice(-50)))
    } catch (e) {
      // Ignore storage errors
    }
  }
}

/**
 * Create a retry handler for async operations
 * 
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param onError - Optional callback for each error
 * @returns Promise with the operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  onError?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (onError) {
        onError(lastError, attempt)
      }

      // Don't retry on authentication errors
      if (lastError.message.includes('401') || lastError.message.includes('Authentication')) {
        throw lastError
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}
