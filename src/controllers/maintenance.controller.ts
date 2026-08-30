import type { NextFunction, Request, Response } from 'express';
import { executeMaintenanceQuery } from '../services/maintenance.service';

export async function executeMaintenanceQueryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as { sql?: unknown; confirm?: unknown; limit?: unknown };
    const data = await executeMaintenanceQuery({
      sql: String(body?.sql ?? ''),
      confirmed: body?.confirm === true,
      limit: body?.limit === undefined ? undefined : Number(body.limit),
    });
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export default {
  executeMaintenanceQueryHandler,
};
