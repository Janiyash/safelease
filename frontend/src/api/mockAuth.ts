// Mock authentication — used when backend is unavailable
// Supports all three demo accounts shown on the login screen

import { User } from '../types';

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@safelease.com': {
    password: 'Admin@1234',
    user: {
      _id: 'admin1',
      name: 'Admin User',
      email: 'admin@safelease.com',
      role: 'admin',
      avatar: 'https://i.pravatar.cc/150?img=68',
      phone: '555-0001',
      isActive: true,
      isEmailVerified: true,
      notifications: [
        { _id: 'n1', message: 'New property pending approval', type: 'info', read: false, createdAt: new Date().toISOString() },
        { _id: 'n2', message: 'New complaint filed by Alex Rivera', type: 'warning', read: false, createdAt: new Date().toISOString() },
      ],
      createdAt: '2023-01-01T00:00:00Z',
      ownedProperties: [],
    },
  },
  'owner@safelease.com': {
    password: 'Owner@1234',
    user: {
      _id: 'owner1',
      name: 'Sarah Johnson',
      email: 'owner@safelease.com',
      role: 'owner',
      avatar: 'https://i.pravatar.cc/150?img=47',
      phone: '555-0101',
      isActive: true,
      isEmailVerified: true,
      notifications: [
        { _id: 'n3', message: 'Tenant Alex Rivera filed a maintenance request', type: 'warning', read: false, createdAt: new Date().toISOString() },
      ],
      createdAt: '2023-06-01T00:00:00Z',
      ownedProperties: [],
    },
  },
  'tenant@safelease.com': {
    password: 'Tenant@1234',
    user: {
      _id: 'tenant1',
      name: 'Alex Rivera',
      email: 'tenant@safelease.com',
      role: 'tenant',
      avatar: 'https://i.pravatar.cc/150?img=52',
      phone: '555-1001',
      isActive: true,
      isEmailVerified: true,
      notifications: [
        { _id: 'n4', message: 'Your complaint has been updated to In Progress', type: 'success', read: false, createdAt: new Date().toISOString() },
      ],
      createdAt: '2024-01-15T00:00:00Z',
    },
  },
};

const MOCK_TOKEN = 'mock-jwt-token-safelease-demo';
const STORAGE_KEY = 'mock_logged_in_email';

export const mockLogin = (email: string, password: string): { user: User; accessToken: string } => {
  const entry = MOCK_USERS[email.toLowerCase()];
  if (!entry) throw new Error('No account found with that email.');
  if (entry.password !== password) throw new Error('Incorrect password.');
  localStorage.setItem(STORAGE_KEY, email.toLowerCase());
  return { user: entry.user, accessToken: MOCK_TOKEN };
};

export const mockGetMe = (): User => {
  const email = localStorage.getItem(STORAGE_KEY);
  if (!email || !MOCK_USERS[email]) throw new Error('Not authenticated');
  return MOCK_USERS[email].user;
};

export const mockLogout = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const isMockToken = (token: string | null) => token === MOCK_TOKEN;