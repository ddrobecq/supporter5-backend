import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import ctrl from '../controllers/terrain.controller';

const router = Router();

// Public routes
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// Admin routes
router.post('/', authMiddleware, ctrl.create);
router.put('/:id', authMiddleware, ctrl.update);
router.delete('/:id', authMiddleware, ctrl.remove);

export default router;
