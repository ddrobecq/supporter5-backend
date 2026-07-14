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
    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        res.json(await service.getAll(req.query as QueryParams));
      } catch (err) { next(err); }
    },

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const item = await service.getById(req.params.id);
        if (!item) { res.status(404).json({ message: 'Not found' }); return; }
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
        if (!item) { res.status(404).json({ message: 'Not found' }); return; }
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
        if (!(await service.remove(req.params.id))) {
          res.status(404).json({ message: 'Not found' }); return;
        }
        res.status(204).send();
      } catch (err) { next(err); }
    },

    async bulkDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { ids } = req.body as { ids: unknown };
        assertIds(ids);
        const changes = await service.bulkDelete(ids);
        res.json({ changes });
      } catch (err) { next(err); }
    },
  };
}
