/**
 * Role-based permission utility for enhanced role matrix enforcement
 * Implements the role matrix from Requirements section 3
 */

import { UserRole, User } from '@/lib/types'

// Role Matrix from Requirements section 3
export interface RoleMatrix {
  [key: string]: {
    [role in UserRole]: boolean
  }
}

// Enhanced role matrix based on requirements
export const ROLE_MATRIX: RoleMatrix = {
  // User Management (Add/Edit/Del)
  'user.create': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },
  'user.read': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },
  'user.update': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },
  'user.delete': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },

  // Project Management (Add/Edit/Del)
  'project.create': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },
  'project.read': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },
  'project.update': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },
  'project.delete': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },

  // Asset Management (Add)
  'asset.create': {
    tester: true,
    lead: true,
    head: true,
    finance: false,
  },
  'asset.read': {
    tester: true,
    lead: true,
    head: true,
    finance: false,
  },
  'asset.update': {
    tester: true,
    lead: true,
    head: true,
    finance: false,
  },
  'asset.delete': {
    tester: true,
    lead: true,
    head: true,
    finance: false,
  },

  // Reimbursement (Request/Upload)
  'reimbursement.create': {
    tester: true,
    lead: false,
    head: false,
    finance: false,
  },
  'reimbursement.read': {
    tester: true,
    lead: true,
    head: true,
    finance: true,
  },
  'reimbursement.upload': {
    tester: true,
    lead: false,
    head: false,
    finance: false,
  },

  // Approval Process
  'approval.level1': {
    tester: false,
    lead: true,
    head: false,
    finance: false,
  },
  'approval.level2': {
    tester: false,
    lead: false,
    head: true,
    finance: false,
  },
  'approval.final': {
    tester: false,
    lead: false,
    head: false,
    finance: true,
  },

  // Reporting (Download)
  'report.download': {
    tester: false,
    lead: true,
    head: true,
    finance: true,
  },
  'report.read': {
    tester: false,
    lead: true,
    head: true,
    finance: true,
  },

  // Navigation permissions
  'nav.dashboard': {
    tester: true,
    lead: true,
    head: true,
    finance: true,
  },
  'nav.request': {
    tester: true,
    lead: true,
    head: true,
    finance: false,
  },
  'nav.projects': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },
  'nav.users': {
    tester: false,
    lead: true,
    head: true,
    finance: false,
  },
  'nav.assets': {
    tester: true,
    lead: true,
    head: true,
    finance: false,
  },
  'nav.approvals': {
    tester: false,
    lead: true,
    head: true,
    finance: true,
  },
  'nav.reports': {
    tester: false,
    lead: false,
    head: false,
    finance: true,
  },
}

/**
 * Check if a user has permission for a specific action
 * @param user - The user to check permissions for
 * @param permission - The permission key to check
 * @returns boolean indicating if user has permission
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false
  
  // Check if user is active - inactive users have no permissions
  if (user.status === 'INACTIVE') return false
  
  // Check if permission exists in matrix
  if (!ROLE_MATRIX[permission]) {
    console.warn(`Permission '${permission}' not found in role matrix`)
    return false
  }
  
  return ROLE_MATRIX[permission][user.role] || false
}

/**
 * Check if user has any of the specified permissions
 * @param user - The user to check permissions for
 * @param permissions - Array of permission keys to check
 * @returns boolean indicating if user has at least one permission
 */
export function hasAnyPermission(user: User | null, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if user has all of the specified permissions
 * @param user - The user to check permissions for
 * @param permissions - Array of permission keys to check
 * @returns boolean indicating if user has all permissions
 */
export function hasAllPermissions(user: User | null, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Get all permissions for a specific role
 * @param role - The role to get permissions for
 * @returns Array of permission keys that the role has access to
 */
export function getRolePermissions(role: UserRole): string[] {
  return Object.keys(ROLE_MATRIX).filter(permission => ROLE_MATRIX[permission][role])
}

/**
 * Check if user can access a specific route based on required permissions
 * @param user - The user to check access for
 * @param requiredPermissions - Array of permissions required for the route
 * @returns boolean indicating if user can access the route
 */
export function canAccessRoute(user: User | null, requiredPermissions: string[]): boolean {
  if (!user || user.status === 'INACTIVE') return false
  
  // If no permissions required, allow access for active users
  if (!requiredPermissions || requiredPermissions.length === 0) return true
  
  // User must have at least one of the required permissions
  return hasAnyPermission(user, requiredPermissions)
}

/**
 * Legacy role-based permission check for backward compatibility
 * @param user - The user to check permissions for
 * @param requiredRoles - Array of roles that can access the resource
 * @returns boolean indicating if user has required role
 */
export function hasRequiredRole(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user || user.status === 'INACTIVE') return false
  
  if (!requiredRoles || requiredRoles.length === 0) return true
  
  return requiredRoles.includes(user.role)
}