import { Router } from 'express';
import ctrl from '../../controllers/circ.controller';
import { checkCircIntegrity } from '../../lib/integrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkCircIntegrity);

router.delete('/:id', ctrl.remove);

export default router;