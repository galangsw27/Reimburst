/**
 * Database Seed Script
 * 
 * This script populates the database with initial user data matching the mock data structure.
 * It creates 18 users: 1 head, 1 finance, 3 leads, and 13 regular users.
 * 
 * Features:
 * - Password hashing using PBKDF2 (same as UserService)
 * - Idempotent execution (uses ON CONFLICT DO NOTHING)
 * - Preserves user hierarchy relationships
 * - Logging for each seeded user
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { db } from '../lib/database/connection';
import { getDatabaseConfig } from '../lib/config/database';
import { randomBytes, pbkdf2 } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

/**
 * Hash a password using PBKDF2 with a random salt
 * This matches the hashing algorithm used in DatabaseUserService
 * 
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password in format: salt:hash
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await pbkdf2Async(password, salt, 10000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * Seed user data matching the mock service structure
 * 
 * Requirements:
 * - 5.2: Migrate all 18 mock users with their roles
 * - 5.3: Preserve user hierarchy relationships
 * 
 * Note: leadId will be resolved dynamically after leads are inserted
 */
const seedUsers = [
  // Management roles (2 users)
  { name: 'Head User', email: 'head@company.com', role: 'head', leadEmail: null },
  { name: 'Finance User', email: 'finance@company.com', role: 'finance', leadEmail: null },
  
  // Leads (3 users)
  { name: 'Lead One', email: 'lead1@company.com', role: 'lead', leadEmail: null },
  { name: 'Lead Two', email: 'lead2@company.com', role: 'lead', leadEmail: null },
  { name: 'Lead Three', email: 'lead3@company.com', role: 'lead', leadEmail: null },
  
  // Regular users assigned to Lead One (5 users)
  { name: 'User One', email: 'user1@company.com', role: 'user', leadEmail: 'lead1@company.com' },
  { name: 'User Two', email: 'user2@company.com', role: 'user', leadEmail: 'lead1@company.com' },
  { name: 'User Three', email: 'user3@company.com', role: 'user', leadEmail: 'lead1@company.com' },
  { name: 'User Four', email: 'user4@company.com', role: 'user', leadEmail: 'lead1@company.com' },
  { name: 'User Five', email: 'user5@company.com', role: 'user', leadEmail: 'lead1@company.com' },
  
  // Regular users assigned to Lead Two (4 users)
  { name: 'User Six', email: 'user6@company.com', role: 'user', leadEmail: 'lead2@company.com' },
  { name: 'User Seven', email: 'user7@company.com', role: 'user', leadEmail: 'lead2@company.com' },
  { name: 'User Eight', email: 'user8@company.com', role: 'user', leadEmail: 'lead2@company.com' },
  { name: 'User Nine', email: 'user9@company.com', role: 'user', leadEmail: 'lead2@company.com' },
  
  // Regular users assigned to Lead Three (4 users)
  { name: 'User Ten', email: 'user10@company.com', role: 'user', leadEmail: 'lead3@company.com' },
  { name: 'User Eleven', email: 'user11@company.com', role: 'user', leadEmail: 'lead3@company.com' },
  { name: 'User Twelve', email: 'user12@company.com', role: 'user', leadEmail: 'lead3@company.com' },
  { name: 'User Thirteen', email: 'user13@company.com', role: 'user', leadEmail: 'lead3@company.com' },
];

/**
 * Main seed function
 * 
 * Populates the users table with seed data.
 * Uses ON CONFLICT (email) DO NOTHING for idempotence.
 * 
 * Requirements:
 * - 5.1: Provide a seed script that populates the users table
 * - 5.4: Hash passwords for all seeded users
 * - 5.5: Check for existing data and skip duplicates
 * - 5.6: Log successful migration of each user record
 */
async function seed() {
  try {
    // Initialize database connection
    const config = getDatabaseConfig();
    
    if (config.mode !== 'database' || !config.connectionString) {
      console.error('Error: DATABASE_MODE must be "database" and DATABASE_URL must be set');
      process.exit(1);
    }
    
    if (!config.poolConfig) {
      console.error('Error: Pool configuration is missing');
      process.exit(1);
    }
    
    db.initialize(config.connectionString, config.poolConfig);
    
    console.log('Starting database seed...');
    console.log(`Seeding ${seedUsers.length} users...`);
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    // Map to store lead email -> lead ID
    const leadIdMap: Record<string, number> = {};
    
    // First pass: Insert management and lead users
    for (const user of seedUsers) {
      if (user.role === 'head' || user.role === 'finance' || user.role === 'lead') {
        try {
          // Hash password for each user
          const hashedPassword = await hashPassword('password123');
          
          const result = await db.query(
            `INSERT INTO users (name, email, password_hash, role, lead_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
             RETURNING id`,
            [user.name, user.email, hashedPassword, user.role, null]
          );
          
          if (result.rows.length > 0) {
            const userId = result.rows[0].id;
            if (user.role === 'lead') {
              leadIdMap[user.email] = userId;
            }
            insertedCount++;
            console.log(`✓ Seeded user: ${user.email} (${user.role}) - ID: ${userId}`);
          } else {
            skippedCount++;
            console.log(`- Skipped existing user: ${user.email}`);
          }
        } catch (error) {
          console.error(`✗ Failed to seed user ${user.email}:`, error);
        }
      }
    }
    
    // Second pass: Insert regular users with lead references
    for (const user of seedUsers) {
      if (user.role === 'user') {
        try {
          // Hash password for each user
          const hashedPassword = await hashPassword('password123');
          const leadId = user.leadEmail ? leadIdMap[user.leadEmail] : null;
          
          const result = await db.query(
            `INSERT INTO users (name, email, password_hash, role, lead_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, lead_id = EXCLUDED.lead_id, password_hash = EXCLUDED.password_hash
             RETURNING id`,
            [user.name, user.email, hashedPassword, user.role, leadId]
          );
          
          if (result.rows.length > 0) {
            insertedCount++;
            console.log(`✓ Seeded user: ${user.email} (${user.role}) - Lead ID: ${leadId}`);
          } else {
            skippedCount++;
            console.log(`- Skipped existing user: ${user.email}`);
          }
        } catch (error) {
          console.error(`✗ Failed to seed user ${user.email}:`, error);
        }
      }
    }
    
    console.log('\nSeed complete!');
    console.log(`Inserted: ${insertedCount} users`);
    console.log(`Skipped: ${skippedCount} users (already exist)`);
    console.log(`Total: ${seedUsers.length} users`);
    
    // Close database connection
    await db.close();
    
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export { seed, seedUsers };
