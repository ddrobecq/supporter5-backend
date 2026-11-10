import { Router } from 'express';
import ctrl, { integrityChecker } from '../../controllers/arbitre.controller';
import { createArbitreWithWizard } from '../../controllers/arbitre.controller';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.post('/', ctrl.create);
router.post('/wizard-create', createArbitreWithWizard);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, integrityChecker);

router.delete('/:id', ctrl.remove);

export default router;
