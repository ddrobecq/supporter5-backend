import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

const INTERNAL_ERROR_ENVIRONMENTS = new Set(['development', 'debug']);

function maskSensitiveKey(key: string, value: unknown): unknown {
  const normalized = key.toLowerCase();
  if (normalized.includes('password') || normalized.includes('token') || normalized.includes('secret') || normalized.includes('authorization')) {
    return '***';
  }
  return value;
}

function safeSerialize(value: unknown): string {
  try {
    const seen = new WeakSet<object>();
    const raw = JSON.stringify(
      value,
      (key, current) => {
        const masked = maskSensitiveKey(key, current);
        if (masked && typeof masked === 'object') {
          if (Buffer.isBuffer(masked)) {
            return `[Buffer:${masked.length}]`;
          }
          if (seen.has(masked)) {
            return '[Circular]';
          }
          seen.add(masked);
        }
        return masked;
      },
      2,
    );

    if (!raw) {
      return '';
    }
    return raw.length > 6000 ? `${raw.slice(0, 6000)}... [truncated]` : raw;
  } catch {
    return '[Unserializable]';
  }
}

function logServerError(req: Request, err: Error, status: number, isConstraintError: boolean): void {
  const errnoError = err as NodeJS.ErrnoException;
  const payload = {
    at: new Date().toISOString(),
    status,
    type: isConstraintError ? 'constraint' : 'runtime',
    request: {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query,
      body: req.body,
    },
    error: {
      name: err.name,
      code: errnoError.code ?? null,
      errno: errnoError.errno ?? null,
      message: err.message,
      stack: err.stack ?? null,
    },
  };

  console.error(`[backend-error] ${safeSerialize(payload)}`);
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Internal error details are only exposed in explicit development/debug environments.
  const exposeInternalErrors = INTERNAL_ERROR_ENVIRONMENTS.has(process.env.NODE_ENV ?? '');

  if (err instanceof AppError) {
    const appErrorAsError = err as unknown as Error;
    logServerError(req, appErrorAsError, err.statusCode, false);
    res.status(err.statusCode).json(
      err.details === undefined ? { message: err.message } : { message: err.message, details: err.details },
    );
    return;
  }

  if (err instanceof Error) {
    if (exposeInternalErrors) {
      // Keep verbose diagnostics in development/debug environments.
      console.error('[errorMiddleware]', err);
    }

    // Détecte les violations de contraintes (SQLite, Turso/libSQL, MySQL)
    const isConstraintError =
      (err as NodeJS.ErrnoException).code === 'SQLITE_CONSTRAINT' ||
      (err as NodeJS.ErrnoException).code === 'SQLITE_CONSTRAINT_NOTNULL' ||
      (err as NodeJS.ErrnoException).code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
      (err as NodeJS.ErrnoException).code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      err.message?.includes('UNIQUE constraint failed') ||
      err.message?.includes('foreign key constraint') ||
      err.message?.includes('Foreign key') ||
      err.message?.includes('Constraint') ||
      err.message?.includes('constraint');

    const status = isConstraintError ? 409 : 500;
    logServerError(req, err, status, isConstraintError);
    if (isConstraintError) {
      res.status(status).json({
        message: exposeInternalErrors
          ? err.message
          : 'Operation impossible: contrainte d integrite.',
      });
      return;
    }

    res.status(status).json({ message: exposeInternalErrors ? err.message : 'Internal server error' });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
