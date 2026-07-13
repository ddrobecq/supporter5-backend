import { Router } from 'express';
import ctrl from '../../controllers/equipes.controller';
const router = Router();
router.post('/',       ctrl.create);
router.put('/:id',    ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);
router.delete('/:id', ctrl.remove);
export default router;
