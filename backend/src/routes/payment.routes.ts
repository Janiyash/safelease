import express from 'express';
import {
  getPayments,
  createPayment,
  markPaid,
  payOnline,
  deletePayment
} from '../controllers/Payment.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getPayments);
router.post('/', authenticate, createPayment);
router.patch('/:id/mark-paid', authenticate, markPaid);
router.post('/:id/pay-online', authenticate, payOnline);
router.delete('/:id', authenticate, deletePayment);

export default router;