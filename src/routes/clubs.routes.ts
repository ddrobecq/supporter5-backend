import { Router } from 'express';
import {
	getClubGridById,
	getClubNameHistory,
	getClubProfileById,
	getClubSuggestions,
	getClubTerrainHistory,
	getClubMatches,
	getClubPalmares,
	getClubsGrid,
} from '../controllers/clubs.controller';
const router = Router();
router.get('/grid', getClubsGrid);
router.get('/suggest', getClubSuggestions);
router.get('/grid/:id/profile', getClubProfileById);
router.get('/grid/:id/names-history', getClubNameHistory);
router.get('/grid/:id/terrains-history', getClubTerrainHistory);
router.get('/grid/:id/matches', getClubMatches);
router.get('/grid/:id/palmares', getClubPalmares);
router.get('/grid/:id', getClubGridById);
export default router;
