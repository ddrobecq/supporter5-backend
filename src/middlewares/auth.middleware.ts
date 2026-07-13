import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, JwtPayload } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid Authorization header'));
  }

  const token  = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new AppError(500, 'JWT_SECRET not configured'));

  try {
    req.user = jwt.verify(token, secret) as JwtPayload;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
