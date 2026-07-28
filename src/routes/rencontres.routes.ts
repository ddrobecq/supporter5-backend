import { Router } from 'express';
import ctrl, { getCalendar, getRencontreDetail } from '../controllers/rencontres.controller';
const router = Router();
router.get('/calendar', getCalendar);
router.get('/:id/detail', getRencontreDetail);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
