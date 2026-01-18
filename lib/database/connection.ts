/**
 * Database Connection Pool Module
 * 
 * This module manages PostgreSQL database connections using a connection pool
 * for efficient database access. It provides connection acquisition, query
 * execution, and proper resource cleanup.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { Pool, PoolClient, QueryResult } from 'pg';

interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
}

/**
 * DatabaseConnection class manages a PostgreSQL connection pool.
 * 
 * Features:
 * - Connection pooling with configurable min/max connections
 * - Automatic connection acquisition and release
 * - Error handling for pool operations
 * - Singleton pattern for application-wide connection management
 * 
 * Requirements:
 * - 4.1: Create a connection pool for PostgreSQL connections
 * - 4.2: Configure connection pool with minimum 2 and maximum 10 connections
 * - 4.3: Acquire a connection from the pool when executing queries
 * - 4.4: Release the connection back to the pool when query completes
 */
class DatabaseConnection {
  private pool: Pool | null = null;
  
  /**
   * Initializes the connection pool with the provided configuration.
   * 
   * @param connectionString - PostgreSQL connection string
   * @param poolConfig - Pool configuration with min, max, and idle timeout
   * 
   * Requirements:
   * - 4.1: Create a connection pool for PostgreSQL connections
   * - 4.2: Configure pool with min=2, max=10 connections
   */
  initialize(connectionString: string, poolConfig: PoolConfig): void {
    if (this.pool) {
      console.warn('Database pool already initialized. Skipping re-initialization.');
      return;
    }
    
    this.pool = new Pool({
      connectionString,
      min: poolConfig.min,
      max: poolConfig.max,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis,
    });
    
    // Handle unexpected pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }
  
  /**
   * Gets a client connection from the pool.
   * 
   * @returns Promise resolving to a PoolClient
   * @throws Error if pool is not initialized
   * 
   * Requirements:
   * - 4.3: Acquire a connection from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }
    return await this.pool.connect();
  }
  
  /**
   * Executes a parameterized SQL query with automatic connection management.
   * 
   * This method acquires a connection from the pool, executes the query,
   * and releases the connection back to the pool regardless of success or failure.
   * 
   * @param text - SQL query text with parameter placeholders ($1, $2, etc.)
   * @param params - Optional array of parameter values
   * @returns Promise resolving to QueryResult
   * @throws Error if pool is not initialized or query fails
   * 
   * Requirements:
   * - 4.3: Acquire a connection from the pool when executing queries
   * - 4.4: Release the connection back to the pool when query completes
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.getClient();
    try {
      return await client.query(text, params);
    } finally {
      // Always release the connection back to the pool
      client.release();
    }
  }
  
  /**
   * Closes the connection pool and releases all resources.
   * 
   * @returns Promise that resolves when pool is closed
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
  
  /**
   * Checks if the pool is initialized.
   * 
   * @returns true if pool is initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.pool !== null;
  }
}

// Singleton instance for application-wide use
export const db = new DatabaseConnection();
