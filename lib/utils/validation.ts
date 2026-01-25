/**
 * Validation Utilities
 * 
 * This module provides validation functions for user input validation.
 * Used by API routes to validate data before creating or updating records.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { UserRole } from '@/lib/types';

/**
 * Validates if a string is a valid email format
 * 
 * Requirements: 8.1
 * 
 * @param email - The email string to validate
 * @returns true if the email is valid, false otherwise
 * 
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 * isValidEmail('user@') // false
 * isValidEmail('@example.com') // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email validation: must contain @ and have text before and after it
  // Must have a domain with at least one dot
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a role is one of the allowed user roles
 * 
 * Requirements: 8.2
 * 
 * @param role - The role string to validate
 * @returns true if the role is valid, false otherwise
 * 
 * @example
 * validateRole('user') // true
 * validateRole('lead') // true
 * validateRole('admin') // false
 * validateRole('') // false
 */
export function validateRole(role: string): role is UserRole {
  const validRoles: UserRole[] = ['head', 'finance', 'lead', 'tester'];
  return validRoles.includes(role as UserRole);
}

/**
 * Validates that a lead reference is valid for a user with role 'tester'
 * 
 * Requirements: 8.3
 * 
 * This function checks:
 * 1. If the user role is 'tester', a leadId must be provided
 * 2. The leadId must reference an existing user with role 'lead' or 'head'
 * 
 * @param role - The role of the user being created/updated
 * @param leadId - The lead ID to validate (optional)
 * @param getUserById - Async function to fetch a user by ID
 * @returns Promise resolving to true if validation passes, false otherwise
 * 
 * @example
 * // User with role 'tester' must have a valid lead
 * await validateLeadReference('tester', '3', getUserById) // true if user 3 is a lead or head
 * await validateLeadReference('tester', undefined, getUserById) // false - missing leadId
 * await validateLeadReference('tester', '999', getUserById) // false - lead not found
 * 
 * // Users with other roles don't need a lead
 * await validateLeadReference('head', undefined, getUserById) // true
 * await validateLeadReference('lead', undefined, getUserById) // true
 */
export async function validateLeadReference(
  role: string,
  leadId: string | undefined,
  getUserById: (id: string) => Promise<{ id: string; role: UserRole } | null>
): Promise<boolean> {
  // If role is not 'tester', leadId is optional and validation passes
  if (role !== 'tester') {
    return true;
  }

  // If role is 'tester', leadId must be provided
  if (!leadId) {
    return false;
  }

  // Verify that the lead exists and has role 'lead' or 'head'
  try {
    const lead = await getUserById(leadId);
    
    if (!lead) {
      return false;
    }

    return lead.role === 'lead' || lead.role === 'head';
  } catch (error) {
    // If there's an error fetching the lead, validation fails
    console.error('Error validating lead reference:', error);
    return false;
  }
}
