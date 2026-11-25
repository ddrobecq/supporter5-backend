import express, { type RequestHandler } from 'express';
import { formatBytes } from '../config/uploadLimits';
import { AppError } from '../types';

/**
 * express.text() for `text/plain` bodies with a byte limit, translating body-parser errors into AppError
 * (413 / 400) like jsonBody, instead of a 500 from the global error handler.
 */
export function textBody(limitBytes: number): RequestHandler {
  const parse = express.text({ type: 'text/plain', limit: limitBytes });
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
      if (type === 'charset.unsupported' || type === 'encoding.unsupported' || type === 'request.aborted') {
        next(new AppError(400, 'Corps de requête invalide.'));
        return;
      }
      next(error);
    });
  };
}
