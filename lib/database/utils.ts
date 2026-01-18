/**
 * Database Query Utilities
 * 
 * This module provides reusable utility functions for common database operations.
 * All functions use parameterized queries to prevent SQL injection.
 * 
 * Features:
 * - Parameterized query execution
 * - Transaction support
 * - Common CRUD operations (findById, findAll, insert, update, delete)
 * - Type-safe query helpers
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { db } from './connection';
import { QueryResult, PoolClient } from 'pg';

/**
 * Execute a parameterized SQL query
 * 
 * This is a wrapper around db.query that provides consistent error handling
 * and logging in development mode.
 * 
 * @param text - SQL query text with parameter placeholders ($1, $2, etc.)
 * @param params - Optional array of parameter values
 * @returns Promise resolving to QueryResult
 * 
 * Requirements:
 * - 10.1: Provide a query utility function that executes parameterized SQL queries
 * - 10.3: Use parameterized statements to prevent SQL injection
 */
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  // Log queries in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('Executing query:', text);
    if (params) {
      console.log('With params:', params);
    }
  }
  
  return await db.query(text, params);
}

/**
 * Execute multiple queries within a transaction
 * 
 * If any query fails, all changes are rolled back.
 * If all queries succeed, changes are committed.
 * 
 * @param callback - Async function that receives a client and executes queries
 * @returns Promise resolving to the callback's return value
 * 
 * Requirements:
 * - 10.2: Provide a transaction utility function for multi-query operations
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find a single record by ID
 * 
 * @param table - Table name
 * @param id - Record ID
 * @param idColumn - Name of the ID column (defaults to 'id')
 * @returns Promise resolving to the record or null if not found
 * 
 * Requirements:
 * - 10.4: Provide utility functions for common operations
 * - 10.6: Return null when query returns no results
 */
export async function findById<T = any>(
  table: string,
  id: string | number,
  idColumn: string = 'id'
): Promise<T | null> {
  const result = await query(
    `SELECT * FROM ${table} WHERE ${idColumn} = $1`,
    [id]
  );
  
  return result.rows[0] || null;
}

/**
 * Find all records in a table with optional filtering
 * 
 * @param table - Table name
 * @param whereClause - Optional WHERE clause (without the WHERE keyword)
 * @param params - Optional parameters for the WHERE clause
 * @param orderBy - Optional ORDER BY clause (without the ORDER BY keyword)
 * @returns Promise resolving to array of records
 * 
 * Requirements:
 * - 10.4: Provide utility functions for common operations
 * - 10.6: Return empty array when query returns no results
 */
export async function findAll<T = any>(
  table: string,
  whereClause?: string,
  params?: any[],
  orderBy?: string
): Promise<T[]> {
  let queryText = `SELECT * FROM ${table}`;
  
  if (whereClause) {
    queryText += ` WHERE ${whereClause}`;
  }
  
  if (orderBy) {
    queryText += ` ORDER BY ${orderBy}`;
  }
  
  const result = await query(queryText, params);
  return result.rows;
}

/**
 * Insert a new record
 * 
 * @param table - Table name
 * @param data - Object with column names as keys and values to insert
 * @returns Promise resolving to the inserted record
 * 
 * Requirements:
 * - 10.4: Provide utility functions for common operations
 * - 10.3: Use parameterized statements to prevent SQL injection
 */
export async function insert<T = any>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  
  const queryText = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Update a record by ID
 * 
 * @param table - Table name
 * @param id - Record ID
 * @param data - Object with column names as keys and values to update
 * @param idColumn - Name of the ID column (defaults to 'id')
 * @returns Promise resolving to the updated record or null if not found
 * 
 * Requirements:
 * - 10.4: Provide utility functions for common operations
 * - 10.3: Use parameterized statements to prevent SQL injection
 */
export async function update<T = any>(
  table: string,
  id: string | number,
  data: Record<string, any>,
  idColumn: string = 'id'
): Promise<T | null> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  // Build SET clause with parameter placeholders
  const setClause = columns
    .map((col, i) => `${col} = $${i + 1}`)
    .join(', ');
  
  const queryText = `
    UPDATE ${table}
    SET ${setClause}, updated_at = NOW()
    WHERE ${idColumn} = $${columns.length + 1}
    RETURNING *
  `;
  
  const result = await query(queryText, [...values, id]);
  return result.rows[0] || null;
}

/**
 * Delete a record by ID
 * 
 * @param table - Table name
 * @param id - Record ID
 * @param idColumn - Name of the ID column (defaults to 'id')
 * @returns Promise resolving to true if deleted, false if not found
 * 
 * Requirements:
 * - 10.4: Provide utility functions for common operations
 * - 10.3: Use parameterized statements to prevent SQL injection
 */
export async function deleteById(
  table: string,
  id: string | number,
  idColumn: string = 'id'
): Promise<boolean> {
  const result = await query(
    `DELETE FROM ${table} WHERE ${idColumn} = $1 RETURNING *`,
    [id]
  );
  
  return result.rows.length > 0;
}

/**
 * Count records in a table with optional filtering
 * 
 * @param table - Table name
 * @param whereClause - Optional WHERE clause (without the WHERE keyword)
 * @param params - Optional parameters for the WHERE clause
 * @returns Promise resolving to the count
 */
export async function count(
  table: string,
  whereClause?: string,
  params?: any[]
): Promise<number> {
  let queryText = `SELECT COUNT(*) as count FROM ${table}`;
  
  if (whereClause) {
    queryText += ` WHERE ${whereClause}`;
  }
  
  const result = await query(queryText, params);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Check if a record exists
 * 
 * @param table - Table name
 * @param id - Record ID
 * @param idColumn - Name of the ID column (defaults to 'id')
 * @returns Promise resolving to true if exists, false otherwise
 */
export async function exists(
  table: string,
  id: string | number,
  idColumn: string = 'id'
): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${idColumn} = $1) as exists`,
    [id]
  );
  
  return result.rows[0].exists;
}
