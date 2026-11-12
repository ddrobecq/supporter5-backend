import { Router } from 'express';
import ctrl from '../../controllers/qualif.controller';

const router = Router();

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
