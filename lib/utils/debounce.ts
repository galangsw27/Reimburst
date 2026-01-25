/**
 * Debounce utility function
 * Delays the execution of a function until after a specified delay has elapsed
 * since the last time it was invoked.
 * 
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns A debounced version of the function
 * 
 * Requirements: 11.5
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * React hook for debouncing values
 * Returns a debounced version of the value that only updates after the specified delay
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 * 
 * Requirements: 11.5
 */
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delay])

  return debouncedValue
}
