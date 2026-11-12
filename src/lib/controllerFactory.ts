import { EntityService } from './baseService';
import { jsonHandler, removedOr404, rowOr404 } from './responseHelpers';
import { runInTransaction } from '../config/database';
import { assertCanDelete, type IntegrityChecker } from './fkIntegrity';
import { QueryParams } from '../types';

export interface EntityControllerOptions {
  /** Same checker as the /:id/can-delete route: enforced server-side by remove. */
  integrityChecker?: IntegrityChecker;
}

export function createEntityController(service: EntityService, options: EntityControllerOptions = {}) {
  const { integrityChecker } = options;
  return {
    getAll: jsonHandler((req) => service.getAll(req.query as QueryParams)),

    getById: rowOr404((req) => service.getById(req.params.id)),

    create: jsonHandler((req) => service.create(req.body as Record<string, unknown>), 201),

    update: rowOr404((req) => service.update(req.params.id, req.body as Record<string, unknown>)),

    remove: removedOr404((req) => {
      const id = req.params.id;
      return integrityChecker
        ? runInTransaction(async () => {
          await assertCanDelete(id, integrityChecker);
          return service.remove(id);
        })
        : service.remove(id);
    }),
  };
}
