import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getJobStatus,
  triggerGenerateRent,
  triggerDetectOverdue,
  triggerSendReminders,
} from '../controllers/rentCycle.controller';

const router = Router();
router.use(authenticate, authorize('admin'));

// GET  /api/jobs/status
router.get('/status', getJobStatus);

// POST /api/jobs/rent-generator/trigger
router.post('/rent-generator/trigger', triggerGenerateRent);

// POST /api/jobs/overdue-detector/trigger
router.post('/overdue-detector/trigger', triggerDetectOverdue);

// POST /api/jobs/notification-dispatcher/trigger
router.post('/notification-dispatcher/trigger', triggerSendReminders);

export default router;
