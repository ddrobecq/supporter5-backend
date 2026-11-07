import { Router } from 'express';
import ctrl from '../controllers/terrain.controller';

const router = Router();

// Public routes (read only): writes live under /api/admin/terrains.
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

export default router;
