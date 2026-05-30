// ─────────────────────────────────────────────────────────────────────────────
// Central mock data store — single source of truth for ALL offline operations.
// ALL queries AND mutations use these arrays so UI always reflects changes.
// staleTime must be 0 on all queries that use this store.
// ─────────────────────────────────────────────────────────────────────────────
import { MOCK_COMPLAINTS, MOCK_NOTICES, MOCK_PROPERTIES, MOCK_TENANTS, MOCK_OWNERS } from '../data/mockData';
import { Complaint, Notice, Property } from '../types';

// ── Payment types ─────────────────────────────────────────────────────────────
export type PayStatus = 'paid' | 'pending' | 'overdue' | 'partial';

export interface Payment {
  id: string;
  tenant: string;
  tenantId: string;
  property: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PayStatus;
  method?: string;
  receiptNo?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

// ── Mutable in-memory stores ─────────────────────────────────────────────────
export let mockStore = {
  complaints: [...MOCK_COMPLAINTS] as Complaint[],
  notices:    [...MOCK_NOTICES]    as Notice[],
  properties: [...MOCK_PROPERTIES] as Property[],
  users: [
    ...MOCK_TENANTS,
    ...MOCK_OWNERS,
    { _id: 'admin1', name: 'Admin User', email: 'admin@safelease.com', role: 'admin' as const, phone: '555-0001', isActive: true, isEmailVerified: true, notifications: [], createdAt: '2023-01-01T00:00:00Z' },
  ] as any[],
  payments: [
    { id: 'pay1', tenant: 'Alex Rivera',  tenantId: 'tenant1', property: 'Sunset Apartments 4B',    amount: 2800, dueDate: '2026-04-01', paidDate: '2026-04-01', status: 'paid'    as PayStatus, method: 'Bank Transfer', receiptNo: 'RCP-2604-001' },
    { id: 'pay2', tenant: 'Jordan Kim',   tenantId: 't2',       property: 'Marina District 1BR',      amount: 2300, dueDate: '2026-04-01', paidDate: '2026-04-03', status: 'paid'    as PayStatus, method: 'Online',       receiptNo: 'RCP-2604-002' },
    { id: 'pay3', tenant: 'Alex Rivera',  tenantId: 'tenant1', property: 'Sunset Apartments 4B',    amount: 2800, dueDate: '2026-05-01', status: 'pending'  as PayStatus },
    { id: 'pay4', tenant: 'Jordan Kim',   tenantId: 't2',       property: 'Marina District 1BR',      amount: 2300, dueDate: '2026-05-01', status: 'pending'  as PayStatus },
    { id: 'pay5', tenant: 'Maria Santos', tenantId: 'tenant3', property: 'Downtown Loft Studio 7',  amount: 1900, dueDate: '2026-04-01', status: 'overdue'  as PayStatus },
  ] as Payment[],
};

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));
const uid = () => `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ── Analytics — always computed from actual store so numbers match ─────────────
export const getMockAnalytics = () => ({
  users: {
    total:   mockStore.users.length,
    tenants: mockStore.users.filter(u => u.role === 'tenant').length,
    owners:  mockStore.users.filter(u => u.role === 'owner').length,
    admins:  mockStore.users.filter(u => u.role === 'admin').length,
  },
  properties: {
    total:        mockStore.properties.length,
    approved:     mockStore.properties.filter(p => p.isApproved).length,
    pending:      mockStore.properties.filter(p => !p.isApproved).length,
    occupancyRate: Math.round(mockStore.properties.filter(p => p.status === 'rented').length / Math.max(mockStore.properties.length, 1) * 100),
  },
  complaints: {
    total:          mockStore.complaints.length,
    open:           mockStore.complaints.filter(c => c.status === 'pending' || c.status === 'in_progress').length,
    resolved:       mockStore.complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
    resolutionRate: Math.round(mockStore.complaints.filter(c => c.status === 'resolved').length / Math.max(mockStore.complaints.length, 1) * 100),
  },
  notices: { total: mockStore.notices.length },
  payments: {
    totalCollected: mockStore.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    totalPending:   mockStore.payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0),
    overdueCount:   mockStore.payments.filter(p => p.status === 'overdue').length,
  },
  charts: {
    complaintsByStatus:   ['pending','in_progress','resolved','closed'].map(s => ({ _id: s, count: mockStore.complaints.filter(c => c.status === s).length })).filter(x => x.count > 0),
    complaintsByCategory: ['maintenance','noise','security','cleanliness','billing','other'].map(s => ({ _id: s, count: mockStore.complaints.filter(c => c.category === s).length })).filter(x => x.count > 0),
    propertiesByStatus:   ['available','rented','maintenance','pending_approval'].map(s => ({ _id: s, count: mockStore.properties.filter(p => p.status === s).length })).filter(x => x.count > 0),
    monthlyComplaints:    [3, 4, 5].map(m => ({ _id: { year: 2026, month: m }, count: m === 4 ? mockStore.complaints.length : Math.floor(mockStore.complaints.length * 0.6) })),
  },
  recent: {
    complaints: mockStore.complaints.slice(0, 3),
    users:      mockStore.users.slice(0, 5),
  },
});

// ── Complaints ─────────────────────────────────────────────────────────────────
export const mockComplaintOps = {
  getAll: async () => {
    await delay();
    return { complaints: mockStore.complaints, total: mockStore.complaints.length };
  },

  create: async (data: any) => {
    await delay();
    const get = (key: string) => data instanceof FormData ? data.get(key) as string : data[key];
    const prop = mockStore.properties.find(p => p._id === get('property'));
    const c: Complaint = {
      _id: uid(),
      title: get('title'),
      description: get('description'),
      category: get('category') as any || 'other',
      priority:  get('priority') as any  || 'medium',
      status: 'pending',
      raisedBy: { _id: 'tenant1', name: 'Alex Rivera', email: 'tenant@safelease.com', role: 'tenant' },
      property: (prop || mockStore.properties[0]) as any,
      attachments: [], comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.complaints = [c, ...mockStore.complaints];
    return c;
  },

  updateStatus: async (id: string, data: any) => {
    await delay();
    mockStore.complaints = mockStore.complaints.map(c =>
      c._id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    );
    return mockStore.complaints.find(c => c._id === id);
  },

  addComment: async (complaintId: string, data: any) => {
    await delay();
    const msg = data instanceof FormData ? data.get('message') as string : data.message;
    const comment = {
      _id: uid(), author: 'u1', authorName: 'You', authorRole: 'tenant',
      message: msg, attachments: [], createdAt: new Date().toISOString(),
    };
    mockStore.complaints = mockStore.complaints.map(c =>
      c._id === complaintId ? { ...c, comments: [...(c.comments || []), comment] } : c
    );
    return comment;
  },
};

// ── Notices ────────────────────────────────────────────────────────────────────
export const mockNoticeOps = {
  getAll: async () => {
    await delay();
    return { notices: mockStore.notices, total: mockStore.notices.length };
  },

  create: async (data: any) => {
    await delay();
    const prop = mockStore.properties.find(p => p._id === data.property);
    const n: Notice = {
      _id: uid(), title: data.title, content: data.content,
      category: data.category || 'general',
      author: { _id: 'o1', name: 'Sarah Johnson', email: 'owner@safelease.com', role: 'owner' },
      property: prop as any,
      isGlobal: !data.property || data.property === '',
      isPinned: !!data.isPinned,
      readBy: [], attachments: [],
      createdAt: new Date().toISOString(),
    };
    mockStore.notices = [n, ...mockStore.notices];
    return n;
  },

  delete: async (id: string) => {
    await delay();
    mockStore.notices = mockStore.notices.filter(n => n._id !== id);
    return { success: true };
  },

  markRead: async (id: string) => {
    await delay();
    mockStore.notices = mockStore.notices.map(n =>
      n._id === id ? { ...n, readBy: [...(n.readBy || []), 'current_user'] } : n
    );
    return { success: true };
  },
};

// ── Properties ─────────────────────────────────────────────────────────────────
export const mockPropertyOps = {
  getAll: async () => {
    await delay();
    return { properties: mockStore.properties, total: mockStore.properties.length };
  },

  approve: async (id: string) => {
    await delay();
    mockStore.properties = mockStore.properties.map(p =>
      p._id === id ? { ...p, isApproved: true, status: 'available' as const } : p
    );
    return { properties: mockStore.properties };
  },

  delete: async (id: string) => {
    await delay();
    mockStore.properties = mockStore.properties.filter(p => p._id !== id);
    return { success: true };
  },

  assignTenant: async (propertyId: string, tenantId: string) => {
    await delay();
    const tenant = mockStore.users.find(u => u._id === tenantId);
    if (!tenant) throw new Error('Tenant not found');
    mockStore.properties = mockStore.properties.map(p =>
      p._id === propertyId
        ? { ...p, tenant: { _id: tenant._id, name: tenant.name, email: tenant.email, role: 'tenant' as const }, status: 'rented' as const }
        : p
    );
    return { properties: mockStore.properties };
  },
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const mockUserOps = {
  getAll: async (params?: any) => {
    await delay();
    let result = [...mockStore.users];
    if (params?.search) {
      const s = params.search.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (params?.role && params.role !== 'all') {
      result = result.filter(u => u.role === params.role);
    }
    return { users: result, total: result.length };
  },

  updateStatus: async (id: string, isActive: boolean) => {
    await delay();
    mockStore.users = mockStore.users.map(u => u._id === id ? { ...u, isActive } : u);
    return { success: true };
  },

  updateRole: async (id: string, role: string) => {
    await delay();
    mockStore.users = mockStore.users.map(u => u._id === id ? { ...u, role } : u);
    return { success: true };
  },
};

// ── Payments (NEW — shared store so tenant pay → admin sees update) ─────────────
export const mockPaymentOps = {
  getAll: async (tenantId?: string) => {
    await delay();
    const payments = tenantId
      ? mockStore.payments.filter(p => p.tenantId === tenantId)
      : mockStore.payments;
    return { payments, total: payments.length };
  },

  // Called when owner/admin marks payment as paid manually
  markPaid: async (id: string, method: string) => {
    await delay();
    mockStore.payments = mockStore.payments.map(p =>
      p.id === id
        ? { ...p, status: 'paid' as PayStatus, paidDate: new Date().toISOString().split('T')[0], method, receiptNo: `RCP-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-4)}` }
        : p
    );
    return mockStore.payments.find(p => p.id === id);
  },

  // Called when tenant completes Razorpay payment
  recordRazorpayPayment: async (id: string, razorpayPaymentId: string, razorpayOrderId: string) => {
    await delay();
    mockStore.payments = mockStore.payments.map(p =>
      p.id === id
        ? { ...p, status: 'paid' as PayStatus, paidDate: new Date().toISOString().split('T')[0], method: 'Razorpay', razorpayPaymentId, razorpayOrderId, receiptNo: `RCP-RPY-${String(Date.now()).slice(-5)}` }
        : p
    );
    return mockStore.payments.find(p => p.id === id);
  },

  // Simulate creating a Razorpay order
  createOrder: async (paymentId: string) => {
    await delay(500);
    return {
      orderId: `order_${Date.now()}`,
      amount: (mockStore.payments.find(p => p.id === paymentId)?.amount || 0) * 100, // paise
      currency: 'INR',
    };
  },
};

// ── Tenants list for assign modal ──────────────────────────────────────────────
export const getMockTenants = async () => {
  await delay();
  const tenants = mockStore.users.filter(u => u.role === 'tenant');
  return { users: tenants, total: tenants.length };
};
