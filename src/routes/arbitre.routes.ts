import { Router } from 'express';
import ctrl, { getArbitreSuggestions } from '../controllers/arbitre.controller';

const router = Router();

router.get('/suggest', getArbitreSuggestions);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

export default router;
