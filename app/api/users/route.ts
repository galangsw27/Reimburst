/**
 * User API Routes
 * 
 * This module provides HTTP endpoints for user operations.
 * GET /api/users - Retrieve all users (Protected - requires authentication)
 * POST /api/users - Create a new user (Protected - admin only)
 * 
 * All routes require JWT authentication.
 * 
 * Requirements: 6.1, 6.3, 8.1, 8.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '@/lib/services/factory';
import { isValidEmail, validateRole } from '@/lib/utils/validation';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * GET /api/users
 * 
 * Retrieves all users from the system using the appropriate service
 * implementation (mock or database) based on DATABASE_MODE.
 * 
 * Protected: Requires valid JWT token
 * 
 * @returns JSON array of all users with 200 status
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 6.1: Create GET /api/users endpoint to retrieve all users
 * - 6.8: Route to the appropriate service based on DATABASE_MODE
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    const userService = getUserService();
    const users = await userService.getUsers();
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * 
 * Creates a new user in the system with validation.
 * Validates email format and role before creating the user.
 * 
 * Protected: Requires valid JWT token and admin role (head or finance)
 * 
 * @param request - The Next.js request object containing user data in JSON body
 * @returns JSON of created user with 201 status on success
 * @returns Error message with 400 status if validation fails
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 403 status if not authorized
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 6.3: Create POST /api/users endpoint to create new users
 * - 8.1: Validate that email is in valid email format
 * - 8.2: Validate that role is one of: head, finance, lead, user
 */
export async function POST(request: NextRequest) {
  // Authenticate and authorize (only head and finance can create users)
  const { user, error } = authenticateAndAuthorize(request, ['head', 'finance']);
  
  if (error) {
    return error;
  }

  try {
    const userService = getUserService();
    const data = await request.json();
    
    // Validate email format (Requirement 8.1)
    if (!data.email || !isValidEmail(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate role (Requirement 8.2)
    if (!data.role || !validateRole(data.role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: head, finance, lead, user' },
        { status: 400 }
      );
    }
    
    // Create the user
    const newUser = await userService.createUser(data);
    
    // Return 201 Created status with the new user
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      // Handle duplicate email or other validation errors
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }
      
      // Handle validation errors (invalid, validation, lead reference, etc.)
      if (error.message.toLowerCase().includes('validation') || 
          error.message.toLowerCase().includes('invalid') ||
          error.message.toLowerCase().includes('lead')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    // Generic server error
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
