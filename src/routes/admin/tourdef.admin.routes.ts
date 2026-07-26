import { Router } from 'express';
import ctrl from '../../controllers/tourdef.controller';

const router = Router();

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);
router.delete('/:id', ctrl.remove);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

export default router;
