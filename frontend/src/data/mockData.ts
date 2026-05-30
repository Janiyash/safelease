import { Property, Complaint, Notice, User, Analytics } from '../types';

export const MOCK_OWNERS: User[] = [
  { _id: 'o1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=47', phone: '555-0101', isActive: true, isEmailVerified: true, notifications: [], createdAt: '2023-06-01T00:00:00Z', ownedProperties: [] },
  { _id: 'o2', name: 'Marcus Chen', email: 'marcus@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=12', phone: '555-0202', isActive: true, isEmailVerified: true, notifications: [], createdAt: '2023-05-10T00:00:00Z', ownedProperties: [] },
  { _id: 'o3', name: 'Priya Patel', email: 'priya@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=32', phone: '555-0303', isActive: true, isEmailVerified: true, notifications: [], createdAt: '2023-07-20T00:00:00Z', ownedProperties: [] },
];

export const MOCK_TENANTS: User[] = [
  { _id: 't1', name: 'Alex Rivera', email: 'alex@example.com', role: 'tenant', avatar: 'https://i.pravatar.cc/150?img=52', phone: '555-1001', isActive: true, isEmailVerified: true, notifications: [], createdAt: '2024-01-15T00:00:00Z' },
  { _id: 't2', name: 'Jordan Kim', email: 'jordan@example.com', role: 'tenant', avatar: 'https://i.pravatar.cc/150?img=25', phone: '555-1002', isActive: true, isEmailVerified: true, notifications: [], createdAt: '2024-02-20T00:00:00Z' },
];

export const MOCK_PROPERTIES: Property[] = [
  {
    _id: 'p1', title: 'Sunset Apartments — Unit 4B',
    address: '1420 Harbor Blvd, Unit 4B', city: 'San Francisco', state: 'CA', zipCode: '94105',
    rent: 2800, deposit: 5600, bedrooms: 2, bathrooms: 1, sqft: 950,
    description: 'Bright, modern 2BR in the heart of SF. Floor-to-ceiling windows with bay views.',
    amenities: ['Parking', 'In-unit Laundry', 'Gym', 'Rooftop', 'Pet-friendly'],
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'],
    status: 'rented', isApproved: true, hazardScore: 94, availableFrom: '2024-06-01T00:00:00Z', createdAt: '2024-01-01T00:00:00Z',
    owner: { _id: 'o1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=47' },
    tenant: { _id: 't1', name: 'Alex Rivera', email: 'alex@example.com', role: 'tenant', avatar: 'https://i.pravatar.cc/150?img=52' },
  },
  {
    _id: 'p2', title: 'Downtown Loft — Studio 7',
    address: '885 Market St, Studio 7', city: 'San Francisco', state: 'CA', zipCode: '94103',
    rent: 1900, deposit: 3800, bedrooms: 0, bathrooms: 1, sqft: 520,
    description: 'Chic studio loft with industrial aesthetic. Open plan, exposed brick walls.',
    amenities: ['Doorman', 'Pet-friendly', 'Bike Storage', 'Rooftop'],
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80'],
    status: 'available', isApproved: true, hazardScore: 88, availableFrom: '2024-04-15T00:00:00Z', createdAt: '2024-01-05T00:00:00Z',
    owner: { _id: 'o2', name: 'Marcus Chen', email: 'marcus@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=12' },
  },
  {
    _id: 'p3', title: 'Bay View Condo — 3BR',
    address: '2200 Pacific Heights Dr', city: 'San Francisco', state: 'CA', zipCode: '94115',
    rent: 4200, deposit: 8400, bedrooms: 3, bathrooms: 2, sqft: 1400,
    description: 'Stunning bay views from every room. Full concierge, private patio, premium finishes.',
    amenities: ['Parking x2', 'Pool', 'Concierge', 'Private Patio', 'Gym'],
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80'],
    status: 'pending_approval', isApproved: false, hazardScore: 97, availableFrom: '2024-07-01T00:00:00Z', createdAt: '2024-02-10T00:00:00Z',
    owner: { _id: 'o3', name: 'Priya Patel', email: 'priya@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=32' },
  },
  {
    _id: 'p4', title: 'Marina District — 1BR',
    address: '55 Chestnut St, Apt 3F', city: 'San Francisco', state: 'CA', zipCode: '94123',
    rent: 2300, deposit: 4600, bedrooms: 1, bathrooms: 1, sqft: 720,
    description: 'Sunny, well-maintained 1BR in trendy Marina District. Close to shops and waterfront.',
    amenities: ['Storage', 'Laundry Room', 'Bicycle Parking'],
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80'],
    status: 'rented', isApproved: true, hazardScore: 91, availableFrom: '2024-03-01T00:00:00Z', createdAt: '2024-01-20T00:00:00Z',
    owner: { _id: 'o1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=47' },
    tenant: { _id: 't2', name: 'Jordan Kim', email: 'jordan@example.com', role: 'tenant', avatar: 'https://i.pravatar.cc/150?img=25' },
  },
  {
    _id: 'p5', title: 'Mission Modern — 2BR',
    address: '3100 16th St, Unit B', city: 'San Francisco', state: 'CA', zipCode: '94103',
    rent: 3100, deposit: 6200, bedrooms: 2, bathrooms: 2, sqft: 1050,
    description: 'Renovated Victorian in vibrant Mission. Original hardwood floors, updated kitchen.',
    amenities: ['Parking', 'Laundry', 'Private Yard', 'Dishwasher'],
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'],
    status: 'maintenance', isApproved: true, hazardScore: 79, availableFrom: '2024-05-01T00:00:00Z', createdAt: '2024-02-01T00:00:00Z',
    owner: { _id: 'o2', name: 'Marcus Chen', email: 'marcus@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=12' },
  },
  {
    _id: 'p6', title: 'SOMA Penthouse — 4BR',
    address: '450 Brannan St, PH', city: 'San Francisco', state: 'CA', zipCode: '94107',
    rent: 6800, deposit: 13600, bedrooms: 4, bathrooms: 3, sqft: 2100,
    description: 'Luxury penthouse with 360-degree city views, chef kitchen, and private terrace.',
    amenities: ['Valet', 'Pool', 'Spa', 'Private Terrace', 'Concierge', 'Wine Cellar'],
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80'],
    status: 'available', isApproved: true, hazardScore: 99, availableFrom: '2024-04-20T00:00:00Z', createdAt: '2024-03-01T00:00:00Z',
    owner: { _id: 'o3', name: 'Priya Patel', email: 'priya@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=32' },
  },
];

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    _id: 'c1', title: 'Broken heating unit in bedroom',
    description: 'The HVAC stopped working 3 days ago. Bedroom temp is around 55°F. Urgently need repair.',
    category: 'maintenance', priority: 'urgent', status: 'in_progress',
    raisedBy: { _id: 't1', name: 'Alex Rivera', email: 'alex@example.com', role: 'tenant', avatar: 'https://i.pravatar.cc/150?img=52' },
    property: { _id: 'p1', title: 'Sunset Apartments — Unit 4B', address: '1420 Harbor Blvd', city: 'San Francisco', status: 'rented' },
    attachments: [], createdAt: '2024-04-02T10:00:00Z', updatedAt: '2024-04-03T14:00:00Z',
    comments: [
      { _id: 'cm1', author: 'o1', authorName: 'Sarah Johnson', authorRole: 'owner', message: 'HVAC technician scheduled for tomorrow 10AM–2PM. Sorry for the inconvenience!', attachments: [], createdAt: '2024-04-03T09:00:00Z' }
    ],
  },
  {
    _id: 'c2', title: 'Loud noise from unit above after midnight',
    description: 'Unit 5C plays loud music every night past midnight. I have work early mornings.',
    category: 'noise', priority: 'medium', status: 'pending',
    raisedBy: { _id: 't1', name: 'Alex Rivera', email: 'alex@example.com', role: 'tenant', avatar: 'https://i.pravatar.cc/150?img=52' },
    property: { _id: 'p1', title: 'Sunset Apartments — Unit 4B', address: '1420 Harbor Blvd', city: 'San Francisco', status: 'rented' },
    attachments: [], comments: [], createdAt: '2024-04-05T22:00:00Z', updatedAt: '2024-04-05T22:00:00Z',
  },
  {
    _id: 'c3', title: 'Main entrance lock malfunction',
    description: 'Magnetic lock on lobby door is not engaging properly — security risk.',
    category: 'security', priority: 'high', status: 'resolved',
    raisedBy: { _id: 't2', name: 'Jordan Kim', email: 'jordan@example.com', role: 'tenant', avatar: 'https://i.pravatar.cc/150?img=25' },
    property: { _id: 'p4', title: 'Marina District — 1BR', address: '55 Chestnut St', city: 'San Francisco', status: 'rented' },
    attachments: [], comments: [], resolvedAt: '2024-03-30T16:00:00Z', resolutionNote: 'Lock mechanism fully replaced by certified locksmith.',
    createdAt: '2024-03-28T08:00:00Z', updatedAt: '2024-03-30T16:00:00Z',
  },
];

export const MOCK_NOTICES: Notice[] = [
  {
    _id: 'n1', title: 'Water shutdown — April 20 (9AM–3PM)',
    content: 'Annual pipe maintenance. Water supply interrupted for 6 hours. Please store water in advance and plan accordingly.',
    category: 'maintenance', isPinned: true, isGlobal: false,
    author: { _id: 'o1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=47' },
    property: { _id: 'p1', title: 'Sunset Apartments — Unit 4B', address: '1420 Harbor Blvd', city: 'San Francisco', status: 'rented' },
    readBy: [], attachments: [], createdAt: '2024-04-07T10:00:00Z',
  },
  {
    _id: 'n2', title: 'Welcome to SafeLease!',
    content: 'We\'re excited to have you on the platform. All maintenance requests, notices, and bill payments can be managed here in one place.',
    category: 'general', isPinned: false, isGlobal: true,
    author: { _id: 'a1', name: 'Admin', email: 'admin@safelease.com', role: 'admin' },
    readBy: [], attachments: [], createdAt: '2024-04-01T09:00:00Z',
  },
  {
    _id: 'n3', title: 'Emergency gas leak evacuation drill — Saturday 10AM',
    content: 'Mandatory evacuation drill for all residents. Please ensure all residents are aware and present. Takes approximately 30 minutes.',
    category: 'emergency', isPinned: true, isGlobal: false,
    author: { _id: 'o1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'owner', avatar: 'https://i.pravatar.cc/150?img=47' },
    property: { _id: 'p1', title: 'Sunset Apartments — Unit 4B', address: '1420 Harbor Blvd', city: 'San Francisco', status: 'rented' },
    readBy: [], attachments: [], createdAt: '2024-04-05T14:00:00Z',
  },
];

export const MOCK_ANALYTICS: Analytics = {
  users: { total: 6, tenants: 2, owners: 3, admins: 1 },
  properties: { total: 6, approved: 5, pending: 1, occupancyRate: 67 },
  complaints: { total: 12, open: 5, resolved: 7, resolutionRate: 58 },
  notices: { total: 8 },
  charts: {
    complaintsByStatus: [{ _id:'pending', count:3 },{ _id:'in_progress', count:2 },{ _id:'resolved', count:7 }],
    complaintsByCategory: [{ _id:'maintenance', count:5 },{ _id:'noise', count:3 },{ _id:'security', count:2 },{ _id:'cleanliness', count:2 }],
    propertiesByStatus: [{ _id:'rented', count:2 },{ _id:'available', count:2 },{ _id:'maintenance', count:1 },{ _id:'pending_approval', count:1 }],
    monthlyComplaints: [
      { _id:{ year:2024, month:1 }, count:3 },{ _id:{ year:2024, month:2 }, count:2 },
      { _id:{ year:2024, month:3 }, count:5 },{ _id:{ year:2024, month:4 }, count:2 },
    ],
  },
  recent: { complaints: MOCK_COMPLAINTS.slice(0,3), users: MOCK_TENANTS },
};