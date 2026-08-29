import { Router } from 'express';
import ctrl from '../../controllers/rss.controller';
import { checkRssIntegrity } from '../../lib/integrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkRssIntegrity);

router.delete('/:id', ctrl.remove);

export default router;
