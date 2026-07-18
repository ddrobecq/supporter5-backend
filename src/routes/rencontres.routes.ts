import { Router } from 'express';
import ctrl from '../controllers/rencontres.controller';
import { getCalendar } from '../controllers/rencontres.controller';
const router = Router();
router.get('/calendar', getCalendar);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
