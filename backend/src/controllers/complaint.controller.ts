import { Response, NextFunction } from 'express';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { sendComplaintNotification } from '../utils/email';

export const createComplaint = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attachments = (req.files as Express.Multer.File[] | undefined)?.map(f => `/uploads/${f.filename}`) || [];

    // Tenant must be assigned to that property
    const user = await User.findById(req.user!.userId);
    if (req.user!.role === 'tenant' && user?.assignedProperty?.toString() !== req.body.property) {
      throw new AppError('You can only raise complaints for your assigned property', 403);
    }

    const complaint = await Complaint.create({
      ...req.body,
      raisedBy: req.user!.userId,
      attachments,
      status: 'pending',
    });

    // Notify property owner
    const property = await Property.findById(req.body.property).populate<{ owner: { email: string; name: string } }>('owner', 'name email');
    if (property?.owner) {
      await sendComplaintNotification(property.owner.email, property.owner.name, complaint.title, 'submitted').catch(console.error);
      await User.findByIdAndUpdate(property.owner, {
        $push: {
          notifications: {
            message: `New complaint: "${complaint.title}"`,
            type: 'warning',
            link: `/complaints/${complaint._id}`,
          },
        },
      });
    }

    await complaint.populate('raisedBy', 'name email');
    res.status(201).json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
};

export const getComplaints = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;
    const query: Record<string, unknown> = {};

    if (req.user!.role === 'tenant') query.raisedBy = req.user!.userId;
    else if (req.user!.role === 'owner') {
      const props = await Property.find({ owner: req.user!.userId }).select('_id');
      query.property = { $in: props.map(p => p._id) };
    }
    // admin sees all

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('raisedBy', 'name email')
        .populate('property', 'title address')
        .populate('assignedTo', 'name')
        .sort('-createdAt').skip(skip).limit(Number(limit)),
      Complaint.countDocuments(query),
    ]);

    res.json({ success: true, data: { complaints, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
};

export const getComplaintById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('raisedBy', 'name email role')
      .populate('property', 'title address')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name');
    if (!complaint) throw new AppError('Complaint not found', 404);

    if (req.user!.role === 'tenant' && complaint.raisedBy._id.toString() !== req.user!.userId) {
      throw new AppError('Not authorized', 403);
    }
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
};

export const updateComplaintStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.role === 'tenant') throw new AppError('Tenants cannot update complaint status', 403);

    const { status, resolutionNote, assignedTo } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw new AppError('Complaint not found', 404);

    complaint.status = status;
    if (resolutionNote) complaint.resolutionNote = resolutionNote;
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = req.user!.userId as any;
    }

    await complaint.save();

    // Notify the tenant who raised it
    const tenant = await User.findById(complaint.raisedBy);
    if (tenant) {
      await sendComplaintNotification(tenant.email, tenant.name, complaint.title, status).catch(console.error);
      await User.findByIdAndUpdate(complaint.raisedBy, {
        $push: {
          notifications: {
            message: `Your complaint "${complaint.title}" is now ${status.replace('_', ' ')}`,
            type: status === 'resolved' ? 'success' : 'info',
            link: `/complaints/${complaint._id}`,
          },
        },
      });
    }

    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
};

export const addComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attachments = (req.files as Express.Multer.File[] | undefined)?.map(f => `/uploads/${f.filename}`) || [];
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw new AppError('Complaint not found', 404);

    const user = await User.findById(req.user!.userId);
    if (!user) throw new AppError('User not found', 404);

    complaint.comments.push({
      author: user._id,
      authorName: user.name,
      authorRole: user.role,
      message: req.body.message,
      attachments,
      createdAt: new Date(),
    } as any);

    await complaint.save();
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
};
