import { Router } from 'express';
import ctrl, {
	getClubGridById,
	getClubNameHistory,
	getClubProfileById,
	getClubSuggestions,
	getClubTerrainHistory,
	getClubMatches,
	getClubsGrid,
} from '../controllers/clubs.controller';
const router = Router();
router.get('/grid', getClubsGrid);
router.get('/suggest', getClubSuggestions);
router.get('/grid/:id/profile', getClubProfileById);
router.get('/grid/:id/names-history', getClubNameHistory);
router.get('/grid/:id/terrains-history', getClubTerrainHistory);
router.get('/grid/:id/matches', getClubMatches);
router.get('/grid/:id', getClubGridById);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
