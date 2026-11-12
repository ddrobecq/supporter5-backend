import { Router } from 'express';
import ctrl from '../../controllers/matchs.controller';
const router = Router();
router.post('/',       ctrl.create);
router.put('/:id',    ctrl.update);
export default router;
