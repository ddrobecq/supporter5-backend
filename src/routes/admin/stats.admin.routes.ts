import { Router } from 'express';
import ctrl, { recomputePlayerStats } from '../../controllers/stats.controller';
const router = Router();
router.post('/recompute', recomputePlayerStats);
router.post('/',       ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);
export default router;
