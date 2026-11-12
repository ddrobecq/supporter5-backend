import { Router } from 'express';
import ctrl, { integrityChecker } from '../../controllers/joueurs.controller';
import { createJoueurWithWizard } from '../../controllers/joueurs.controller';
import { createJoueurHistory, deleteJoueurHistory, updateJoueurHistory } from '../../controllers/joueurs.controller';
import { createJoueurTransaction, deleteJoueurTransaction, updateJoueurTransaction } from '../../controllers/joueurs.controller';
import { bindCanDeleteRoute } from './canDeleteRoute';
const router = Router();
router.post('/',       ctrl.create);
router.post('/wizard-create', createJoueurWithWizard);
router.post('/:id/history', createJoueurHistory);
router.put('/:id/history/:historyId', updateJoueurHistory);
router.delete('/:id/history/:historyId', deleteJoueurHistory);
router.post('/:id/transactions', createJoueurTransaction);
router.put('/:id/transactions/:transactionId', updateJoueurTransaction);
router.delete('/:id/transactions/:transactionId', deleteJoueurTransaction);
router.put('/:id',    ctrl.update);

bindCanDeleteRoute(router, integrityChecker);

router.delete('/:id', ctrl.remove);
export default router;
