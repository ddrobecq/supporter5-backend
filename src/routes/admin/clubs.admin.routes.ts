import { Router } from 'express';
import ctrl from '../../controllers/clubs.controller';
import { removeClub } from '../../controllers/clubs.controller';
import { createClubWithWizard } from '../../controllers/clubs.controller';
import { updateClubColors } from '../../controllers/clubs.controller';
import { updateClubProfile } from '../../controllers/clubs.controller';
import { checkClubIntegrity } from '../../lib/integrityChecker';
const router = Router();
router.post('/',       ctrl.create);
router.post('/wizard-create', createClubWithWizard);
router.put('/:id/profile', updateClubProfile);
router.put('/:id/colors', updateClubColors);
router.put('/:id',    ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

// Vérifier les contraintes d'intégrité avant suppression
router.get('/:id/can-delete', async (req, res, next) => {
	try {
		const result = await checkClubIntegrity(req.params.id);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
});

router.delete('/:id', removeClub);
export default router;
