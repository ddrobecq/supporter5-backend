import { Router } from 'express';
import ctrl from '../../controllers/natio.controller';
import { checkNatioIntegrity } from '../../lib/natioIntegrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkNatioIntegrity);

router.delete('/:id', ctrl.remove);

export default router;
