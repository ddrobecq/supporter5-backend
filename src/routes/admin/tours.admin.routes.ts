import { Router } from 'express';
import ctrl, {
	integrityChecker,
	addTourParticipant,
	getTourParticipants,
	getTourRencontres,
	getToursByCompetition,
	moveTour,
	recomputeTour,
	removeTour,
	removeTourParticipants,
} from '../../controllers/tours.controller';
import { bindCanDeleteRoute } from './canDeleteRoute';

const router = Router();

// GET routes kept here are called by the admin screens (same handlers as the public router).
router.get('/competition/:competitionId', getToursByCompetition);
router.get('/:id/participants', getTourParticipants);
router.get('/:id/rencontres', getTourRencontres);
router.post('/',       ctrl.create);
router.put('/:id',    ctrl.update);
router.post('/:id/participants', addTourParticipant);
router.delete('/:id/participants', removeTourParticipants);
router.patch('/:id/move', moveTour);
router.post('/:id/recompute', recomputeTour);

bindCanDeleteRoute(router, integrityChecker);

router.delete('/:id', removeTour);
export default router;
