import { Router } from 'express';
import ctrl from '../controllers/tours.controller';
const router = Router();
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
