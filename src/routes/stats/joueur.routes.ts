import { Router } from 'express';
import {
	getApparitionsParSaison,
	getApparitionsPlusSelectionnes,
	getApparitionsEquipeType,
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
	getVictoiresStat,
	getNulsStat,
	getDefaitesStat,
	getAchatsStat,
	getVentesStat,
	getPlusValuesStat,
	getMoinsValuesStat,
	getGrandsStat,
	getPetitsStat,
	getGabaritsStat,
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
router.get('/apparitions/equipe-type', getApparitionsEquipeType);
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
router.get('/performances/victoires', getVictoiresStat);
router.get('/performances/nuls', getNulsStat);
router.get('/performances/defaites', getDefaitesStat);
router.get('/transferts/achats', getAchatsStat);
router.get('/transferts/ventes', getVentesStat);
router.get('/transferts/plus-values', getPlusValuesStat);
router.get('/transferts/moins-values', getMoinsValuesStat);
router.get('/physique/grands', getGrandsStat);
router.get('/physique/petits', getPetitsStat);
router.get('/physique/gabarits', getGabaritsStat);

export default router;
