import type { Request, RequestHandler, Response } from 'express';

export function sendNotFound(res: Response): void {
  res.status(404).json({ message: 'Not found' });
}

/** Wraps an async handler: any rejection is forwarded to the global error middleware. */
export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

/** Responds `status` with the value returned by `fn`, serialized as is. */
export function jsonHandler(fn: (req: Request) => Promise<unknown>, status = 200): RequestHandler {
  return asyncHandler(async (req, res) => {
    res.status(status).json(await fn(req));
  });
}

/** Responds 200 with `{ data }`. */
export function dataHandler(fn: (req: Request) => Promise<unknown>): RequestHandler {
  return asyncHandler(async (req, res) => {
    res.status(200).json({ data: await fn(req) });
  });
}

/** Responds `status` with the row, or 404 (sendNotFound) when `fn` returns undefined / null. */
export function rowOr404(fn: (req: Request) => Promise<unknown>, status = 200): RequestHandler {
  return asyncHandler(async (req, res) => {
    const row = await fn(req);
    if (row === undefined || row === null) {
      sendNotFound(res);
      return;
    }
    res.status(status).json(row);
  });
}

/** Responds 204 when `fn` reports a deletion, 404 (sendNotFound) otherwise. */
export function removedOr404(fn: (req: Request) => Promise<boolean>): RequestHandler {
  return asyncHandler(async (req, res) => {
    if (!(await fn(req))) {
      sendNotFound(res);
      return;
    }
    res.status(204).send();
  });
}
