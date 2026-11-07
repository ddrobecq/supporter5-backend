import { Request, Response, NextFunction } from 'express';
import { login } from '../services/auth.service';
import { AppError } from '../types';

const MAX_CREDENTIAL_LENGTH = 200;

function isValidCredential(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_CREDENTIAL_LENGTH;
}

export function loginHandler(req: Request, res: Response, next: NextFunction): void {
  try {
    const { username, password } = (req.body ?? {}) as { username?: unknown; password?: unknown };
    if (!isValidCredential(username) || !isValidCredential(password)) {
      throw new AppError(400, `username and password are required (non-empty strings, ${MAX_CREDENTIAL_LENGTH} characters max)`);
    }
    const token = login(username, password);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}
