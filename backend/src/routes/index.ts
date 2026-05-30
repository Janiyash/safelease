import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/error';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import paymentRoutes     from './payment.routes';
import rentPaymentRoutes from './rentPayment.routes';
import jobRoutes         from './jobs.routes';

import * as authCtrl   from '../controllers/auth.controller';
import * as propCtrl   from '../controllers/property.controller';
import * as complCtrl  from '../controllers/complaint.controller';
import * as noticeCtrl from '../controllers/notice.controller';
import * as adminCtrl  from '../controllers/admin.controller';
import * as rc         from '../controllers/rentCycle.controller';
import * as twoFa      from '../controllers/twoFactor.service';

const router = Router();

// ── AUTH ──────────────────────────────────────────────────────────────────────
const authRouter = Router();
authRouter.post('/signup',
  [body('name').trim().notEmpty(), body('email').isEmail(), body('password').isLength({ min: 8 }), body('role').optional().isIn(['tenant','owner','admin'])],
  validate, authCtrl.signup);
authRouter.post('/login',
  [body('email').isEmail(), body('password').notEmpty()], validate, authCtrl.login);
authRouter.post('/refresh', authCtrl.refreshToken);
authRouter.post('/logout',  authenticate, authCtrl.logout);
authRouter.post('/forgot-password', [body('email').isEmail()], validate, authCtrl.forgotPassword);
authRouter.post('/reset-password',
  [body('token').notEmpty(), body('password').isLength({ min: 8 })], validate, authCtrl.resetPassword);
authRouter.get('/me', authenticate, authCtrl.getMe);

// ── EMAIL OTP 2FA ─────────────────────────────────────────────────────────────
// verify + resend: use the short-lived tempToken (Bearer) returned from /login
authRouter.post(
  '/2fa/verify',
  authenticate,
  [body('otp').notEmpty().withMessage('Code is required')
              .isLength({ min: 6, max: 6 }).withMessage('Must be 6 digits')
              .isNumeric().withMessage('Must be numeric')],
  validate,
  twoFa.verify2FA,
);
authRouter.post('/2fa/resend', authenticate, twoFa.resendOtp);
// enable / disable / status: require full authenticated session
authRouter.post('/2fa/enable',  authenticate, twoFa.enable2FA);
authRouter.post(
  '/2fa/disable',
  authenticate,
  [body('password').notEmpty().withMessage('Password is required')],
  validate,
  twoFa.disable2FA,
);
authRouter.get('/2fa/status', authenticate, twoFa.get2FAStatus);

// ── PROPERTIES ────────────────────────────────────────────────────────────────
const propRouter = Router();
propRouter.use(authenticate);
propRouter.get('/', propCtrl.getProperties);
propRouter.get('/:id', propCtrl.getPropertyById);
propRouter.post('/', authorize('owner','admin'), upload.array('images',10), propCtrl.createProperty);
propRouter.put('/:id', authorize('owner','admin'), upload.array('images',10), propCtrl.updateProperty);
propRouter.delete('/:id', authorize('owner','admin'), propCtrl.deleteProperty);
propRouter.post('/:id/assign-tenant', authorize('owner','admin'), propCtrl.assignTenant);
propRouter.patch('/:id/approve', authorize('admin'), propCtrl.approveProperty);

// ── COMPLAINTS ────────────────────────────────────────────────────────────────
const complRouter = Router();
complRouter.use(authenticate);
complRouter.get('/', complCtrl.getComplaints);
complRouter.get('/:id', complCtrl.getComplaintById);
complRouter.post('/', upload.array('attachments',5),
  [body('title').trim().notEmpty(), body('description').trim().notEmpty(),
   body('category').isIn(['maintenance','noise','security','cleanliness','billing','other']),
   body('property').notEmpty()],
  validate, complCtrl.createComplaint);
complRouter.patch('/:id/status', authorize('owner','admin'), complCtrl.updateComplaintStatus);
complRouter.post('/:id/comments', upload.array('attachments',3), [body('message').trim().notEmpty()], validate, complCtrl.addComment);

// ── NOTICES ───────────────────────────────────────────────────────────────────
const noticeRouter = Router();
noticeRouter.use(authenticate);
noticeRouter.get('/', noticeCtrl.getNotices);
noticeRouter.post('/', authorize('owner','admin'), [body('title').trim().notEmpty(), body('content').trim().notEmpty()], validate, noticeCtrl.createNotice);
noticeRouter.patch('/:id/read', noticeCtrl.markNoticeRead);
noticeRouter.delete('/:id', authorize('owner','admin'), noticeCtrl.deleteNotice);

// ── ADMIN ─────────────────────────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'));
adminRouter.get('/analytics', adminCtrl.getAnalytics);
adminRouter.get('/users', adminCtrl.getAllUsers);
adminRouter.patch('/users/:id/status', adminCtrl.updateUserStatus);
adminRouter.patch('/users/:id/role', adminCtrl.updateUserRole);

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
const notifRouter = Router();
notifRouter.use(authenticate);
notifRouter.get('/', adminCtrl.getNotifications);
notifRouter.patch('/read-all', adminCtrl.markNotificationsRead);

// ── Mount ─────────────────────────────────────────────────────────────────────
router.use('/auth',          authRouter);
router.use('/properties',    propRouter);
router.use('/complaints',    complRouter);
router.use('/notices',       noticeRouter);
router.use('/admin',         adminRouter);
router.use('/notifications', notifRouter);
router.use('/payments',      paymentRoutes);
router.use('/rent-payments', rentPaymentRoutes);
router.use('/jobs',          jobRoutes);
router.get('/rent-notifications', authenticate, rc.getRentNotifications);
router.get('/audit-logs',         authenticate, authorize('admin'), rc.getAuditLogs);

export default router;
