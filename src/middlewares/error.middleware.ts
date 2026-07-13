import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof Error) {
    const status = (err as NodeJS.ErrnoException).code === 'SQLITE_CONSTRAINT' ? 409 : 500;
    res.status(status).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
