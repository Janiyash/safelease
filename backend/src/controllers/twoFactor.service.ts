import crypto from 'crypto';
import { User } from '../models/User';
import { AppError } from '../middleware/error';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/jwt';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendLoginOtpEmail, send2FAEnabledEmail, send2FADisabledEmail } from '../utils/email';

const OTP_EXPIRY_MS      = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS       = 5;

const generateOtp = (): string => {
  const bytes = crypto.randomBytes(3);
  const num   = bytes.readUIntBE(0, 3) % 900000 + 100000;
  return String(num);
};
const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(String(otp).trim()).digest('hex');

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 4))}@${domain}`;
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/2fa/verify  { otp: "123456" }
// Bearer = tempToken from /login
export const verify2FA = async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
  try {
    const { otp } = req.body;
    if (!otp) throw new AppError('Verification code is required', 400);

    const user = await User.findById(req.user!.userId)
      .select('+otpCode +otpExpires +otpAttempts +refreshToken');
    if (!user) throw new AppError('User not found', 404);
    if (!user.twoFactorEnabled) throw new AppError('2FA is not enabled for this account', 400);

    if ((user.otpAttempts ?? 0) >= MAX_ATTEMPTS) {
      throw new AppError('Too many failed attempts. Please request a new code.', 429);
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      throw new AppError('Verification code has expired. Please request a new one.', 401);
    }

    if (!user.otpCode || user.otpCode !== hashOtp(String(otp).trim())) {
      user.otpAttempts = (user.otpAttempts ?? 0) + 1;
      await user.save();
      const remaining = MAX_ATTEMPTS - (user.otpAttempts ?? 0);
      if (remaining <= 0) throw new AppError('Too many failed attempts. Please request a new code.', 429);
      throw new AppError(`Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`, 401);
    }

    // Valid — clear OTP, issue full session
    user.otpCode     = undefined;
    user.otpExpires  = undefined;
    user.otpAttempts = 0;

    const payload      = { userId: user._id.toString(), role: user.role, email: user.email };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    user.refreshToken  = hashToken(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) { next(err); }
};

// POST /api/auth/2fa/resend
// Bearer = tempToken from /login. Enforces 1-min cooldown.
export const resendOtp = async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId)
      .select('+otpCode +otpExpires +otpAttempts');
    if (!user) throw new AppError('User not found', 404);
    if (!user.twoFactorEnabled) throw new AppError('2FA is not enabled', 400);

    if (user.otpExpires) {
      const issuedAt = user.otpExpires.getTime() - OTP_EXPIRY_MS;
      const elapsed  = Date.now() - issuedAt;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new AppError(`Please wait ${waitSec}s before requesting a new code.`, 429);
      }
    }

    const otp = generateOtp();
    user.otpCode     = hashOtp(otp);
    user.otpExpires  = new Date(Date.now() + OTP_EXPIRY_MS);
    user.otpAttempts = 0;
    await user.save();

    sendLoginOtpEmail(user.email, user.name, otp).catch(console.error);

    res.json({
      success: true,
      message: 'New verification code sent to your email.',
      data: { maskedEmail: maskEmail(user.email), expiresInMinutes: 10 },
    });
  } catch (err) { next(err); }
};

// POST /api/auth/2fa/enable — authenticated user (full session) opts in
export const enable2FA = async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.twoFactorEnabled) throw new AppError('2FA is already enabled', 400);

    user.twoFactorEnabled = true;
    await user.save();

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'Unknown';
    send2FAEnabledEmail(user.email, user.name, ip).catch(console.error);

    res.json({
      success: true,
      message: 'Email 2FA enabled. A 6-digit code will be sent to your email at each login.',
    });
  } catch (err) { next(err); }
};

// POST /api/auth/2fa/disable  { password: "..." }
export const disable2FA = async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
  try {
    const { password } = req.body;
    if (!password) throw new AppError('Current password is required', 400);

    const user = await User.findById(req.user!.userId).select('+password');
    if (!user) throw new AppError('User not found', 404);
    if (!user.twoFactorEnabled) throw new AppError('2FA is not enabled', 400);

    if (!(await user.comparePassword(password))) throw new AppError('Incorrect password', 401);

    user.twoFactorEnabled = false;
    user.otpCode          = undefined;
    user.otpExpires       = undefined;
    user.otpAttempts      = 0;
    await user.save();

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'Unknown';
    send2FADisabledEmail(user.email, user.name, ip).catch(console.error);

    res.json({ success: true, message: '2FA has been disabled.' });
  } catch (err) { next(err); }
};

// GET /api/auth/2fa/status
export const get2FAStatus = async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { twoFactorEnabled: user.twoFactorEnabled, method: 'email' } });
  } catch (err) { next(err); }
};
