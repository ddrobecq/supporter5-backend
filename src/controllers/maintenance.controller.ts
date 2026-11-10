import { dataHandler } from '../lib/responseHelpers';
import { executeMaintenanceQuery } from '../services/maintenance.service';

export const executeMaintenanceQueryHandler = dataHandler((req) => {
  const body = req.body as { sql?: unknown; confirm?: unknown; limit?: unknown };
  return executeMaintenanceQuery({
    sql: String(body?.sql ?? ''),
    confirmed: body?.confirm === true,
    limit: body?.limit === undefined ? undefined : Number(body.limit),
  });
});
