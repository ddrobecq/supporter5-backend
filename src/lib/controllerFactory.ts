import { Request, Response, NextFunction } from 'express';
import { EntityService } from './baseService';
import { AppError, QueryParams } from '../types';

function assertIds(ids: unknown): asserts ids is (string | number)[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError(400, 'ids must be a non-empty array');
  }
}

export function createEntityController(service: EntityService) {
  return {
    getAll(req: Request, res: Response, next: NextFunction): void {
      try {
        res.json(service.getAll(req.query as QueryParams));
      } catch (err) { next(err); }
    },

    getById(req: Request, res: Response, next: NextFunction): void {
      try {
        const item = service.getById(req.params.id);
        if (!item) { res.status(404).json({ message: 'Not found' }); return; }
        res.json(item);
      } catch (err) { next(err); }
    },

    create(req: Request, res: Response, next: NextFunction): void {
      try {
        const item = service.create(req.body as Record<string, unknown>);
        res.status(201).json(item);
      } catch (err) { next(err); }
    },

    update(req: Request, res: Response, next: NextFunction): void {
      try {
        const item = service.update(req.params.id, req.body as Record<string, unknown>);
        if (!item) { res.status(404).json({ message: 'Not found' }); return; }
        res.json(item);
      } catch (err) { next(err); }
    },

    bulkUpdate(req: Request, res: Response, next: NextFunction): void {
      try {
        const { ids, data } = req.body as { ids: unknown; data: Record<string, unknown> };
        assertIds(ids);
        const changes = service.bulkUpdate(ids, data);
        res.json({ changes });
      } catch (err) { next(err); }
    },

    remove(req: Request, res: Response, next: NextFunction): void {
      try {
        if (!service.remove(req.params.id)) {
          res.status(404).json({ message: 'Not found' }); return;
        }
        res.status(204).send();
      } catch (err) { next(err); }
    },

    bulkDelete(req: Request, res: Response, next: NextFunction): void {
      try {
        const { ids } = req.body as { ids: unknown };
        assertIds(ids);
        const changes = service.bulkDelete(ids);
        res.json({ changes });
      } catch (err) { next(err); }
    },
  };
}
