import { User, UserRole } from '../types';

// Mock users - in production, this would come from a backend
const MOCK_USERS: User[] = [
    { id: '1', name: 'John Doe', email: 'user@company.com', role: 'user' },
    { id: '2', name: 'Jane Smith', email: 'head@company.com', role: 'head' },
    { id: '3', name: 'Bob Johnson', email: 'lead@company.com', role: 'lead' },
    { id: '4', name: 'Alice Finance', email: 'finance@company.com', role: 'finance' },
];

export const login = (email: string, password: string): User | null => {
    // Mock authentication - in production, validate against backend
    const user = MOCK_USERS.find(u => u.email === email);
    if (user && password) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    }
    return null;
};

export const logout = (): void => {
    localStorage.removeItem('currentUser');
};

export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
};

export const getAllUsers = (): User[] => {
    return MOCK_USERS;
};
