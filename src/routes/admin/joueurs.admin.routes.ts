import { Router } from 'express';
import ctrl from '../../controllers/joueurs.controller';
import { createJoueurWithWizard } from '../../controllers/joueurs.controller';
import { createJoueurHistory, deleteJoueurHistory, updateJoueurHistory } from '../../controllers/joueurs.controller';
import { checkJoueurIntegrity } from '../../lib/joueurIntegrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';
const router = Router();
router.post('/',       ctrl.create);
router.post('/wizard-create', createJoueurWithWizard);
router.post('/:id/history', createJoueurHistory);
router.put('/:id/history/:historyId', updateJoueurHistory);
router.delete('/:id/history/:historyId', deleteJoueurHistory);
router.put('/:id',    ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkJoueurIntegrity);

router.delete('/:id', ctrl.remove);
export default router;
