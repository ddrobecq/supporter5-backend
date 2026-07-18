import { Router } from 'express';
import ctrl from '../../controllers/epreuve.controller';
import { checkEpreuveIntegrity } from '../../lib/integrityChecker';

const router = Router();

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

router.get('/:id/can-delete', async (req, res, next) => {
  try {
    const result = await checkEpreuveIntegrity(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', ctrl.remove);

export default router;