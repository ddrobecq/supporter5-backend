import { Router } from 'express';
import ctrl from '../../controllers/devise.controller';
import { checkDeviseIntegrity } from '../../lib/integrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkDeviseIntegrity);

router.delete('/:id', ctrl.remove);

export default router;
