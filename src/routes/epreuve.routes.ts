import { Router } from 'express';
import ctrl, { getEpreuvePalmares, getEpreuveSuggestions } from '../controllers/epreuve.controller';

const router = Router();

router.get('/suggest', getEpreuveSuggestions);
router.get('/', ctrl.getAll);
router.get('/:id/palmares', getEpreuvePalmares);
router.get('/:id', ctrl.getById);

export default router;