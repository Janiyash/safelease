import { Response, NextFunction } from 'express';
import { Payment } from '../models/Payment';
import { Property } from '../models/Property';
import { User } from '../models/User';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { format } from 'date-fns';

const makeReceipt = () =>
  `SL-${format(new Date(), 'yyyyMM')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

// ── GET /payments ─────────────────────────────────────────────────────────────
// ✅ FIX: Tenant → ONLY their own payments. Owner → their properties. Admin → all.
export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query: Record<string, unknown> = {};

    // ✅ CRITICAL FIX: These filters were commented out — that's why tenant saw everyone's bills
    if (req.user!.role === 'tenant') {
      query.tenant = req.user!.userId; // tenant only sees payments where they are the tenant
    } else if (req.user!.role === 'owner') {
      query.owner = req.user!.userId;  // owner only sees payments for their properties
    }
    // admin → no filter → sees all payments across all tenants/properties

    if (status && status !== 'all') query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('property', 'title address city rent')
        .populate('tenant',   'name email phone')
        .populate('owner',    'name email')
        .sort('-dueDate')
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    // Auto-mark overdue (only pending ones past due date)
    const now = new Date();
    const updates: Promise<any>[] = [];
    for (const p of payments) {
      if (p.status === 'pending' && new Date(p.dueDate) < now) {
        p.status = 'overdue';
        updates.push(p.save());
      }
    }
    if (updates.length) await Promise.all(updates);

    res.json({ success: true, data: { payments, total, page: Number(page) } });
  } catch (err) { next(err); }
};

// ── POST /payments — Owner/admin creates a payment request ───────────────────
// Supports billType: 'rent' | 'maintenance' | 'deposit' | 'other'
// When billType='maintenance' and isAllProperties=true, creates for ALL rented properties (admin only)
export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { propertyId, amount, dueDate, notes, month, billType = 'rent', isAllProperties } = req.body;

    if (!dueDate) throw new AppError('dueDate is required', 400);

    const payMonth = month || format(new Date(dueDate), 'yyyy-MM');

    // ── BULK maintenance raise for admin: isAllProperties=true ───────────────
    if (isAllProperties && req.user!.role === 'admin' && billType === 'maintenance') {
      if (!amount || amount <= 0) throw new AppError('Amount is required for bulk maintenance bill', 400);

      // Find all rented + approved properties that have a tenant assigned
      const rentedProperties = await Property.find({
        status: 'rented',
        isApproved: true,
        tenant: { $exists: true, $ne: null },
      }).populate<{ tenant: any; owner: any }>('tenant owner');

      if (!rentedProperties.length) {
        throw new AppError('No rented properties with assigned tenants found', 404);
      }

      const created: any[] = [];
      const skipped: string[] = [];

      for (const prop of rentedProperties) {
        // Skip if already exists for this property+month+billType
        const existing = await Payment.findOne({ property: prop._id, month: payMonth, billType: 'maintenance' });
        if (existing) {
          skipped.push(prop.title);
          continue;
        }

        const payment = await Payment.create({
          property: prop._id,
          tenant:   prop.tenant._id,
          owner:    prop.owner._id,
          amount:   Number(amount),
          dueDate:  new Date(dueDate),
          month:    payMonth,
          status:   'pending',
          billType: 'maintenance',
          notes:    notes || `Maintenance charge — ${payMonth}`,
        });

        // Notify each tenant
        await User.findByIdAndUpdate(prop.tenant._id, {
          $push: {
            notifications: {
              message: `Maintenance bill: ₹${Number(amount).toLocaleString('en-IN')} due ${format(new Date(dueDate), 'dd MMM yyyy')}`,
              type: 'warning',
              link: '/tenant/payments',
            },
          },
        });

        created.push(payment);
      }

    res.status(201).json({
      success: true,
      message: `Created ${created.length} maintenance bills${skipped.length ? `. Skipped ${skipped.length} (already exist): ${skipped.join(', ')}` : '.'}`,
      data: { payments: created, skipped },
    });
    return;
    }

    // ── SINGLE property payment request ──────────────────────────────────────
    if (!propertyId) throw new AppError('propertyId is required', 400);

    const property = await Property.findById(propertyId)
      .populate<{ tenant: any; owner: any }>('tenant owner');

    if (!property) throw new AppError('Property not found', 404);

    const ownerId = typeof property.owner === 'object'
      ? (property.owner as any)._id?.toString()
      : (property.owner as any)?.toString();

    if (req.user!.role === 'owner' && ownerId !== req.user!.userId) {
      throw new AppError('You can only raise payments for your own properties', 403);
    }

    const tenantId =
  typeof property.tenant === 'object'
    ? (property.tenant as any)._id
    : property.tenant;

    if (!tenantId) throw new AppError('No tenant assigned to this property', 400);

    // ✅ Duplicate check now includes billType — rent + maintenance can coexist in same month
    const existing = await Payment.findOne({ property: propertyId, month: payMonth, billType });
    if (existing) {
      throw new AppError(
        `A ${billType} payment for ${payMonth} already exists for this property`,
        400,
      );
    }

    const payment = await Payment.create({
      property: propertyId,
      tenant:   tenantId,
      owner:    ownerId,
      amount:   amount || property.rent,
      dueDate:  new Date(dueDate),
      month:    payMonth,
      status:   'pending',
      billType,
      notes,
    });

    // Notify tenant
    const billLabel = billType === 'maintenance' ? 'Maintenance charge' : billType === 'rent' ? 'Rent' : `${billType} bill`;
    await User.findByIdAndUpdate(tenantId, {
      $push: {
        notifications: {
          message: `${billLabel}: ₹${payment.amount.toLocaleString('en-IN')} due ${format(new Date(dueDate), 'dd MMM yyyy')}`,
          type: 'warning',
          link: '/tenant/payments',
        },
      },
    });

    await payment.populate([
      { path: 'property', select: 'title address city rent' },
      { path: 'tenant',   select: 'name email' },
      { path: 'owner',    select: 'name email' },
    ]);

    res.status(201).json({ success: true, data: { payment } });
  } catch (err) { next(err); }
};

// ── PATCH /payments/:id/mark-paid ────────────────────────────────────────────
export const markPaid = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError('Payment not found', 404);

    if (req.user!.role === 'owner' && payment.owner.toString() !== req.user!.userId) {
      throw new AppError('Not authorized', 403);
    }

    payment.status    = 'paid';
    payment.paidDate  = new Date();
    payment.method    = req.body.method || 'Bank Transfer';
    payment.receiptNo = makeReceipt();
    await payment.save();

    await User.findByIdAndUpdate(payment.tenant, {
      $push: {
        notifications: {
          message: `Payment of ₹${payment.amount.toLocaleString('en-IN')} confirmed for ${payment.month}`,
          type: 'success',
          link: '/tenant/payments',
        },
      },
    });

    await payment.populate([
      { path: 'property', select: 'title address' },
      { path: 'tenant',   select: 'name email' },
    ]);

    res.json({ success: true, data: { payment } });
  } catch (err) { next(err); }
};

// ── POST /payments/:id/pay-online ────────────────────────────────────────────
export const payOnline = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError('Payment not found', 404);

    // ✅ Extra safety: tenant can only pay their own bills
    if (payment.tenant.toString() !== req.user!.userId) {
      throw new AppError('This payment does not belong to you', 403);
    }
    if (payment.status === 'paid') throw new AppError('Already paid', 400);

    const { razorpayPaymentId, razorpayOrderId, method } = req.body;

    payment.status            = 'paid';
    payment.paidDate          = new Date();
    payment.method            = method || 'Razorpay';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpayOrderId   = razorpayOrderId;
    payment.receiptNo         = makeReceipt();
    await payment.save();

    await User.findByIdAndUpdate(payment.owner, {
      $push: {
        notifications: {
          message: `Tenant paid ₹${payment.amount.toLocaleString('en-IN')} (${(payment as any).billType || 'rent'}) for ${payment.month}`,
          type: 'success',
          link: '/owner/payments',
        },
      },
    });

    await payment.populate([
      { path: 'property', select: 'title address' },
      { path: 'tenant',   select: 'name email' },
    ]);

    res.json({ success: true, data: { payment } });
  } catch (err) { next(err); }
};

// ── DELETE /payments/:id ──────────────────────────────────────────────────────
export const deletePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status === 'paid') throw new AppError('Cannot delete a paid payment', 400);
    if (req.user!.role === 'owner' && payment.owner.toString() !== req.user!.userId) {
      throw new AppError('Not authorized', 403);
    }
    await payment.deleteOne();
    res.json({ success: true, message: 'Payment deleted' });
  } catch (err) { next(err); }
};