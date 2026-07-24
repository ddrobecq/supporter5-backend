import { Router } from 'express';
import ctrl from '../../controllers/epreuve.controller';
import { createEpreuveWithWizard } from '../../controllers/epreuve.controller';
import { checkEpreuveIntegrity } from '../../lib/integrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.post('/', ctrl.create);
router.post('/wizard-create', createEpreuveWithWizard);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkEpreuveIntegrity);

router.delete('/:id', ctrl.remove);

export default router;