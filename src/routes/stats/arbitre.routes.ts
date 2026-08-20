import { Router } from 'express';
import { getArbitreMatchesStat, getArbitreAvertissementsStat, getArbitreExclusionsStat } from '../../controllers/stats/arbitre.controller';

const router = Router();

// Theme: Matches
router.get('/matches', getArbitreMatchesStat);

// Theme: Sanctions
router.get('/sanctions/avertissements', getArbitreAvertissementsStat);
router.get('/sanctions/exclusions', getArbitreExclusionsStat);

export default router;
