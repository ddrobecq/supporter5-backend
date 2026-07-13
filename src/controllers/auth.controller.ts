import { Request, Response, NextFunction } from 'express';
import { login } from '../services/auth.service';
import { AppError } from '../types';

export function loginHandler(req: Request, res: Response, next: NextFunction): void {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      throw new AppError(400, 'username and password are required');
    }
    const token = login(username, password);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}
