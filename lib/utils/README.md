# Validation Utilities

This directory contains validation utilities for the database migration feature.

## Overview

The validation utilities provide functions to validate user input before creating or updating records in the database. These utilities are designed to be used by API routes to ensure data integrity and provide clear error messages to clients.

## Files

- **validation.ts**: Core validation functions
- **validation.test.ts**: Unit tests for validation functions
- **validation.example.ts**: Example usage patterns for API routes

## Functions

### `isValidEmail(email: string): boolean`

Validates if a string is a valid email format.

**Requirements**: 8.1

**Parameters**:
- `email` (string): The email string to validate

**Returns**: `boolean` - true if the email is valid, false otherwise

**Example**:
```typescript
import { isValidEmail } from '@/lib/utils/validation';

if (!isValidEmail('user@example.com')) {
  return { error: 'Invalid email format', status: 400 };
}
```

**Validation Rules**:
- Must contain exactly one `@` symbol
- Must have text before the `@` symbol (local part)
- Must have a domain after the `@` symbol
- Domain must contain at least one dot
- No whitespace allowed

### `validateRole(role: string): role is UserRole`

Validates if a role is one of the allowed user roles.

**Requirements**: 8.2

**Parameters**:
- `role` (string): The role string to validate

**Returns**: `boolean` - true if the role is valid, false otherwise

**Example**:
```typescript
import { validateRole } from '@/lib/utils/validation';

if (!validateRole(data.role)) {
  return { 
    error: 'Invalid role. Must be one of: head, finance, lead, user',
    status: 400 
  };
}
```

**Valid Roles**:
- `head` - Head user (management)
- `finance` - Finance user (management)
- `lead` - Lead user (manages regular users)
- `user` - Regular user (belongs to a lead)

### `validateLeadReference(role: string, leadId: string | undefined, getUserById: Function): Promise<boolean>`

Validates that a lead reference is valid for a user with role 'user'.

**Requirements**: 8.3

**Parameters**:
- `role` (string): The role of the user being created/updated
- `leadId` (string | undefined): The lead ID to validate (optional)
- `getUserById` (Function): Async function to fetch a user by ID

**Returns**: `Promise<boolean>` - true if validation passes, false otherwise

**Example**:
```typescript
import { validateLeadReference } from '@/lib/utils/validation';
import { getUserService } from '@/lib/services/factory';

const userService = getUserService();
const isValid = await validateLeadReference(
  data.role,
  data.leadId,
  (id) => userService.getUserById(id)
);

if (!isValid) {
  return { 
    error: 'Invalid lead reference. Users with role "user" must have a valid lead_id',
    status: 400 
  };
}
```

**Validation Rules**:
- If role is NOT 'user': validation always passes (leadId is optional)
- If role IS 'user':
  - leadId must be provided
  - leadId must reference an existing user
  - The referenced user must have role 'lead'

## Usage in API Routes

Here's a complete example of how to use all validation utilities in a POST /api/users route:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '@/lib/services/factory';
import { isValidEmail, validateRole, validateLeadReference } from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate email
    if (!data.email || !isValidEmail(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate role
    if (!data.role || !validateRole(data.role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: head, finance, lead, user' },
        { status: 400 }
      );
    }
    
    // Validate lead reference
    const userService = getUserService();
    const isValidLead = await validateLeadReference(
      data.role,
      data.leadId,
      (id) => userService.getUserById(id)
    );
    
    if (!isValidLead) {
      return NextResponse.json(
        { error: 'Users with role "user" must have a valid lead_id' },
        { status: 400 }
      );
    }
    
    // All validations passed, create user
    const user = await userService.createUser(data);
    return NextResponse.json(user, { status: 201 });
    
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

## Testing

The validation utilities are thoroughly tested with unit tests covering:

- Valid inputs for each function
- Invalid inputs and edge cases
- Error handling
- Type safety

Run tests with:
```bash
npm test -- lib/utils/validation.test.ts
```

## Requirements Mapping

- **Requirement 8.1**: Email validation - `isValidEmail()`
- **Requirement 8.2**: Role validation - `validateRole()`
- **Requirement 8.3**: Lead reference validation - `validateLeadReference()`

## Design Document Reference

See `.kiro/specs/database-migration/design.md` for:
- Property 12: Email Validation
- Property 13: Role Validation
- Property 14: Lead Reference Validation
- Property 15: Validation Error Response Format
