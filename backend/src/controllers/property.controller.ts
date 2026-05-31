import { Response, NextFunction } from 'express';
import { Property } from '../models/Property';
import { User } from '../models/User';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

export const createProperty = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const images = (req.files as Express.Multer.File[] | undefined)?.map(f => `/uploads/${f.filename}`) || [];
    const property = await Property.create({
      ...req.body,
      owner: req.user!.userId,
      images,
      status: 'pending_approval',
      isApproved: false,
    });
    await User.findByIdAndUpdate(req.user!.userId, { $push: { ownedProperties: property._id } });
    res.status(201).json({ success: true, data: { property } });
  } catch (err) { next(err); }
};

export const getProperties = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, city, minRent, maxRent, page = 1, limit = 50 } = req.query;
    const query: Record<string, unknown> = {};

    // Admin sees everything.
    // Tenant sees only approved properties.
    // Owner sees ALL properties (so they can browse the market and see their owned ones tagged).
    //   The _all=1 flag is used by the frontend to signal this intent, but we allow it for owners always.
    if (req.user!.role === 'tenant') {
      query.isApproved = true;
    }
    // owners & admin: no filter on owner — they see all

    if (status) query.status = status;
    if (city) query.city = new RegExp(city as string, 'i');
    if (minRent || maxRent) {
      query.rent = {};
      if (minRent) (query.rent as any).$gte = Number(minRent);
      if (maxRent) (query.rent as any).$lte = Number(maxRent);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'name email avatar')
        .populate('tenant', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(query),
    ]);

    res.json({ success: true, data: { properties, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
};

export const getPropertyById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate('tenant', 'name email phone');
    if (!property) throw new AppError('Property not found', 404);
    res.json({ success: true, data: { property } });
  } catch (err) { next(err); }
};

export const updateProperty = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) throw new AppError('Property not found', 404);
    if (req.user!.role === 'owner' && property.owner.toString() !== req.user!.userId) {
      throw new AppError('Not authorized', 403);
    }

    const newImages = (req.files as Express.Multer.File[] | undefined)?.map(f => `/uploads/${f.filename}`) || [];
    const updates = { ...req.body };
    if (newImages.length) updates.images = [...property.images, ...newImages];

    const updated = await Property.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: { property: updated } });
  } catch (err) { next(err); }
};

export const deleteProperty = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) throw new AppError('Property not found', 404);
    if (req.user!.role === 'owner' && property.owner.toString() !== req.user!.userId) {
      throw new AppError('Not authorized', 403);
    }
    await property.deleteOne();
    await User.findByIdAndUpdate(property.owner, { $pull: { ownedProperties: property._id } });
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) { next(err); }
};

export const assignTenant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tenantId } = req.body;
    const [property, tenant] = await Promise.all([
      Property.findById(req.params.id),
      User.findById(tenantId),
    ]);
    if (!property) throw new AppError('Property not found', 404);
    if (!tenant || tenant.role !== 'tenant') throw new AppError('Tenant not found', 404);
    if (property.owner.toString() !== req.user!.userId && req.user!.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    // Remove tenant from old property
    if (tenant.assignedProperty) {
      await Property.findByIdAndUpdate(tenant.assignedProperty, { tenant: null, status: 'available' });
    }

    property.tenant = tenant._id;
    property.status = 'rented';
    await property.save();

    tenant.assignedProperty = property._id;
    await tenant.save();

    res.json({ success: true, message: 'Tenant assigned', data: { property } });
  } catch (err) { next(err); }
};

export const approveProperty = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, status: 'available' },
      { new: true }
    );
    if (!property) throw new AppError('Property not found', 404);
    res.json({ success: true, data: { property } });
  } catch (err) { next(err); }
};
