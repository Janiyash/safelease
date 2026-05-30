import { api } from './client';
import { LoginForm, SignupForm, ComplaintForm, PropertyForm, NoticeForm } from '../types';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  signup:         (data: SignupForm)          => api.post('/auth/signup', data),
  login:          (data: LoginForm)           => api.post('/auth/login', data),
  logout:         ()                          => api.post('/auth/logout'),
  getMe:          ()                          => api.get('/auth/me'),
  forgotPassword: (email: string)             => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

// ── Email OTP 2FA ─────────────────────────────────────────────────────────────
export const twoFactorApi = {
  /**
   * Step-2 of login — verify the 6-digit OTP sent to email.
   * Pass tempToken (Bearer) returned from /login.
   */
  verify: (otp: string, tempToken: string) =>
    api.post('/auth/2fa/verify', { otp }, {
      headers: { Authorization: `Bearer ${tempToken}` },
    }),

  /**
   * Resend OTP (1-min cooldown enforced server-side).
   * Pass tempToken (Bearer) returned from /login.
   */
  resend: (tempToken: string) =>
    api.post('/auth/2fa/resend', {}, {
      headers: { Authorization: `Bearer ${tempToken}` },
    }),

  /** Enable 2FA for the currently logged-in user — no body needed. */
  enable: () => api.post('/auth/2fa/enable'),

  /** Disable 2FA — requires current password for confirmation. */
  disable: (password: string) => api.post('/auth/2fa/disable', { password }),

  /** Get current 2FA enabled/disabled status. */
  getStatus: () => api.get('/auth/2fa/status'),
};

// ── Properties ────────────────────────────────────────────────────────────────
export const propertyApi = {
  getAll:       (params?: Record<string, unknown>) => api.get('/properties', { params }),
  getById:      (id: string)                       => api.get(`/properties/${id}`),
  create:       (data: FormData)                   => api.post('/properties', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:       (id: string, data: FormData | Partial<PropertyForm>) =>
    api.put(`/properties/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  delete:       (id: string)                       => api.delete(`/properties/${id}`),
  assignTenant: (id: string, tenantId: string)     => api.post(`/properties/${id}/assign-tenant`, { tenantId }),
  approve:      (id: string)                       => api.patch(`/properties/${id}/approve`),
};

// ── Complaints ────────────────────────────────────────────────────────────────
export const complaintApi = {
  getAll:       (params?: Record<string, unknown>) => api.get('/complaints', { params }),
  getById:      (id: string)                       => api.get(`/complaints/${id}`),
  create:       (data: FormData)                   => api.post('/complaints', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id: string, data: { status: string; resolutionNote?: string; assignedTo?: string }) =>
    api.patch(`/complaints/${id}/status`, data),
  addComment:   (id: string, data: FormData)       =>
    api.post(`/complaints/${id}/comments`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ── Notices ───────────────────────────────────────────────────────────────────
export const noticeApi = {
  getAll:   (params?: Record<string, unknown>) => api.get('/notices', { params }),
  create:   (data: NoticeForm)                 => api.post('/notices', data),
  markRead: (id: string)                       => api.patch(`/notices/${id}/read`),
  delete:   (id: string)                       => api.delete(`/notices/${id}`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getAnalytics:     ()                                      => api.get('/admin/analytics'),
  getUsers:         (params?: Record<string, unknown>)      => api.get('/admin/users', { params }),
  updateUserStatus: (id: string, isActive: boolean)         => api.patch(`/admin/users/${id}/status`, { isActive }),
  updateUserRole:   (id: string, role: string)              => api.patch(`/admin/users/${id}/role`, { role }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationApi = {
  getAll:      (params?: Record<string, any>) => api.get('/notifications', { params }),
  markRead:    (data: { ids: string[] })      => api.patch('/notifications/read', data),
  markAllRead: ()                             => api.patch('/notifications/read-all'),
  dismiss:     (id: string)                   => api.delete(`/notifications/${id}`),
  dismissAll:  ()                             => api.delete('/notifications'),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  getAll:    ()                              => api.get('/payments'),
  create:    (data: any)                     => api.post('/payments', data),
  markPaid:  (id: string, method: string)    => api.patch(`/payments/${id}/mark-paid`, { method }),
  payOnline: (id: string, data: any)         => api.post(`/payments/${id}/pay-online`, data),
  delete:    (id: string)                    => api.delete(`/payments/${id}`),
};

// ── Rent ──────────────────────────────────────────────────────────────────────
export const rentApi = {
  getPayments:      (params?: Record<string, unknown>) => api.get('/rent-payments', { params }),
  getById:          (id: string)                       => api.get(`/rent-payments/${id}`),
  markPaid:         (id: string, method: string)       => api.patch(`/rent-payments/${id}/pay`, { method }),
  getNotifications: (params?: Record<string, unknown>) => api.get('/rent-notifications', { params }),
};

export const jobsApi = {
  getStatus: (params?: Record<string, unknown>) => api.get('/jobs/status', { params }),
  trigger:   (type: 'rent-generator' | 'overdue-detector' | 'notification-dispatcher') =>
    api.post(`/jobs/${type}/trigger`),
};

export const auditApi = {
  getLogs: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }),
};
