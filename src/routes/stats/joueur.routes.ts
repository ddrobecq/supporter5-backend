import { Router } from 'express';
import {
	getApparitionsParSaison,
	getApparitionsPlusSelectionnes,
	getNombreAnneesAuClubStat,
	getDernierMatchStat,
	getButeursStat,
	getButeursParSaisonStat,
	getButeursParMatchStat,
	getPassesStat,
	getPassesParSaisonStat,
	getPassesParMatchStat,
	getAvertissementsStat,
	getAvertissementsParSaisonStat,
	getExclusionsStat,
	getExclusionsParSaisonStat,
	getExclusionsRapidesStat,
	getMeilleursGardiensStat,
	getSeriesInviolabiliteStat,
	getEfficacitePassesStat,
	getSeriesPassesStat,
	getEfficaciteButeursStat,
	getSeriesButeursStat,
	getPremierMatchStat,
} from '../../controllers/stats/joueur.controller';

const router = Router();

// Theme: Apparitions
router.get('/apparitions/plus-selectionnes', getApparitionsPlusSelectionnes);
router.get('/apparitions/saison', getApparitionsParSaison);
router.get('/apparitions/anciennete', getNombreAnneesAuClubStat);
router.get('/apparitions/plus-jeune', getPremierMatchStat);
router.get('/apparitions/plus-vieux', getDernierMatchStat);
router.get('/buts/general', getButeursStat);
router.get('/buts/saison', getButeursParSaisonStat);
router.get('/buts/match', getButeursParMatchStat);
router.get('/buts/moyenne', getEfficaciteButeursStat);
router.get('/buts/serie', getSeriesButeursStat);
router.get('/passes/general', getPassesStat);
router.get('/passes/saison', getPassesParSaisonStat);
router.get('/passes/match', getPassesParMatchStat);
router.get('/passes/moyenne', getEfficacitePassesStat);
router.get('/passes/serie', getSeriesPassesStat);
router.get('/sanctions/avertissements/general', getAvertissementsStat);
router.get('/sanctions/avertissements/saison', getAvertissementsParSaisonStat);
router.get('/sanctions/exclusions/general', getExclusionsStat);
router.get('/sanctions/exclusions/saison', getExclusionsParSaisonStat);
router.get('/sanctions/exclusions/rapides', getExclusionsRapidesStat);
router.get('/gardiens/meilleurs', getMeilleursGardiensStat);
router.get('/gardiens/serie-inviolabilite', getSeriesInviolabiliteStat);

export default router;
