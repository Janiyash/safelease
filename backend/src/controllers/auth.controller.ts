import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import {
  generateAccessToken, generateRefreshToken,
  verifyRefreshToken, generateRandomToken, hashToken,
} from '../utils/jwt';
import { sendWelcomeEmail, sendPasswordResetEmail, sendLoginOtpEmail } from '../utils/email';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

/** Cryptographically secure 6-digit numeric OTP */
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

// ── SIGNUP ────────────────────────────────────────────────────────────────────
export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role = 'tenant', phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already registered', 400);

    const verificationToken = generateRandomToken();
    const user = await User.create({
      name, email, password, role, phone,
      emailVerificationToken: hashToken(verificationToken),
    });

    await sendWelcomeEmail(email, name, verificationToken).catch(console.error);

    const payload      = { userId: user._id.toString(), role: user.role, email: user.email };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = hashToken(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email.',
      data: { user, accessToken },
    });
  } catch (err) { next(err); }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Select OTP fields too so we can write them
    const user = await User.findOne({ email })
      .select('+password +refreshToken +otpCode +otpExpires +otpAttempts');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!user.isActive) throw new AppError('Account has been deactivated', 403);

    // ── 2FA: generate OTP, hash+save, send email ──────────────────────────────
    if (user.twoFactorEnabled) {
      const otp = generateOtp();
      user.otpCode     = hashOtp(otp);
      user.otpExpires  = new Date(Date.now() + OTP_EXPIRY_MS);
      user.otpAttempts = 0;
      await user.save();

      sendLoginOtpEmail(user.email, user.name, otp).catch(console.error);

      // Temp token — frontend sends this as Bearer to /2fa/verify and /2fa/resend
      const tempToken = generateAccessToken({
        userId: user._id.toString(),
        role:   user.role,
        email:  user.email,
      });

      res.json({
        success: true,
        data: {
          requiresTwoFactor: true,
          tempToken,
          maskedEmail: maskEmail(user.email),
        },
      });
      return;
    }

    // ── Normal login (2FA off) ─────────────────────────────────────────────────
    const payload      = { userId: user._id.toString(), role: user.role, email: user.email };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = hashToken(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) { next(err); }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) throw new AppError('No refresh token', 401);

    const payload = verifyRefreshToken(token);
    const user    = await User.findById(payload.userId).select('+refreshToken');
    if (!user || user.refreshToken !== hashToken(token)) throw new AppError('Invalid refresh token', 401);

    const newPayload  = { userId: user._id.toString(), role: user.role, email: user.email };
    const accessToken = generateAccessToken(newPayload);
    const newRefresh  = generateRefreshToken(newPayload);

    user.refreshToken = hashToken(newRefresh);
    await user.save();

    res.cookie('refreshToken', newRefresh, cookieOptions);
    res.json({ success: true, data: { accessToken } });
  } catch (err) { next(err); }
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) await User.findByIdAndUpdate(req.user.userId, { refreshToken: null });
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    if (!user) return;

    const token = generateRandomToken();
    user.passwordResetToken   = hashToken(token);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(email, user.name, token).catch(console.error);
  } catch (err) { next(err); }
};

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      passwordResetToken:   hashToken(token),
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) throw new AppError('Invalid or expired reset token', 400);

    user.password             = password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken         = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (err) { next(err); }
};

// ── GET ME ────────────────────────────────────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId)
      .populate('assignedProperty', 'title address city status')
      .populate('ownedProperties',  'title address city status');
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
};
