import { Router } from 'express';
import ctrl, {
	addTourParticipant,
	getTourByIdDetailed,
	getTourParticipants,
	getTourRencontres,
	getToursByCompetition,
	moveTour,
	removeTour,
	removeTourParticipants,
} from '../../controllers/tours.controller';
import { checkTourIntegrity } from '../../lib/integrityChecker';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

router.get('/competition/:competitionId', getToursByCompetition);
router.get('/:id/detail', getTourByIdDetailed);
router.get('/:id/participants', getTourParticipants);
router.get('/:id/rencontres', getTourRencontres);
router.post('/',       ctrl.create);
router.put('/:id',    ctrl.update);
router.post('/:id/participants', addTourParticipant);
router.delete('/:id/participants', removeTourParticipants);
router.patch('/:id/move', moveTour);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, checkTourIntegrity);

router.delete('/:id', removeTour);
export default router;
