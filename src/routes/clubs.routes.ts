import { Router } from 'express';
import ctrl, { getClubsGrid } from '../controllers/clubs.controller';
const router = Router();
router.get('/grid', getClubsGrid);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
