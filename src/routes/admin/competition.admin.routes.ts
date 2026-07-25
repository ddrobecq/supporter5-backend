import { Router } from 'express';
import ctrl, { createCompetitionWithWizard } from '../../controllers/competition.controller';
import { checkCompetitionIntegrity } from '../../lib/integrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.post('/', ctrl.create);
router.post('/wizard-create', createCompetitionWithWizard);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkCompetitionIntegrity);

router.delete('/:id', ctrl.remove);

export default router;
