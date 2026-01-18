/**
 * Example Usage of Validation Utilities
 * 
 * This file demonstrates how to use the validation utilities in API routes.
 * These examples show the intended usage patterns for the validation functions.
 */

import { isValidEmail, validateRole, validateLeadReference } from './validation';
import { getUserService } from '@/lib/services/factory';

/**
 * Example 1: Validating email in a POST /api/users route
 */
export async function exampleEmailValidation(email: string) {
  if (!isValidEmail(email)) {
    return {
      error: 'Invalid email format',
      status: 400
    };
  }
  
  // Proceed with user creation
  return { success: true };
}

/**
 * Example 2: Validating role in a POST /api/users route
 */
export async function exampleRoleValidation(role: string) {
  if (!validateRole(role)) {
    return {
      error: 'Invalid role. Must be one of: head, finance, lead, user',
      status: 400
    };
  }
  
  // Proceed with user creation
  return { success: true };
}

/**
 * Example 3: Validating lead reference in a POST /api/users route
 */
export async function exampleLeadReferenceValidation(
  role: string,
  leadId: string | undefined
) {
  const userService = getUserService();
  
  const isValid = await validateLeadReference(
    role,
    leadId,
    (id) => userService.getUserById(id)
  );
  
  if (!isValid) {
    return {
      error: 'Invalid lead reference. Users with role "user" must have a valid lead_id referencing a user with role "lead"',
      status: 400
    };
  }
  
  // Proceed with user creation
  return { success: true };
}

/**
 * Example 4: Complete validation flow for creating a user
 */
export async function exampleCompleteValidation(data: {
  email: string;
  role: string;
  leadId?: string;
}) {
  // Step 1: Validate email
  if (!isValidEmail(data.email)) {
    return {
      error: 'Invalid email format',
      status: 400
    };
  }
  
  // Step 2: Validate role
  if (!validateRole(data.role)) {
    return {
      error: 'Invalid role. Must be one of: head, finance, lead, user',
      status: 400
    };
  }
  
  // Step 3: Validate lead reference (if role is 'user')
  const userService = getUserService();
  const isValidLead = await validateLeadReference(
    data.role,
    data.leadId,
    (id) => userService.getUserById(id)
  );
  
  if (!isValidLead) {
    return {
      error: 'Invalid lead reference. Users with role "user" must have a valid lead_id referencing a user with role "lead"',
      status: 400
    };
  }
  
  // All validations passed, proceed with user creation
  return { success: true };
}
