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
    // Détecte les violations de contraintes (SQLite, Turso/libSQL, MySQL)
    const isConstraintError = 
      (err as NodeJS.ErrnoException).code === 'SQLITE_CONSTRAINT' ||
      err.message?.includes('UNIQUE constraint failed') ||
      err.message?.includes('foreign key constraint') ||
      err.message?.includes('Foreign key') ||
      err.message?.includes('Constraint') ||
      err.message?.includes('constraint');
    
    const status = isConstraintError ? 409 : 500;
    res.status(status).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
