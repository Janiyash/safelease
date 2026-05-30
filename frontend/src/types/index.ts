export type UserRole = 'tenant' | 'owner' | 'admin';

export interface UserSummary {
  _id: string; name: string; email: string; role: UserRole; avatar?: string; phone?: string;
}
export interface AppNotification {
  _id: string; message: string; type: 'info'|'warning'|'success'|'error'; read: boolean; link?: string; createdAt: string;
}
export interface User extends UserSummary {
  isActive: boolean; isEmailVerified: boolean;
  assignedProperty?: PropertySummary;
  ownedProperties?: PropertySummary[];
  notifications: AppNotification[];
  createdAt: string;
}
export type PropertyStatus = 'available'|'rented'|'maintenance'|'pending_approval';
export interface PropertySummary { _id: string; title: string; address: string; city: string; status: PropertyStatus; }
export interface Property {
  _id: string; title: string; address: string; city: string; state: string; zipCode: string;
  rent: number; deposit: number; bedrooms: number; bathrooms: number; sqft: number;
  amenities: string[]; images: string[]; status: PropertyStatus; isApproved: boolean;
  owner: UserSummary; tenant?: UserSummary; description: string; hazardScore: number;
  lastInspected?: string; availableFrom: string; createdAt: string;
}
export type ComplaintStatus = 'pending'|'in_progress'|'resolved'|'closed';
export type ComplaintPriority = 'low'|'medium'|'high'|'urgent';
export type ComplaintCategory = 'maintenance'|'noise'|'security'|'cleanliness'|'billing'|'other';
export interface Comment {
  _id: string; author: UserSummary|string; authorName: string; authorRole: string;
  message: string; attachments: string[]; createdAt: string;
}
export interface Complaint {
  _id: string; title: string; description: string; category: ComplaintCategory;
  priority: ComplaintPriority; status: ComplaintStatus; raisedBy: UserSummary;
  property: PropertySummary; assignedTo?: UserSummary; attachments: string[];
  comments: Comment[]; resolvedAt?: string; resolvedBy?: UserSummary;
  resolutionNote?: string; createdAt: string; updatedAt: string;
}
export type NoticeCategory = 'general'|'emergency'|'maintenance'|'event'|'billing';
export interface Notice {
  _id: string; title: string; content: string; category: NoticeCategory;
  author: UserSummary; property?: PropertySummary; isGlobal: boolean;
  expiresAt?: string; isPinned: boolean; readBy: string[]; attachments: string[]; createdAt: string;
}
export interface Analytics {
  users: { total: number; tenants: number; owners: number; admins: number };
  properties: { total: number; approved: number; pending: number; occupancyRate: number };
  complaints: { total: number; open: number; resolved: number; resolutionRate: number };
  notices: { total: number };
  charts: {
    complaintsByStatus: { _id: string; count: number }[];
    complaintsByCategory: { _id: string; count: number }[];
    propertiesByStatus: { _id: string; count: number }[];
    monthlyComplaints: { _id: { year: number; month: number }; count: number }[];
  };
  recent: { complaints: Complaint[]; users: User[] };
}
export interface PropertyFilters { search: string; status: string; minRent: string; maxRent: string; city: string; bedrooms: string; }
export interface LoginForm { email: string; password: string; }
export interface SignupForm {
  name: string;
  email: string;
  password: string;
  role: 'tenant' | 'owner';
  phone?: string;
}
export interface ComplaintForm { title: string; description: string; category: ComplaintCategory; priority: ComplaintPriority; property: string; }
export interface PropertyForm { title: string; address: string; city: string; state: string; zipCode: string; rent: number; deposit: number; bedrooms: number; bathrooms: number; sqft: number; description: string; amenities: string; availableFrom: string; }
export interface NoticeForm { title: string; content: string; category: NoticeCategory; property?: string; isPinned?: boolean; isGlobal?: boolean; }

// ─── Rent Cycle Types ─────────────────────────────────────────────────────────
export type RentPaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled';
export type BillType          = 'rent' | 'maintenance' | 'deposit' | 'other';

export interface RentPayment {
  _id:             string;
  property:        PropertySummary & { rent: number };
  tenant:          UserSummary & { phone?: string };
  owner:           UserSummary;
  amount:          number;
  dueDate:         string;
  billingMonth:    number;
  billingYear:     number;
  gracePeriodDays: number;
  overdueAt?:      string;
  remindersSent:   string[];
  paidDate?:       string;
  status:          RentPaymentStatus;
  method?:         string;
  month:           string;
  billType:        BillType;
  receiptNo?:      string;
  notes?:          string;
  createdAt:       string;
}

export type RentNotifType   = 'UPCOMING_REMINDER' | 'DUE_TODAY_REMINDER' | 'OVERDUE_ALERT';
export type RentNotifStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'RETRYING';

export interface RentNotification {
  _id:         string;
  tenantId:    string;
  paymentId:   string | RentPayment;
  type:        RentNotifType;
  title:       string;
  message:     string;
  status:      RentNotifStatus;
  retryCount:  number;
  maxRetries:  number;
  sentAt?:     string;
  failedAt?:   string;
  errorMsg?:   string;
  createdAt:   string;
}

export type JobType   = 'MONTHLY_RENT_GENERATOR' | 'OVERDUE_DETECTOR' | 'NOTIFICATION_DISPATCHER';
export type JobStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface JobLog {
  _id:         string;
  jobId:       string;
  jobType:     JobType;
  status:      JobStatus;
  startedAt:   string;
  completedAt?: string;
  durationMs?: number;
  stats: { processed: number; succeeded: number; skipped: number; failed: number };
  errorMsg?:   string;
  meta:        Record<string, unknown>;
}

export type AuditEventType = string;

export interface AuditLog {
  _id:         string;
  eventType:   AuditEventType;
  entityType:  string;
  entityId?:   string;
  jobId?:      string;
  status:      'success' | 'failure' | 'skipped';
  payload:     Record<string, unknown>;
  errorMsg?:   string;
  createdAt:   string;
}
