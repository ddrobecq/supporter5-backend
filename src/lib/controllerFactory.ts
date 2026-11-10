import { Request, Response, NextFunction } from 'express';
import { EntityService } from './baseService';
import { sendNotFound } from './responseHelpers';
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
    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        res.json(await service.getAll(req.query as QueryParams));
      } catch (err) { next(err); }
    },

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const item = await service.getById(req.params.id);
        if (!item) { sendNotFound(res); return; }
        res.json(item);
      } catch (err) { next(err); }
    },

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const item = await service.create(req.body as Record<string, unknown>);
        res.status(201).json(item);
      } catch (err) { next(err); }
    },

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const item = await service.update(req.params.id, req.body as Record<string, unknown>);
        if (!item) { sendNotFound(res); return; }
        res.json(item);
      } catch (err) { next(err); }
    },

    async bulkUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { ids, data } = req.body as { ids: unknown; data: Record<string, unknown> };
        assertIds(ids);
        const changes = await service.bulkUpdate(ids, data);
        res.json({ changes });
      } catch (err) { next(err); }
    },

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const id = req.params.id;
        const removed = integrityChecker
          ? await runInTransaction(async () => {
            await assertCanDelete(id, integrityChecker);
            return service.remove(id);
          })
          : await service.remove(id);
        if (!removed) {
          sendNotFound(res); return;
        }
        res.status(204).send();
      } catch (err) { next(err); }
    },

    async bulkDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { ids } = req.body as { ids: unknown };
        assertIds(ids);
        const changes = integrityChecker
          ? await runInTransaction(async () => {
            await assertAllCanDelete(ids, integrityChecker);
            return service.bulkDelete(ids);
          })
          : await service.bulkDelete(ids);
        res.json({ changes });
      } catch (err) { next(err); }
    },
  };
}
