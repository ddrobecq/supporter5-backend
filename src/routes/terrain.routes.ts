import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  listTerrains,
  getTerrain,
  createTerrainHandler,
  updateTerrainHandler,
  deleteTerrainHandler,
} from '../controllers/terrain.controller';

const router = Router();

// Public routes
router.get('/', listTerrains);
router.get('/:id', getTerrain);

// Admin routes
router.post('/', authMiddleware, createTerrainHandler);
router.put('/:id', authMiddleware, updateTerrainHandler);
router.delete('/:id', authMiddleware, deleteTerrainHandler);

export default router;
