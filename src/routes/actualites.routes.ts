import { Router } from 'express';
import { getActualiteImageHandler, listActualites } from '../controllers/actualites.controller';

const router = Router();
router.get('/', listActualites);
router.get('/:id/image', getActualiteImageHandler);
export default router;