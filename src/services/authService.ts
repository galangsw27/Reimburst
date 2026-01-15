import { User, UserRole } from '../types';

// Mock users - in production, this would come from a backend
const MOCK_USERS: User[] = [
    // Management Roles
    { id: 'head-1', name: 'Sarah Manager', email: 'head@company.com', role: 'head' },
    { id: 'finance-1', name: 'Alice Finance', email: 'finance@company.com', role: 'finance' },
    
    // Lead Team
    { id: 'lead-1', name: 'Ahmad Rizki', email: 'lead1@company.com', role: 'lead' },
    { id: 'lead-2', name: 'Budi Santoso', email: 'lead2@company.com', role: 'lead' },
    { id: 'lead-3', name: 'Citra Dewi', email: 'lead3@company.com', role: 'lead' },
    
    // Users under Lead 1 (Ahmad Rizki) - 4 users
    { id: 'user-1', name: 'Doni Pratama', email: 'user1@company.com', role: 'user', leadId: 'lead-1', leadName: 'Ahmad Rizki' },
    { id: 'user-2', name: 'Eka Putri', email: 'user2@company.com', role: 'user', leadId: 'lead-1', leadName: 'Ahmad Rizki' },
    { id: 'user-3', name: 'Fajar Nugroho', email: 'user3@company.com', role: 'user', leadId: 'lead-1', leadName: 'Ahmad Rizki' },
    { id: 'user-4', name: 'Gita Sari', email: 'user4@company.com', role: 'user', leadId: 'lead-1', leadName: 'Ahmad Rizki' },
    
    // Users under Lead 2 (Budi Santoso) - 5 users
    { id: 'user-5', name: 'Hendra Wijaya', email: 'user5@company.com', role: 'user', leadId: 'lead-2', leadName: 'Budi Santoso' },
    { id: 'user-6', name: 'Indah Permata', email: 'user6@company.com', role: 'user', leadId: 'lead-2', leadName: 'Budi Santoso' },
    { id: 'user-7', name: 'Joko Susilo', email: 'user7@company.com', role: 'user', leadId: 'lead-2', leadName: 'Budi Santoso' },
    { id: 'user-8', name: 'Kartika Sari', email: 'user8@company.com', role: 'user', leadId: 'lead-2', leadName: 'Budi Santoso' },
    { id: 'user-9', name: 'Lukman Hakim', email: 'user9@company.com', role: 'user', leadId: 'lead-2', leadName: 'Budi Santoso' },
    
    // Users under Lead 3 (Citra Dewi) - 4 users
    { id: 'user-10', name: 'Maya Anggraini', email: 'user10@company.com', role: 'user', leadId: 'lead-3', leadName: 'Citra Dewi' },
    { id: 'user-11', name: 'Nanda Pratama', email: 'user11@company.com', role: 'user', leadId: 'lead-3', leadName: 'Citra Dewi' },
    { id: 'user-12', name: 'Oki Setiawan', email: 'user12@company.com', role: 'user', leadId: 'lead-3', leadName: 'Citra Dewi' },
    { id: 'user-13', name: 'Putri Ayu', email: 'user13@company.com', role: 'user', leadId: 'lead-3', leadName: 'Citra Dewi' },
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
