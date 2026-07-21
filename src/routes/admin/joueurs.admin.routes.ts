import { Router } from 'express';
import ctrl from '../../controllers/joueurs.controller';
import { checkJoueurIntegrity } from '../../lib/joueurIntegrityChecker';
const router = Router();
router.post('/',       ctrl.create);
router.put('/:id',    ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

router.get('/:id/can-delete', async (req, res, next) => {
	try {
		const result = await checkJoueurIntegrity(req.params.id);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
});

router.delete('/:id', ctrl.remove);
export default router;
