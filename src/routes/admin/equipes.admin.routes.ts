import { Router } from 'express';
import ctrl from '../../controllers/equipes.controller';
const router = Router();
router.delete('/bulk', ctrl.bulkDelete);
router.delete('/:id', ctrl.remove);
export default router;
