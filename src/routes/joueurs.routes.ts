import { Router } from 'express';
import ctrl, { getJoueursGrid } from '../controllers/joueurs.controller';
const router = Router();
router.get('/grid', getJoueursGrid);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
