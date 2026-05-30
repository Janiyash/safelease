import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

export const generateAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);

export const generateRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;

export const generateRandomToken = (): string =>
  crypto.randomBytes(32).toString('hex');

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
