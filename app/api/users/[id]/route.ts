/**
 * User by ID API Routes
 * 
 * This module provides HTTP endpoints for individual user operations.
 * GET /api/users/[id] - Retrieve a specific user by ID (Protected)
 * PUT /api/users/[id] - Update a specific user by ID (Protected - admin only)
 * 
 * All routes require JWT authentication.
 * 
 * Requirements: 6.2, 6.4, 8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '@/lib/services/factory';
import { isValidEmail, validateRole } from '@/lib/utils/validation';
import { authenticateAndAuthorize } from '@/lib/auth/middleware';

/**
 * GET /api/users/[id]
 * 
 * Retrieves a specific user by ID using the appropriate service
 * implementation (mock or database) based on DATABASE_MODE.
 * 
 * Protected: Requires valid JWT token
 * 
 * @param request - The Next.js request object
 * @param params - Route parameters containing the user ID
 * @returns JSON of the user with 200 status on success
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 404 status if user not found
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 6.2: Create GET /api/users/[id] endpoint to retrieve a specific user
 * - 8.5: Return 404 status code when a requested resource is not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate request
  const { user, error } = authenticateAndAuthorize(request);
  
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const userService = getUserService();
    const foundUser = await userService.getUserById(id);
    
    // Return 404 if user not found (Requirement 8.5)
    if (!foundUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(foundUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id]
 * 
 * Updates a specific user by ID with validation.
 * Validates email format and role if provided in the update data.
 * 
 * Protected: Requires valid JWT token and admin role (head or finance)
 * 
 * @param request - The Next.js request object containing update data in JSON body
 * @param params - Route parameters containing the user ID
 * @returns JSON of updated user with 200 status on success
 * @returns Error message with 400 status if validation fails
 * @returns Error message with 401 status if not authenticated
 * @returns Error message with 403 status if not authorized
 * @returns Error message with 404 status if user not found
 * @returns Error message with 500 status if operation fails
 * 
 * Requirements:
 * - 6.4: Create PUT /api/users/[id] endpoint to update user information
 * - 8.5: Return 404 status code when a requested resource is not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and authorize (only head and finance can update users)
  const { user, error } = authenticateAndAuthorize(request, ['head', 'finance']);
  
  if (error) {
    return error;
  }

  try {
    const { id } = await params;
    const userService = getUserService();
    const data = await request.json();
    
    // Validate email format if provided
    if (data.email !== undefined && !isValidEmail(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate role if provided
    if (data.role !== undefined && !validateRole(data.role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: head, finance, lead, user' },
        { status: 400 }
      );
    }
    
    // Update the user
    const updatedUser = await userService.updateUser(id, data);
    return NextResponse.json(updatedUser);
  } catch (error) {
    // Handle user not found error (Requirement 8.5)
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.error('Error updating user:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      // Handle duplicate email or other validation errors
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }
      
      // Handle validation errors
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
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
