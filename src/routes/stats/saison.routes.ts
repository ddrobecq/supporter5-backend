import { Router } from 'express';
import {
	getSaisonsStat,
	getSaisonTempsStat,
	getSaisonButsStat,
	getSaisonPassesStat,
	getSaisonSanctionsStat,
	getSaisonEquipeTypeStat,
	getSaisonNombreJoueursStat,
	getSaisonNombreEtrangersStat,
	getSaisonNombreNationalitesStat,
	getSaisonAgeMoyenStat,
	getSaisonNombreMatchesStat,
	getSaisonNombreRemplacementsStat,
	getSaisonSchemaEvolutionStat,
	getSaisonButsPourStat,
	getSaisonButsContreStat,
	getSaisonButsPourMatchStat,
	getSaisonButsContreMatchStat,
	getSaisonButsMatchStat,
	getSaisonAvertissementsEquipeStat,
	getSaisonExclusionsEquipeStat,
	getSaisonAvertissementsMatchStat,
	getSaisonExclusionsMatchStat,
	getSaisonAchatsCumulesStat,
	getSaisonVentesCumuleesStat,
} from '../../controllers/stats/saison.controller';

const router = Router();

router.get('/liste', getSaisonsStat);
router.get('/temps', getSaisonTempsStat);
router.get('/buts', getSaisonButsStat);
router.get('/passes', getSaisonPassesStat);
router.get('/sanctions', getSaisonSanctionsStat);
router.get('/equipe-type', getSaisonEquipeTypeStat);
router.get('/composition/nombre-joueurs', getSaisonNombreJoueursStat);
router.get('/composition/nombre-etrangers', getSaisonNombreEtrangersStat);
router.get('/composition/nombre-nationalites', getSaisonNombreNationalitesStat);
router.get('/composition/age-moyen', getSaisonAgeMoyenStat);
router.get('/composition/nombre-matches', getSaisonNombreMatchesStat);
router.get('/composition/nombre-remplacements', getSaisonNombreRemplacementsStat);
router.get('/composition/evolution-schema', getSaisonSchemaEvolutionStat);
router.get('/buts-equipe/buts-pour', getSaisonButsPourStat);
router.get('/buts-equipe/buts-contre', getSaisonButsContreStat);
router.get('/buts-equipe/buts-pour-match', getSaisonButsPourMatchStat);
router.get('/buts-equipe/buts-contre-match', getSaisonButsContreMatchStat);
router.get('/buts-equipe/buts-match', getSaisonButsMatchStat);
router.get('/sanctions-equipe/avertissements', getSaisonAvertissementsEquipeStat);
router.get('/sanctions-equipe/exclusions', getSaisonExclusionsEquipeStat);
router.get('/sanctions-equipe/avertissements-match', getSaisonAvertissementsMatchStat);
router.get('/sanctions-equipe/exclusions-match', getSaisonExclusionsMatchStat);
router.get('/transferts/achats-cumules', getSaisonAchatsCumulesStat);
router.get('/transferts/ventes-cumulees', getSaisonVentesCumuleesStat);

export default router;
