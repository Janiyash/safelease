import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Complaint } from '../models/Complaint';
import { Notice } from '../models/Notice';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

export const getAnalytics = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalUsers, tenants, owners,
      totalProperties, approvedProperties, pendingProperties,
      totalComplaints, openComplaints, resolvedComplaints,
      totalNotices,
      complaintsByStatus,
      complaintsByCategory,
      propertiesByStatus,
      recentComplaints,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'tenant' }),
      User.countDocuments({ role: 'owner' }),
      Property.countDocuments(),
      Property.countDocuments({ isApproved: true }),
      Property.countDocuments({ isApproved: false }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
      Complaint.countDocuments({ status: 'resolved' }),
      Notice.countDocuments(),
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Property.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.find().sort('-createdAt').limit(5).populate('raisedBy', 'name').populate('property', 'title'),
      User.find().sort('-createdAt').limit(5).select('name email role createdAt'),
    ]);

    // Monthly complaints trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyComplaints = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, tenants, owners, admins: totalUsers - tenants - owners },
        properties: { total: totalProperties, approved: approvedProperties, pending: pendingProperties, occupancyRate: totalProperties ? Math.round((approvedProperties / totalProperties) * 100) : 0 },
        complaints: { total: totalComplaints, open: openComplaints, resolved: resolvedComplaints, resolutionRate: totalComplaints ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0 },
        notices: { total: totalNotices },
        charts: { complaintsByStatus, complaintsByCategory, propertiesByStatus, monthlyComplaints },
        recent: { complaints: recentComplaints, users: recentUsers },
      },
    });
  } catch (err) { next(err); }
};

export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query: Record<string, unknown> = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { name: new RegExp(search as string, 'i') },
      { email: new RegExp(search as string, 'i') },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort('-createdAt').skip(skip).limit(Number(limit))
        .populate('assignedProperty', 'title address'),
      User.countDocuments(query),
    ]);

    res.json({ success: true, data: { users, total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
};

export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isActive } = req.body;
    if (req.params.id === req.user!.userId) throw new AppError("You can't deactivate yourself", 400);
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select('notifications');
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { notifications: user.notifications.sort((a: any, b: any) => b.createdAt - a.createdAt) } });
  } catch (err) { next(err); }
};

export const markNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await User.updateOne(
      { _id: req.user!.userId },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};
