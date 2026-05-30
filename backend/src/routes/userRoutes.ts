import express from 'express';
import { getUsers } from '../controllers/userController';
import { authenticate } from '../middleware/auth'; // ✅ use your middleware

const router = express.Router();

router.get('/', authenticate, getUsers); // ✅ FIX HERE

export default router;