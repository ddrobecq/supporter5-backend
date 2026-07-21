import { Router } from 'express';
import ctrl, { getJoueurById, getJoueurHistory, getJoueurPostes, getJoueursGrid } from '../controllers/joueurs.controller';
const router = Router();
router.get('/grid', getJoueursGrid);
router.get('/postes', getJoueurPostes);
router.get('/:id/history', getJoueurHistory);
router.get('/', ctrl.getAll);
router.get('/:id', getJoueurById);
export default router;
