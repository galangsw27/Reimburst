import { beforeEach, afterEach, vi } from 'vitest'

// Mock environment variables
beforeEach(() => {
  // Set up default environment variables for tests
  process.env.NEXT_PUBLIC_WEBHOOK_URL = 'https://test.com/webhook/ocr'
  process.env.NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL = 'https://test.com/webhook/asset'
  process.env.NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL = 'https://test.com/webhook/maxstream'
  process.env.NEXT_PUBLIC_MYORBIT_WEBHOOK_URL = 'https://test.com/webhook/myorbit'
  process.env.NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL = 'https://test.com/webhook/duniagames'
})

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks()
})
