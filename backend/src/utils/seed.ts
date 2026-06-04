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

  // ── Clear ALL collections ─────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Complaint.deleteMany({}),
    Notice.deleteMany({}),
    Payment.deleteMany({}),
    RentNotification.deleteMany({}),
  ]);
  console.log('✅ Cleared all existing data');

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await User.create({
    name: 'Rahul Sharma', email: 'admin@safelease.com',
    password: 'Admin@1234', role: 'admin', isActive: true, isEmailVerified: true,
  });

  // Owner 1 — Sarah (kept for login compat, now Indian identity)
  const owner = await User.create({
    name: 'Priya Mehta', email: 'owner@safelease.com',
    password: 'Owner@1234', role: 'owner', phone: '9876543210', isActive: true, isEmailVerified: true,
  });

  // Owner 2
  const owner2 = await User.create({
    name: 'Arjun Kapoor', email: 'owner2@safelease.com',
    password: 'Owner@1234', role: 'owner', phone: '9845001122', isActive: true, isEmailVerified: true,
  });

  // Tenants
  const tenant = await User.create({
    name: 'Vikram Nair', email: 'tenant@safelease.com',
    password: 'Tenant@1234', role: 'tenant', phone: '9700112233', isActive: true, isEmailVerified: true,
  });
  const tenant2 = await User.create({
    name: 'Sneha Iyer', email: 'tenant2@safelease.com',
    password: 'Tenant@1234', role: 'tenant', phone: '9611223344', isActive: true, isEmailVerified: true,
  });
  const tenant3 = await User.create({
    name: 'Rohit Desai', email: 'tenant3@safelease.com',
    password: 'Tenant@1234', role: 'tenant', phone: '9533445566', isActive: true, isEmailVerified: true,
  });
  console.log('✅ Created 6 users (1 admin, 2 owners, 3 tenants)');

  // ── Properties — Real Indian Locations & Market Rents ─────────────────────

  // --- Priya Mehta owns 4 properties ---

  const prop1 = await Property.create({
    title: 'Prestige Lakeside Residences — 2BHK',
    address: 'Flat 12B, Prestige Lakeside Residences, Bellandur',
    city: 'Bengaluru', state: 'KA', zipCode: '560103',
    rent: 35000, deposit: 105000,
    bedrooms: 2, bathrooms: 2, sqft: 1180,
    description: 'Luxuriously furnished 2BHK in the prestigious Prestige Lakeside community in Bellandur. Features an open modular kitchen, premium vitrified flooring, and a spacious balcony overlooking the landscaped garden. Located minutes from Outer Ring Road IT corridor — ideal for working professionals. Society amenities include a rooftop pool, gym, and 24×7 security.',
    amenities: ['Covered Parking', 'Swimming Pool', 'Gymnasium', 'Club House', '24×7 Security', 'Power Backup', 'Intercom', 'Lift'],
    status: 'rented', isApproved: true,
    owner: owner._id, tenant: tenant._id,
    hazardScore: 96, availableFrom: makeDate(-3),
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    ],
  });

  const prop2 = await Property.create({
    title: 'Lodha Belmondo — 3BHK Premium Villa',
    address: 'Villa 7, Lodha Belmondo, Gahunje, Pune–Mumbai Expressway',
    city: 'Pune', state: 'MH', zipCode: '412101',
    rent: 55000, deposit: 165000,
    bedrooms: 3, bathrooms: 3, sqft: 2200,
    description: 'Expansive 3BHK villa set in the award-winning Lodha Belmondo township on the Pune–Mumbai Expressway. Private garden patio, a fully equipped European-style kitchen, and double-height living room. The township features an 18-hole golf course, 5-star spa, and 60+ lifestyle amenities — truly resort-style living. Ideal for senior professionals relocating to Pune.',
    amenities: ['Private Garden', 'Golf Course Access', 'Spa & Wellness', 'Sports Courts', 'Concierge', 'Covered Parking x2', 'Smart Home Automation', 'Power Backup'],
    status: 'rented', isApproved: true,
    owner: owner._id, tenant: tenant2._id,
    hazardScore: 99, availableFrom: makeDate(-5),
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ],
  });

  const prop3 = await Property.create({
    title: 'DLF Capital Greens — Studio Apartment',
    address: 'Tower C, Flat 804, DLF Capital Greens, Shivaji Marg',
    city: 'New Delhi', state: 'DL', zipCode: '110015',
    rent: 22000, deposit: 66000,
    bedrooms: 0, bathrooms: 1, sqft: 480,
    description: 'Compact and chic studio apartment in DLF Capital Greens, one of Delhi\'s most sought-after gated communities in the heart of the city. Fully furnished with premium fittings — perfect for a single working professional. Metro connectivity within 800m. Abundant natural light with floor-to-ceiling glazing. Society has jogging track, gym, and 24-hr concierge.',
    amenities: ['Furnished', 'Metro Access', 'Gym', 'Jogging Track', 'Concierge', '24×7 Security', 'Lift', 'Power Backup'],
    status: 'available', isApproved: true,
    owner: owner._id,
    hazardScore: 91, availableFrom: makeDate(0),
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ],
  });

  const prop4 = await Property.create({
    title: 'Hiranandani Gardens — 2BHK Apartment',
    address: 'Atlantis Tower, Flat 601, Hiranandani Gardens, Powai',
    city: 'Mumbai', state: 'MH', zipCode: '400076',
    rent: 68000, deposit: 204000,
    bedrooms: 2, bathrooms: 2, sqft: 1050,
    description: 'Premium semi-furnished 2BHK in the iconic Hiranandani Gardens, Powai — Mumbai\'s most sought-after planned township. Stunning lake and skyline views from an upper floor. Minutes from Powai Lake, IIT Bombay, and major IT parks. The apartment features imported marble flooring, modular kitchen, and premium sanitary fittings. Township amenities are world-class.',
    amenities: ['Lake View', 'Covered Parking', 'Swimming Pool', 'Tennis Court', 'Shopping Complex', 'Schools', 'Hospital Nearby', 'Power Backup', '24×7 Security'],
    status: 'maintenance', isApproved: true,
    owner: owner._id,
    hazardScore: 78, availableFrom: makeDate(1),
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    ],
  });

  // --- Arjun Kapoor owns 3 properties ---

  const prop5 = await Property.create({
    title: 'Cybercity Residences — 3BHK Corner Unit',
    address: 'Tower B, Flat 1402, Cybercity Residences, Sector 66',
    city: 'Gurugram', state: 'HR', zipCode: '122001',
    rent: 48000, deposit: 144000,
    bedrooms: 3, bathrooms: 2, sqft: 1650,
    description: 'Spectacular corner 3BHK on the 14th floor in the heart of Gurugram\'s Cyber City tech hub. Three-sided panoramic views of the Delhi–NCR skyline. Fully air-conditioned with brand-new modular kitchen, large master suite with walk-in wardrobe, and a wraparound terrace. Excellent connectivity to NH-48, Golf Course Road, and the rapid metro.',
    amenities: ['Panoramic City View', 'Terrace', 'Club House', 'Gym', 'Swimming Pool', 'Children\'s Play Area', 'Covered Parking', 'Power Backup'],
    status: 'rented', isApproved: true,
    owner: owner2._id, tenant: tenant3._id,
    hazardScore: 94, availableFrom: makeDate(-2),
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    ],
  });

  const prop6 = await Property.create({
    title: 'Casa Grande Supremo — 1BHK',
    address: 'Block A, Flat 203, Casa Grande Supremo, Perumbakkam',
    city: 'Chennai', state: 'TN', zipCode: '600100',
    rent: 18500, deposit: 55500,
    bedrooms: 1, bathrooms: 1, sqft: 620,
    description: 'Well-appointed 1BHK in Casa Grande Supremo, a premium gated community with excellent CCTV coverage and 24-hr security. Vitrified tile flooring throughout, modular kitchen with chimney, and a sunny east-facing balcony. Easy access to OMR IT corridor and Old Mahabalipuram Road. Ideal for IT professionals. Available immediately.',
    amenities: ['Gym', 'Children\'s Park', 'CCTV Surveillance', 'Visitor Parking', 'Lift', '24×7 Security', 'Rain Water Harvesting'],
    status: 'available', isApproved: true,
    owner: owner2._id,
    hazardScore: 89, availableFrom: makeDate(0),
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    ],
  });

  const prop7 = await Property.create({
    title: 'Sobha City — 4BHK Penthouse',
    address: 'Penthouse 1, Sobha City, Thanisandra Main Road',
    city: 'Bengaluru', state: 'KA', zipCode: '560077',
    rent: 95000, deposit: 285000,
    bedrooms: 4, bathrooms: 4, sqft: 3200,
    description: 'Ultra-luxury 4BHK penthouse duplex atop Sobha City — one of Bengaluru\'s finest addresses. Features a private rooftop terrace with Jacuzzi, floor-to-ceiling glazing, a butler\'s pantry, and home automation throughout. Breathtaking views of the Hebbal flyover lake. The project is a LEED-certified green development with unmatched social infrastructure. A truly exceptional home for discerning residents.',
    amenities: ['Private Rooftop Terrace', 'Jacuzzi', 'Home Automation', 'Covered Parking x3', 'Concierge', 'Sky Lounge', 'Business Centre', 'Gym', 'Spa', 'Swimming Pool'],
    status: 'pending_approval', isApproved: false,
    owner: owner2._id,
    hazardScore: 98, availableFrom: makeDate(2),
    images: [
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
    ],
  });

  console.log('✅ Created 7 properties across Bengaluru, Pune, Delhi, Mumbai, Gurugram & Chennai');

  // ── Link tenants ↔ properties & owners ────────────────────────────────────
  await User.findByIdAndUpdate(tenant._id,  { assignedProperty: prop1._id });
  await User.findByIdAndUpdate(tenant2._id, { assignedProperty: prop2._id });
  await User.findByIdAndUpdate(tenant3._id, { assignedProperty: prop5._id });
  await User.findByIdAndUpdate(owner._id,   { ownedProperties: [prop1._id, prop2._id, prop3._id, prop4._id] });
  await User.findByIdAndUpdate(owner2._id,  { ownedProperties: [prop5._id, prop6._id, prop7._id] });
  console.log('✅ Linked tenants and owners to properties');

  // ── Payments (INR) ────────────────────────────────────────────────────────
  // Vikram Nair — prop1 — ₹35,000
  await Payment.create({
    property: prop1._id, tenant: tenant._id, owner: owner._id,
    amount: 35000, dueDate: makeDate(-2),
    paidDate: new Date(makeDate(-2).getTime() + 2*24*60*60*1000),
    status: 'paid', method: 'UPI',
    month: makeMonth(-2), billType: 'rent', notes: 'Monthly rent',
    receiptNo: `SL-${makeMonth(-2).replace('-','')}-001`,
  });
  await Payment.create({
    property: prop1._id, tenant: tenant._id, owner: owner._id,
    amount: 35000, dueDate: makeDate(-1),
    paidDate: new Date(makeDate(-1).getTime() + 1*24*60*60*1000),
    status: 'paid', method: 'Razorpay',
    month: makeMonth(-1), billType: 'rent', notes: 'Monthly rent',
    receiptNo: `SL-${makeMonth(-1).replace('-','')}-001`,
    razorpayPaymentId: 'pay_test_seed_002',
  });
  await Payment.create({
    property: prop1._id, tenant: tenant._id, owner: owner._id,
    amount: 35000, dueDate: makeDate(0),
    status: 'pending', month: makeMonth(0), billType: 'rent', notes: 'Monthly rent',
  });

  // Sneha Iyer — prop2 — ₹55,000
  await Payment.create({
    property: prop2._id, tenant: tenant2._id, owner: owner._id,
    amount: 55000, dueDate: makeDate(-1),
    paidDate: new Date(makeDate(-1).getTime() + 3*24*60*60*1000),
    status: 'paid', method: 'Bank Transfer',
    month: makeMonth(-1), billType: 'rent', notes: 'Monthly rent',
    receiptNo: `SL-${makeMonth(-1).replace('-','')}-002`,
  });
  await Payment.create({
    property: prop2._id, tenant: tenant2._id, owner: owner._id,
    amount: 55000, dueDate: makeDate(0),
    status: 'pending', month: makeMonth(0), billType: 'rent', notes: 'Monthly rent',
  });

  // Rohit Desai — prop5 — ₹48,000
  await Payment.create({
    property: prop5._id, tenant: tenant3._id, owner: owner2._id,
    amount: 48000, dueDate: makeDate(-1),
    paidDate: new Date(makeDate(-1).getTime() + 1*24*60*60*1000),
    status: 'paid', method: 'UPI',
    month: makeMonth(-1), billType: 'rent', notes: 'Monthly rent',
    receiptNo: `SL-${makeMonth(-1).replace('-','')}-003`,
  });
  await Payment.create({
    property: prop5._id, tenant: tenant3._id, owner: owner2._id,
    amount: 48000, dueDate: makeDate(0),
    status: 'pending', month: makeMonth(0), billType: 'rent', notes: 'Monthly rent',
  });

  console.log('✅ Created 7 clean payments (INR amounts matching property rents)');

  // ── Complaints ───────────────────────────────────────────────────────────
  await Complaint.create({
    title: 'AC not cooling properly — Master bedroom',
    category: 'maintenance', priority: 'high', status: 'in_progress',
    description: 'The 1.5-ton split AC in the master bedroom stopped cooling effectively 4 days ago. Room temperature is not going below 28°C even on maximum setting. Please arrange urgent servicing.',
    raisedBy: tenant._id, property: prop1._id,
    comments: [{ author: owner._id, authorName: 'Priya Mehta', authorRole: 'owner', message: 'Blue Star service engineer scheduled for tomorrow between 11AM–1PM. Please keep the key ready.', attachments: [] }],
    createdAt: new Date(Date.now() - 4*24*60*60*1000),
  });
  await Complaint.create({
    title: 'Seepage in bathroom ceiling',
    category: 'maintenance', priority: 'urgent', status: 'pending',
    description: 'Water is seeping through the bathroom ceiling near the exhaust area, likely from the flat above. Wall paint is peeling and there is a damp smell. Urgent repair needed before monsoon worsens the damage.',
    raisedBy: tenant2._id, property: prop2._id,
    createdAt: new Date(Date.now() - 1*24*60*60*1000),
  });
  await Complaint.create({
    title: 'Society gym equipment broken',
    category: 'other', priority: 'medium', status: 'pending',
    description: 'The treadmill and cross-trainer in the society gym have been out of order for over two weeks. Several residents have complained. Requesting immediate repair or replacement of the equipment.',
    raisedBy: tenant3._id, property: prop5._id,
    createdAt: new Date(Date.now() - 10*24*60*60*1000),
  });
  console.log('✅ Created 3 complaints');

  // ── Notices ──────────────────────────────────────────────────────────────
  await Notice.create({
    title: 'Annual Society Maintenance — Water Supply Shutdown',
    content: 'Please note that water supply to all units will be suspended on Sunday, 8 June 2025, from 9:00 AM to 5:00 PM due to annual overhead tank cleaning and pipeline maintenance. Residents are advised to store adequate water in advance. We apologise for the inconvenience.',
    category: 'maintenance', author: owner._id, property: prop1._id, isPinned: true,
    createdAt: new Date(Date.now() - 3*24*60*60*1000),
  });
  await Notice.create({
    title: 'Rent Due Reminder — June 2025',
    content: 'This is a friendly reminder that monthly rent for June 2025 is due by 5th June 2025. Kindly make your payment via UPI, Razorpay, or bank transfer. Please share the UTR/reference number after payment. Late payments beyond the 10th may attract a penalty as per the lease agreement.',
    category: 'billing', author: owner._id, isGlobal: false, isPinned: true,
    createdAt: new Date(Date.now() - 1*24*60*60*1000),
  });
  await Notice.create({
    title: 'Welcome to SafeLease Platform',
    content: 'Welcome! You can now manage all your rental needs — maintenance requests, rent payments, notices, and lease documents — in one secure place. For any queries, please reach out to your property owner or our support team.',
    category: 'general', author: admin._id, isGlobal: true, isPinned: false,
  });
  console.log('✅ Created 3 notices');

  console.log('\n🎉 Database seeded with real Indian property data!\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' PROPERTIES');
  console.log('  1. Prestige Lakeside Residences 2BHK  — Bengaluru  — ₹35,000/mo [RENTED]');
  console.log('  2. Lodha Belmondo 3BHK Villa           — Pune        — ₹55,000/mo [RENTED]');
  console.log('  3. DLF Capital Greens Studio           — New Delhi   — ₹22,000/mo [AVAILABLE]');
  console.log('  4. Hiranandani Gardens 2BHK            — Mumbai      — ₹68,000/mo [MAINTENANCE]');
  console.log('  5. Cybercity Residences 3BHK           — Gurugram    — ₹48,000/mo [RENTED]');
  console.log('  6. Casa Grande Supremo 1BHK            — Chennai     — ₹18,500/mo [AVAILABLE]');
  console.log('  7. Sobha City 4BHK Penthouse           — Bengaluru   — ₹95,000/mo [PENDING]');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' LOGIN CREDENTIALS');
  console.log('  Admin  : admin@safelease.com  / Admin@1234   (Rahul Sharma)');
  console.log('  Owner  : owner@safelease.com  / Owner@1234   (Priya Mehta   — 4 properties)');
  console.log('  Owner2 : owner2@safelease.com / Owner@1234   (Arjun Kapoor  — 3 properties)');
  console.log('  Tenant : tenant@safelease.com / Tenant@1234  (Vikram Nair   — Prestige, ₹35k)');
  console.log('  Tenant2: tenant2@safelease.com/ Tenant@1234  (Sneha Iyer    — Lodha,    ₹55k)');
  console.log('  Tenant3: tenant3@safelease.com/ Tenant@1234  (Rohit Desai   — Cybercity,₹48k)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });