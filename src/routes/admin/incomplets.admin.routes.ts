import { Router } from 'express';
import { getClubsIncompletsList, getJoueursIncompletsList, getRencontresIncompletesList } from '../../controllers/incomplets.controller';
const router = Router();
router.get('/joueurs', getJoueursIncompletsList);
router.get('/clubs', getClubsIncompletsList);
router.get('/rencontres', getRencontresIncompletesList);
export default router;
