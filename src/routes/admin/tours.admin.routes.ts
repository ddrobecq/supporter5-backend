import { Router } from 'express';
import ctrl, { getToursByCompetition, moveTour, removeTour } from '../../controllers/tours.controller';
import { checkTourIntegrity } from '../../lib/integrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.get('/competition/:competitionId', getToursByCompetition);
router.post('/',       ctrl.create);
router.put('/:id',    ctrl.update);
router.patch('/:id/move', moveTour);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkTourIntegrity);

router.delete('/:id', removeTour);
export default router;
