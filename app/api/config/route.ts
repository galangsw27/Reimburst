/**
 * Config API Route
 * Provides runtime configuration to client
 * This allows environment variables to be loaded at runtime instead of build time
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    webhookUrl: process.env.NEXT_PUBLIC_WEBHOOK_URL || '',
    assetMatchWebhookUrl: process.env.NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL || '',
    maxstreamWebhookUrl: process.env.NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL || '',
    myorbitWebhookUrl: process.env.NEXT_PUBLIC_MYORBIT_WEBHOOK_URL || '',
    duniagamesWebhookUrl: process.env.NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL || '',
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  })
}
