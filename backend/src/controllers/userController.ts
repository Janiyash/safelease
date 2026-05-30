import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error';

export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await User.find();

    res.json({
      success: true,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};