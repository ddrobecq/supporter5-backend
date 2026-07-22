import { Router } from 'express';
import ctrl, { getClubGridById, getClubSuggestions, getClubsGrid } from '../controllers/clubs.controller';
const router = Router();
router.get('/grid', getClubsGrid);
router.get('/suggest', getClubSuggestions);
router.get('/grid/:id', getClubGridById);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
