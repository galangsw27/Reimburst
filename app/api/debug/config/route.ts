/**
 * Debug Config API Route
 * 
 * This endpoint shows the current database configuration for debugging purposes.
 * Should be removed or protected in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConfig } from '@/lib/config/database';

export async function GET(request: NextRequest) {
  try {
    const config = getDatabaseConfig();
    
    return NextResponse.json({
      mode: config.mode,
      hasConnectionString: !!config.connectionString,
      hasPoolConfig: !!config.poolConfig,
      env: {
        DATABASE_MODE: process.env.DATABASE_MODE,
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        env: {
          DATABASE_MODE: process.env.DATABASE_MODE,
          DATABASE_URL_SET: !!process.env.DATABASE_URL,
        }
      },
      { status: 500 }
    );
  }
}
