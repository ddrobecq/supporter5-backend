import { EntityService } from './baseService';
import { jsonHandler, removedOr404, rowOr404 } from './responseHelpers';
import { runInTransaction } from '../config/database';
import { assertCanDelete, describeConstraints, type IntegrityChecker } from './fkIntegrity';
import { AppError, QueryParams, type IntegrityCheckResult } from '../types';

export interface EntityControllerOptions {
  /** Same checker as the /:id/can-delete route: enforced server-side by remove and bulkDelete. */
  integrityChecker?: IntegrityChecker;
}

/** Checks every id first: a single blocked id rejects the whole batch (409 listing the blocked ids). */
async function assertAllCanDelete(ids: (string | number)[], checker: IntegrityChecker): Promise<void> {
  const blocked: Array<{ id: string | number } & IntegrityCheckResult> = [];
  for (const id of ids) {
    const result = await checker(String(id));
    if (!result.canDelete) blocked.push({ id, ...result });
  }
  if (blocked.length > 0) {
    const summary = blocked.map((item) => `${item.id} (${describeConstraints(item)})`).join(' ; ');
    throw new AppError(409, `Suppression impossible, aucun enregistrement supprime : ${summary}.`, { blocked });
  }
}

function assertIds(ids: unknown): asserts ids is (string | number)[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError(400, 'ids must be a non-empty array');
  }
}

export function createEntityController(service: EntityService, options: EntityControllerOptions = {}) {
  const { integrityChecker } = options;
  return {
    getAll: jsonHandler((req) => service.getAll(req.query as QueryParams)),

    getById: rowOr404((req) => service.getById(req.params.id)),

    create: jsonHandler((req) => service.create(req.body as Record<string, unknown>), 201),

    update: rowOr404((req) => service.update(req.params.id, req.body as Record<string, unknown>)),

    bulkUpdate: jsonHandler(async (req) => {
      const { ids, data } = req.body as { ids: unknown; data: Record<string, unknown> };
      assertIds(ids);
      return { changes: await service.bulkUpdate(ids, data) };
    }),

    remove: removedOr404((req) => {
      const id = req.params.id;
      return integrityChecker
        ? runInTransaction(async () => {
          await assertCanDelete(id, integrityChecker);
          return service.remove(id);
        })
        : service.remove(id);
    }),

    bulkDelete: jsonHandler(async (req) => {
      const { ids } = req.body as { ids: unknown };
      assertIds(ids);
      const changes = integrityChecker
        ? await runInTransaction(async () => {
          await assertAllCanDelete(ids, integrityChecker);
          return service.bulkDelete(ids);
        })
        : await service.bulkDelete(ids);
      return { changes };
    }),
  };
}
