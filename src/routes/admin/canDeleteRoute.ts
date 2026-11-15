import type { Router } from 'express';
import { jsonHandler } from '../../lib/responseHelpers';
import type { IntegrityCheckResult } from '../../types';

type CanDeleteChecker = (id: string) => Promise<IntegrityCheckResult>;

export function bindCanDeleteRoute(router: Router, checker: CanDeleteChecker): void {
  router.get('/:id/can-delete', jsonHandler((req) => checker(req.params.id)));
}
