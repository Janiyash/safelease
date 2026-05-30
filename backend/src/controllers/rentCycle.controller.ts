import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Payment } from '../models/Payment';
import { RentNotification } from '../models/RentNotification';
import { generateMonthlyRent, detectOverdue, sendReminders } from './rentCycle.service';

// ── In-memory job history (survives until server restart) ─────────────────────
interface JobRun {
  jobId:        string;
  jobType:      string;
  status:       'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt:    string;
  completedAt?: string;
  durationMs?:  number;
  stats:        { processed: number; succeeded: number; skipped: number; failed: number };
  errorMsg?:    string;
}
const jobHistory: JobRun[] = [];

function startJob(type: string): JobRun {
  const run: JobRun = {
    jobId: `${type}-${Date.now()}`,
    jobType: type,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    stats: { processed: 0, succeeded: 0, skipped: 0, failed: 0 },
  };
  jobHistory.unshift(run);
  if (jobHistory.length > 100) jobHistory.pop();
  return run;
}

function finishJob(run: JobRun, stats?: Partial<JobRun['stats']>, error?: string) {
  run.completedAt = new Date().toISOString();
  run.durationMs  = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();
  run.status      = error ? 'FAILED' : 'COMPLETED';
  if (stats) Object.assign(run.stats, stats);
  if (error) run.errorMsg = error;
}

// ── GET /api/jobs/status ──────────────────────────────────────────────────────
export const getJobStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 30;
    const jobs  = jobHistory.slice(0, limit);

    const latest: Record<string, JobRun> = {};
    for (const run of jobHistory) {
      if (!latest[run.jobType]) latest[run.jobType] = run;
    }

    res.json({
      success: true,
      data: {
        jobs,
        latest: {
          latestGenerator:  latest['MONTHLY_RENT_GENERATOR'],
          latestDetector:   latest['OVERDUE_DETECTOR'],
          latestDispatcher: latest['NOTIFICATION_DISPATCHER'],
        },
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/rent-payments ────────────────────────────────────────────────────
export const getRentPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: any = { billType: 'rent' };
    if (req.user!.role === 'tenant') filter.tenant = req.user!._id;
    else if (req.user!.role === 'owner') filter.owner = req.user!._id;

    const payments = await Payment.find(filter)
      .populate('property', 'title address city rent')
      .populate('tenant',   'name email phone')
      .populate('owner',    'name email')
      .sort({ dueDate: -1 });

    res.json({ success: true, data: payments });
  } catch (err) { next(err); }
};

// ── GET /api/rent-payments/:id ────────────────────────────────────────────────
export const getRentPaymentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('property', 'title address city rent')
      .populate('tenant',   'name email phone')
      .populate('owner',    'name email');

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' }) as any;
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

// ── PATCH /api/rent-payments/:id/pay ─────────────────────────────────────────
export const payRent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { method } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' }) as any;

    payment.status   = 'paid';
    payment.paidDate = new Date();
    payment.method   = method || 'Online';
    await payment.save();

    res.json({ success: true, data: payment, message: 'Rent marked as paid' });
  } catch (err) { next(err); }
};

// ── GET /api/rent-notifications ───────────────────────────────────────────────
export const getRentNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: any = {};
    if (req.user!.role === 'tenant') filter.tenantId = req.user!._id;

    const notifications = await RentNotification.find(filter)
      .populate('paymentId', 'amount month dueDate status')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
};

// ── GET /api/audit-logs ───────────────────────────────────────────────────────
export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, type, limit = 50, skip = 0 } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (type)   filter.type   = type;

    const logs = await RentNotification.find(filter)
      .populate('tenantId',  'name email')
      .populate('paymentId', 'amount month dueDate property')
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await RentNotification.countDocuments(filter);
    res.json({ success: true, data: logs, total });
  } catch (err) { next(err); }
};

// ── POST /api/jobs/rent-generator/trigger ─────────────────────────────────────
export const triggerGenerateRent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const run = startJob('MONTHLY_RENT_GENERATOR');
  try {
    const result = await generateMonthlyRent();
    finishJob(run, { processed: result.total, succeeded: result.created, skipped: result.skipped });
    res.json({ success: true, message: `Rent generation done. Created: ${result.created}, Skipped: ${result.skipped}`, jobId: run.jobId });
  } catch (err: any) {
    finishJob(run, undefined, String(err));
    console.error('triggerGenerateRent error:', err);
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
};

// ── POST /api/jobs/overdue-detector/trigger ───────────────────────────────────
export const triggerDetectOverdue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const run = startJob('OVERDUE_DETECTOR');
  try {
    const result = await detectOverdue();
    finishJob(run, { processed: result.marked, succeeded: result.marked });
    res.json({ success: true, message: `Overdue detection done. Marked: ${result.marked}`, jobId: run.jobId });
  } catch (err: any) {
    finishJob(run, undefined, String(err));
    console.error('triggerDetectOverdue error:', err);
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
};

// ── POST /api/jobs/notification-dispatcher/trigger ────────────────────────────
export const triggerSendReminders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const run = startJob('NOTIFICATION_DISPATCHER');
  try {
    const result = await sendReminders();
    finishJob(run, { processed: result.sent, succeeded: result.sent });
    res.json({ success: true, message: `Reminders sent: ${result.sent}`, jobId: run.jobId });
  } catch (err: any) {
    finishJob(run, undefined, String(err));
    console.error('triggerSendReminders error:', err);
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
};
