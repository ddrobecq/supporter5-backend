import { Router } from 'express';
import {
	getScoresVictoiresStat,
	getScoresDefaitesStat,
	getScoresProlifiquesStat,
	getAffluenceStat,
	getSanctionsAvertissementsStat,
	getSanctionsExclusionsStat,
	getSeriesVictoiresStat,
	getSeriesNulsStat,
	getSeriesDefaitesStat,
	getSeriesInvincibiliteStat,
	getSeriesInviolabiliteStat,
	getSeriesInefficaciteStat,
} from '../../controllers/stats/rencontre.controller';

const router = Router();

// Theme: Scores
router.get('/scores/victoires', getScoresVictoiresStat);
router.get('/scores/defaites', getScoresDefaitesStat);
router.get('/scores/prolifiques', getScoresProlifiquesStat);

// Theme: Affluence (pas de sous-item)
router.get('/affluence', getAffluenceStat);

// Theme: Sanctions
router.get('/sanctions/avertissements', getSanctionsAvertissementsStat);
router.get('/sanctions/exclusions', getSanctionsExclusionsStat);

// Theme: Series
router.get('/series/victoires', getSeriesVictoiresStat);
router.get('/series/nuls', getSeriesNulsStat);
router.get('/series/defaites', getSeriesDefaitesStat);
router.get('/series/invincibilite', getSeriesInvincibiliteStat);
router.get('/series/inviolabilite', getSeriesInviolabiliteStat);
router.get('/series/inefficacite', getSeriesInefficaciteStat);

export default router;
