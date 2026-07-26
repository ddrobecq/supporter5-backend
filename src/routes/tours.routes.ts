import { Router } from 'express';
import ctrl, { getTourByIdDetailed, getToursByCompetition } from '../controllers/tours.controller';
const router = Router();
router.get('/competition/:competitionId', getToursByCompetition);
router.get('/:id/detail', getTourByIdDetailed);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
