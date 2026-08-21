import { Router } from 'express';
import {
	getSaisonsStat,
	getSaisonTempsStat,
	getSaisonButsStat,
	getSaisonPassesStat,
	getSaisonSanctionsStat,
	getSaisonEquipeTypeStat,
} from '../../controllers/stats/saison.controller';

const router = Router();

router.get('/liste', getSaisonsStat);
router.get('/temps', getSaisonTempsStat);
router.get('/buts', getSaisonButsStat);
router.get('/passes', getSaisonPassesStat);
router.get('/sanctions', getSaisonSanctionsStat);
router.get('/equipe-type', getSaisonEquipeTypeStat);

export default router;
