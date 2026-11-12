import { Router } from 'express';
import ctrl from '../../controllers/equipes.controller';
const router = Router();
router.delete('/:id', ctrl.remove);
export default router;
