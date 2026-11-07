import express, { type RequestHandler } from 'express';
import { formatBytes } from '../config/uploadLimits';
import { AppError } from '../types';

/**
 * express.json() with a byte limit, translating body-parser errors into AppError
 * so that the global error handler answers 413 / 400 with a clear message instead of 500.
 */
export function jsonBody(limitBytes: number): RequestHandler {
  const parse = express.json({ limit: limitBytes });
  return (req, res, next) => {
    parse(req, res, (error?: unknown) => {
      if (!error) {
        next();
        return;
      }
      const type = (error as { type?: unknown }).type;
      if (type === 'entity.too.large') {
        next(new AppError(413, `Requête trop volumineuse. Taille maximale : ${formatBytes(limitBytes)}.`));
        return;
      }
      if (type === 'entity.parse.failed') {
        next(new AppError(400, 'Corps de requête JSON invalide.'));
        return;
      }
      next(error);
    });
  };
}
