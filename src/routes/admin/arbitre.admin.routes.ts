import { Router } from 'express';
import ctrl from '../../controllers/arbitre.controller';
import { checkArbitreIntegrity } from '../../lib/arbitreIntegrityChecker';

const router = Router();

router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

// Vérifier les contraintes d'intégrité avant suppression
router.get('/:id/can-delete', async (req, res, next) => {
  try {
    const result = await checkArbitreIntegrity(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', ctrl.remove);

export default router;
