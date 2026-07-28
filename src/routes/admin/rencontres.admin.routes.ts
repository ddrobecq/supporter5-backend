import { Router } from 'express';
import ctrl from '../../controllers/rencontres.controller';
const router = Router();
router.post('/',       ctrl.createWithImpact);
router.put('/:id',    ctrl.updateWithImpact);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);
router.delete('/:id', ctrl.removeWithImpact);
export default router;
