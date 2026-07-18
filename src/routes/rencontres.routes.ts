import { Router } from 'express';
import ctrl, { getCalendar } from '../controllers/rencontres.controller';
const router = Router();
router.get('/calendar', getCalendar);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
