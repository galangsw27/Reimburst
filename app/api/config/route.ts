/**
 * Config API Route
 * Provides runtime configuration to client
 * This allows environment variables to be loaded at runtime instead of build time
 * 
 * SECURITY: Webhook URLs are NOT exposed to client to prevent URL leakage
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    // Webhook URLs are kept server-side for security
    // Only expose non-sensitive configuration
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  })
}
