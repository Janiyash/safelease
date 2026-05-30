import { Response, NextFunction } from 'express';
import { Notice } from '../models/Notice';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

export const createNotice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.role === 'tenant') throw new AppError('Tenants cannot create notices', 403);

    const { title, content, category, isPinned, isGlobal, property, expiresAt } = req.body;

    // ✅ CRITICAL FIX: Strip empty string property field.
    // When "Global notice" is checked, the frontend hides the property dropdown
    // but the form value stays as "" (empty string).
    // Sending property="" to MongoDB causes:
    //   "Cast to ObjectId failed for value "" (type string) at path "property" BSONError"
    // Solution: only set property field if it is a real non-empty string.
    const cleanProperty = property && typeof property === 'string' && property.trim() !== ''
      ? property.trim()
      : undefined; // undefined → Mongoose ignores the field entirely → no cast error

    // If no property selected and not explicitly global → treat as global (admin/owner intent)
    const resolvedIsGlobal = !!isGlobal || !cleanProperty;

    const notice = await Notice.create({
      title,
      content,
      category,
      isPinned:  !!isPinned,
      isGlobal:  resolvedIsGlobal,
      // Only include property in the document if it's a valid non-empty value
      ...(cleanProperty ? { property: cleanProperty } : {}),
      author:    req.user!.userId,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    });

    // Push in-app notifications to relevant users
    if (cleanProperty) {
      // Property-specific notice → notify only that property's tenant
      const prop = await Property.findById(cleanProperty);
      if (prop?.tenant) {
        await User.findByIdAndUpdate(prop.tenant, {
          $push: {
            notifications: {
              message: `New notice: "${notice.title}"`,
              type:    category === 'emergency' ? 'error' : 'info',
              link:    '/notices',
            },
          },
        });
      }
    } else if (resolvedIsGlobal) {
      // Global notice → notify ALL tenants
      await User.updateMany(
        { role: 'tenant' },
        {
          $push: {
            notifications: {
              message: `New notice from ${req.user!.role}: "${notice.title}"`,
              type:    category === 'emergency' ? 'error' : 'info',
              link:    '/notices',
            },
          },
        },
      );
    }

    await notice.populate('author', 'name role');
    res.status(201).json({ success: true, data: { notice } });
  } catch (err) { next(err); }
};

export const getNotices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    let query: Record<string, unknown> = {};

    if (req.user!.role === 'tenant') {
      const user = await User.findById(req.user!.userId);
      // Tenant sees: global notices OR notices for their assigned property
      query = { $or: [{ isGlobal: true }, { property: user?.assignedProperty }] };
    } else if (req.user!.role === 'owner') {
      const props = await Property.find({ owner: req.user!.userId }).select('_id');
      query = {
        $or: [
          { author: req.user!.userId },
          { property: { $in: props.map(p => p._id) } },
          { isGlobal: true },
        ],
      };
    }
    // admin → no filter → sees all

    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [notices, total] = await Promise.all([
      Notice.find(query)
        .populate('author',   'name role')
        .populate('property', 'title address city')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notice.countDocuments(query),
    ]);

    res.json({ success: true, data: { notices, total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
};

export const markNoticeRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Notice.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user!.userId } });
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { next(err); }
};

export const deleteNotice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) throw new AppError('Notice not found', 404);
    if (notice.author.toString() !== req.user!.userId && req.user!.role !== 'admin') {
      throw new AppError('Not authorized to delete this notice', 403);
    }
    await notice.deleteOne();
    res.json({ success: true, message: 'Notice deleted' });
  } catch (err) { next(err); }
};
