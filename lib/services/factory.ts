/**
 * Service Factory
 * 
 * This module provides factory functions that return the appropriate service implementation
 * (Mock or Database) based on the DATABASE_MODE environment variable.
 * 
 * The factory pattern allows the application to seamlessly switch between mock and database
 * modes without changing any code in the API routes or other consumers of these services.
 * 
 * Requirements: 7.5, 7.6
 */

import { getDatabaseConfig } from '@/lib/config/database';
import { IUserService, IReimbursementService } from './types';
import { DatabaseUserService } from './database/userService';
import { DatabaseReimbursementService } from './database/reimbursementService';
import { db } from '@/lib/database/connection';

/**
 * Initialize database connection if not already initialized
 */
function ensureDatabaseInitialized(): void {
  if (!db.isInitialized()) {
    const config = getDatabaseConfig();
    if (config.connectionString && config.poolConfig) {
      db.initialize(config.connectionString, config.poolConfig);
      console.log('Database connection pool initialized');
    }
  }
}

/**
 * Returns the user service implementation.
 * 
 * HARDCODED: Always returns DatabaseUserService.
 * Ensures database is initialized before returning service.
 * 
 * @returns IUserService implementation (Database)
 */
export function getUserService(): IUserService {
  ensureDatabaseInitialized();
  return new DatabaseUserService();
}

/**
 * Returns the reimbursement service implementation.
 * 
 * HARDCODED: Always returns DatabaseReimbursementService.
 * Ensures database is initialized before returning service.
 * 
 * @returns IReimbursementService implementation (Database)
 */
export function getReimbursementService(): IReimbursementService {
  ensureDatabaseInitialized();
  return new DatabaseReimbursementService();
}
