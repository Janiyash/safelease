import 'dotenv/config';
import mongoose from 'mongoose';
import { User }      from '../models/User';
import { Property }  from '../models/Property';
import { Complaint } from '../models/Complaint';
import { Notice }    from '../models/Notice';
import { Payment }   from '../models/Payment';
import { RentNotification } from '../models/RentNotification';

const makeDate  = (monthOffset: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset); return d; };
const makeMonth = (monthOffset: number) => { const d = makeDate(monthOffset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/safelease');
  console.log('Connected to MongoDB');

  // ── Clear ALL collections (removes any bad/test data like ₹2,22,222) ────────
  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Complaint.deleteMany({}),
    Notice.deleteMany({}),
    Payment.deleteMany({}),
    RentNotification.deleteMany({}),
  ]);
  console.log('✅ Cleared all existing data (including any bad payments)');

  // ── Users ────────────────────────────────────────────────────────────────────
  const admin = await User.create({
    name: 'Admin User', email: 'admin@safelease.com',
    password: 'Admin@1234', role: 'admin', isActive: true, isEmailVerified: true,
  });
  const owner = await User.create({
    name: 'Sarah Johnson', email: 'owner@safelease.com',
    password: 'Owner@1234', role: 'owner', phone: '555-0101', isActive: true, isEmailVerified: true,
  });
  const owner2 = await User.create({
    name: 'Marcus Chen', email: 'owner2@safelease.com',
    password: 'Owner@1234', role: 'owner', phone: '555-0102', isActive: true, isEmailVerified: true,
  });
  const tenant = await User.create({
    name: 'Alex Rivera', email: 'tenant@safelease.com',
    password: 'Tenant@1234', role: 'tenant', phone: '555-0202', isActive: true, isEmailVerified: true,
  });
  const tenant2 = await User.create({
    name: 'Maya Patel', email: 'tenant2@safelease.com',
    password: 'Tenant@1234', role: 'tenant', phone: '555-0303', isActive: true, isEmailVerified: true,
  });
  console.log('✅ Created 5 users (1 admin, 2 owners, 2 tenants)');

  // ── Properties ────────────────────────────────────────────────────────────────
  // Sarah owns prop1 & prop2 | Marcus owns prop3
  const prop1 = await Property.create({
    title: 'Sunset Apartments — Unit 4B',
    address: '1420 Harbor Blvd, Unit 4B', city: 'San Francisco', state: 'CA', zipCode: '94103',
    rent: 2800, deposit: 5600, bedrooms: 2, bathrooms: 1, sqft: 950,
    description: 'Bright, modern 2BR in the heart of SF. Floor-to-ceiling windows with bay views.',
    amenities: ['Parking', 'In-unit Laundry', 'Gym', 'Rooftop'],
    status: 'rented', isApproved: true,
    owner: owner._id, tenant: tenant._id,
    hazardScore: 94, availableFrom: new Date(),
  });
  const prop2 = await Property.create({
    title: 'Bay View Condo — 3BR',
    address: '2200 Pacific Heights Dr', city: 'San Francisco', state: 'CA', zipCode: '94115',
    rent: 4200, deposit: 8400, bedrooms: 3, bathrooms: 2, sqft: 1400,
    description: 'Stunning bay views from every room. Full concierge, private patio.',
    amenities: ['Parking x2', 'Pool', 'Concierge', 'Private Patio', 'Gym'],
    status: 'rented', isApproved: true,
    owner: owner._id, tenant: tenant2._id,
    hazardScore: 97, availableFrom: new Date(),
  });
  const prop3 = await Property.create({
    title: 'Downtown Loft — Studio',
    address: '885 Market St, Studio 7', city: 'San Francisco', state: 'CA', zipCode: '94102',
    rent: 1900, deposit: 3800, bedrooms: 0, bathrooms: 1, sqft: 520,
    description: 'Chic studio loft with industrial aesthetic. Open plan, exposed brick walls.',
    amenities: ['Doorman', 'Pet-friendly', 'Bike Storage'],
    status: 'available', isApproved: true,
    owner: owner2._id,
    hazardScore: 88, availableFrom: new Date(),
  });
  console.log('✅ Created 3 properties');

  // ── Link tenants ↔ properties & owners ────────────────────────────────────
  await User.findByIdAndUpdate(tenant._id,  { assignedProperty: prop1._id });
  await User.findByIdAndUpdate(tenant2._id, { assignedProperty: prop2._id });
  await User.findByIdAndUpdate(owner._id,   { ownedProperties: [prop1._id, prop2._id] });
  await User.findByIdAndUpdate(owner2._id,  { ownedProperties: [prop3._id] });
  console.log('✅ Linked tenants and owners to properties');

  // ── Payments — clean correct amounts only ────────────────────────────────────
  // Alex Rivera (tenant) — prop1 — rent ₹2800
  await Payment.create({
    property: prop1._id, tenant: tenant._id, owner: owner._id,
    amount: 2800, dueDate: makeDate(-2),
    paidDate: new Date(makeDate(-2).getTime() + 2*24*60*60*1000),
    status: 'paid', method: 'UPI',
    month: makeMonth(-2), billType: 'rent', notes: 'Monthly rent',
    receiptNo: `SL-${makeMonth(-2).replace('-','')}-001`,
  });
  await Payment.create({
    property: prop1._id, tenant: tenant._id, owner: owner._id,
    amount: 2800, dueDate: makeDate(-1),
    paidDate: new Date(makeDate(-1).getTime() + 1*24*60*60*1000),
    status: 'paid', method: 'Razorpay',
    month: makeMonth(-1), billType: 'rent', notes: 'Monthly rent',
    receiptNo: `SL-${makeMonth(-1).replace('-','')}-001`,
    razorpayPaymentId: 'pay_test_seed_002',
  });
  await Payment.create({
    property: prop1._id, tenant: tenant._id, owner: owner._id,
    amount: 2800, dueDate: makeDate(0),
    status: 'pending', month: makeMonth(0), billType: 'rent', notes: 'Monthly rent',
  });

  // Maya Patel (tenant2) — prop2 — rent ₹4200
  await Payment.create({
    property: prop2._id, tenant: tenant2._id, owner: owner._id,
    amount: 4200, dueDate: makeDate(-1),
    paidDate: new Date(makeDate(-1).getTime() + 3*24*60*60*1000),
    status: 'paid', method: 'Bank Transfer',
    month: makeMonth(-1), billType: 'rent', notes: 'Monthly rent',
    receiptNo: `SL-${makeMonth(-1).replace('-','')}-002`,
  });
  await Payment.create({
    property: prop2._id, tenant: tenant2._id, owner: owner._id,
    amount: 4200, dueDate: makeDate(0),
    status: 'pending', month: makeMonth(0), billType: 'rent', notes: 'Monthly rent',
  });

  console.log('✅ Created 5 clean payments (₹2800 & ₹4200 only — no wrong amounts)');

  // ── Complaints ───────────────────────────────────────────────────────────────
  await Complaint.create({
    title: 'Broken heating unit in bedroom', category: 'maintenance', priority: 'high', status: 'in_progress',
    description: 'The HVAC stopped working 3 days ago. Bedroom temp is around 55°F.',
    raisedBy: tenant._id, property: prop1._id,
    comments: [{ author: owner._id, authorName: 'Sarah Johnson', authorRole: 'owner', message: 'Technician scheduled for tomorrow 10AM.', attachments: [] }],
    createdAt: new Date(Date.now() - 3*24*60*60*1000),
  });
  await Complaint.create({
    title: 'Water leakage in bathroom', category: 'maintenance', priority: 'urgent', status: 'pending',
    description: 'There is a water leak under the bathroom sink causing water damage to the cabinet.',
    raisedBy: tenant._id, property: prop1._id,
    createdAt: new Date(Date.now() - 1*24*60*60*1000),
  });
  console.log('✅ Created 2 complaints');

  // ── Notices ──────────────────────────────────────────────────────────────────
  await Notice.create({
    title: 'Scheduled maintenance: Elevator servicing',
    content: 'The building elevator will be under maintenance on Saturday 10AM–2PM.',
    category: 'maintenance', author: owner._id, property: prop1._id, isPinned: true,
    createdAt: new Date(Date.now() - 2*24*60*60*1000),
  });
  await Notice.create({
    title: 'Welcome to SafeLease!',
    content: 'All maintenance requests, notices, and payments can be managed here in one place.',
    category: 'general', author: admin._id, isGlobal: true, isPinned: false,
  });
  console.log('✅ Created 2 notices');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Login credentials:');
  console.log('  Admin  : admin@safelease.com  / Admin@1234');
  console.log('  Owner  : owner@safelease.com  / Owner@1234  (Sarah — 2 rented properties)');
  console.log('  Owner2 : owner2@safelease.com / Owner@1234  (Marcus — 1 available property)');
  console.log('  Tenant : tenant@safelease.com / Tenant@1234 (Alex — Sunset Apartments ₹2800)');
  console.log('  Tenant2: tenant2@safelease.com/ Tenant@1234 (Maya — Bay View Condo ₹4200)\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
