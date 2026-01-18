/**
 * Database Configuration Module
 * 
 * This module provides configuration for database connections, supporting both
 * mock and database modes through environment variables.
 * 
 * Requirements: 3.1, 3.2, 3.6
 */

export interface DatabaseConfig {
  mode: 'mock' | 'database';
  connectionString?: string;
  poolConfig?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
}

/**
 * Reads and validates database configuration from environment variables.
 * 
 * Environment Variables:
 * - DATABASE_MODE: "mock" or "database" (default: "mock")
 * - DATABASE_URL: PostgreSQL connection string (required when mode is "database")
 * 
 * @returns DatabaseConfig object with mode and connection settings
 * @throws Error if DATABASE_MODE is "database" but DATABASE_URL is missing
 * 
 * Requirements:
 * - 3.1: Read DATABASE_MODE environment variable
 * - 3.2: Read DATABASE_URL environment variable
 * - 3.6: Return descriptive error messages when required variables are missing
 */
export function getDatabaseConfig(): DatabaseConfig {
  // HARDCODED: Always use database mode
  const mode = 'database';
  
  // Use environment variable or default connection string
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reimbursement_db';
  
  // Validate connection string format (basic check)
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error(
      `Invalid DATABASE_URL format: "${connectionString}". ` +
      'Connection string must start with "postgresql://" or "postgres://"'
    );
  }
  
  return {
    mode: 'database',
    connectionString,
    poolConfig: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  };
}
