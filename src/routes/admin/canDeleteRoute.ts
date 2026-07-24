import type { NextFunction, Request, Response, Router } from 'express';
import type { IntegrityCheckResult } from '../../types';

type CanDeleteChecker = (id: string) => Promise<IntegrityCheckResult>;

export function bindCanDeleteRoute(router: Router, checker: CanDeleteChecker): void {
  router.get('/:id/can-delete', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await checker(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });
}
