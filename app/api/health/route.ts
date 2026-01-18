/**
 * Health Check API Route
 * 
 * This endpoint verifies the application and database connectivity status.
 * In database mode, it performs a simple query to verify database connectivity.
 * In mock mode, it returns a healthy status without database checks.
 * 
 * Requirements: 11.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConfig } from '@/lib/config/database';
import { db } from '@/lib/database/connection';

/**
 * GET /api/health
 * 
 * Returns health status of the application and database connectivity.
 * 
 * Response format:
 * {
 *   status: 'healthy' | 'unhealthy',
 *   mode: 'mock' | 'database',
 *   database?: {
 *     connected: boolean,
 *     message?: string
 *   },
 *   timestamp: string
 * }
 * 
 * Requirements: 11.1
 */
export async function GET(request: NextRequest) {
  try {
    const config = getDatabaseConfig();
    const timestamp = new Date().toISOString();
    
    // Always database mode now
    try {
      // Initialize database if not already initialized
      if (!db.isInitialized() && config.connectionString && config.poolConfig) {
        db.initialize(config.connectionString, config.poolConfig);
      }
      
      // Perform a simple query to verify connectivity
      await db.query('SELECT 1');
      
      return NextResponse.json({
        status: 'healthy',
        mode: 'database',
        database: {
          connected: true,
          message: 'Database connection successful',
        },
        timestamp,
      });
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
      
      return NextResponse.json(
        {
          status: 'unhealthy',
          mode: 'database',
          database: {
            connected: false,
            message: dbError instanceof Error ? dbError.message : 'Database connection failed',
          },
          timestamp,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
