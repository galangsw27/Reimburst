/**
 * Mock User Service Implementation
 * 
 * This service provides hardcoded user data for testing and development without requiring a database.
 * It implements the IUserService interface with in-memory data operations.
 * 
 * Mock Data Structure:
 * - 1 head user
 * - 1 finance user
 * - 3 lead users
 * - 13 regular users (assigned to leads)
 * 
 * Requirements: 7.3, 9.1, 9.2
 */

import { User } from '@/lib/types';
import { IUserService, CreateUserInput, UpdateUserInput } from '../types';

export class MockUserService implements IUserService {
  private users: User[] = [
    // Management roles (2 users)
    {
      id: '1',
      name: 'Head User',
      email: 'head@company.com',
      role: 'head',
    },
    {
      id: '2',
      name: 'Finance User',
      email: 'finance@company.com',
      role: 'finance',
    },
    
    // Leads (3 users)
    {
      id: '3',
      name: 'Lead One',
      email: 'lead1@company.com',
      role: 'lead',
    },
    {
      id: '4',
      name: 'Lead Two',
      email: 'lead2@company.com',
      role: 'lead',
    },
    {
      id: '5',
      name: 'Lead Three',
      email: 'lead3@company.com',
      role: 'lead',
    },
    
    // Regular users assigned to Lead One (5 users)
    {
      id: '6',
      name: 'User One',
      email: 'user1@company.com',
      role: 'user',
      leadId: '3',
      leadName: 'Lead One',
    },
    {
      id: '7',
      name: 'User Two',
      email: 'user2@company.com',
      role: 'user',
      leadId: '3',
      leadName: 'Lead One',
    },
    {
      id: '8',
      name: 'User Three',
      email: 'user3@company.com',
      role: 'user',
      leadId: '3',
      leadName: 'Lead One',
    },
    {
      id: '9',
      name: 'User Four',
      email: 'user4@company.com',
      role: 'user',
      leadId: '3',
      leadName: 'Lead One',
    },
    {
      id: '10',
      name: 'User Five',
      email: 'user5@company.com',
      role: 'user',
      leadId: '3',
      leadName: 'Lead One',
    },
    
    // Regular users assigned to Lead Two (4 users)
    {
      id: '11',
      name: 'User Six',
      email: 'user6@company.com',
      role: 'user',
      leadId: '4',
      leadName: 'Lead Two',
    },
    {
      id: '12',
      name: 'User Seven',
      email: 'user7@company.com',
      role: 'user',
      leadId: '4',
      leadName: 'Lead Two',
    },
    {
      id: '13',
      name: 'User Eight',
      email: 'user8@company.com',
      role: 'user',
      leadId: '4',
      leadName: 'Lead Two',
    },
    {
      id: '14',
      name: 'User Nine',
      email: 'user9@company.com',
      role: 'user',
      leadId: '4',
      leadName: 'Lead Two',
    },
    
    // Regular users assigned to Lead Three (4 users)
    {
      id: '15',
      name: 'User Ten',
      email: 'user10@company.com',
      role: 'user',
      leadId: '5',
      leadName: 'Lead Three',
    },
    {
      id: '16',
      name: 'User Eleven',
      email: 'user11@company.com',
      role: 'user',
      leadId: '5',
      leadName: 'Lead Three',
    },
    {
      id: '17',
      name: 'User Twelve',
      email: 'user12@company.com',
      role: 'user',
      leadId: '5',
      leadName: 'Lead Three',
    },
    {
      id: '18',
      name: 'User Thirteen',
      email: 'user13@company.com',
      role: 'user',
      leadId: '5',
      leadName: 'Lead Three',
    },
  ];

  /**
   * Retrieve all users
   * @returns Promise resolving to array of all users
   */
  async getUsers(): Promise<User[]> {
    return [...this.users]; // Return a copy to prevent external modifications
  }

  /**
   * Retrieve a specific user by ID
   * @param id - The user ID to look up
   * @returns Promise resolving to the user or null if not found
   */
  async getUserById(id: string): Promise<User | null> {
    const user = this.users.find(u => u.id === id);
    return user ? { ...user } : null; // Return a copy if found
  }

  /**
   * Create a new user
   * @param data - The user data to create
   * @returns Promise resolving to the created user
   * @throws Error if user with email already exists
   */
  async createUser(data: CreateUserInput): Promise<User> {
    // Check for duplicate email
    const existingUser = this.users.find(u => u.email === data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate new ID
    const newId = String(this.users.length + 1);

    // Get lead name if leadId is provided
    let leadName: string | undefined;
    if (data.leadId) {
      const lead = this.users.find(u => u.id === data.leadId);
      leadName = lead?.name;
    }

    // Create new user
    const newUser: User = {
      id: newId,
      name: data.name,
      email: data.email,
      role: data.role,
      leadId: data.leadId,
      leadName,
    };

    this.users.push(newUser);
    return { ...newUser };
  }

  /**
   * Update an existing user
   * @param id - The user ID to update
   * @param data - The fields to update (partial update supported)
   * @returns Promise resolving to the updated user
   * @throws Error if user not found
   */
  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error('User not found');
    }

    // Start with current user data
    const updatedUser: User = { ...this.users[index] };

    // Update fields that are provided
    if (data.name !== undefined) {
      updatedUser.name = data.name;
    }
    if (data.email !== undefined) {
      updatedUser.email = data.email;
    }
    if (data.role !== undefined) {
      updatedUser.role = data.role;
    }

    // Handle leadId and leadName together
    // Check if leadId property exists in the data object (even if undefined)
    if ('leadId' in data) {
      if (data.leadId) {
        // Setting to a specific lead
        updatedUser.leadId = data.leadId;
        const lead = this.users.find(u => u.id === data.leadId);
        updatedUser.leadName = lead?.name;
      } else {
        // Clearing the lead (leadId is undefined, null, or empty string)
        updatedUser.leadId = undefined;
        updatedUser.leadName = undefined;
      }
    }

    this.users[index] = updatedUser;
    return { ...updatedUser };
  }
}
