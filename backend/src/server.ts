import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/database';
import routes from './routes/index';
import { errorHandler } from './middleware/error';
import userRoutes from './routes/userRoutes';
import { startRentCycleScheduler } from './controllers/rentCycle.service';

const app = express();

// Ensure uploads dir exists
const uploadsDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter     = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' });
app.use('/api/', limiter);
app.use('/api/auth/login',  authLimiter);
app.use('/api/auth/signup', authLimiter);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(uploadsDir)));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);
app.use('/api/users', userRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 SafeLease API running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Uploads: ${uploadsDir}\n`);
  });
  // Start automated rent cycle scheduler AFTER DB is ready
  startRentCycleScheduler();
});

export default app;
