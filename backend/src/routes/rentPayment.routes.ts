import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as rc from '../controllers/rentCycle.controller';

const router = Router();
router.use(authenticate);

// ── Rent Payments ─────────────────────────────────────────────────────────────
router.get('/',     rc.getRentPayments);
router.get('/:id',  rc.getRentPaymentById);
router.patch('/:id/pay', authorize('owner', 'admin'), rc.payRent);

export default router;
