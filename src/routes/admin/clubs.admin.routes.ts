import { Router } from 'express';
import ctrl from '../../controllers/clubs.controller';
import { removeClub } from '../../controllers/clubs.controller';
import { createClubWithWizard } from '../../controllers/clubs.controller';
import { updateClubColors } from '../../controllers/clubs.controller';
import { updateClubProfile } from '../../controllers/clubs.controller';
import { createClubNameHistory } from '../../controllers/clubs.controller';
import { updateClubNameHistory } from '../../controllers/clubs.controller';
import { deleteClubNameHistory } from '../../controllers/clubs.controller';
import { createClubTerrainHistory } from '../../controllers/clubs.controller';
import { updateClubTerrainHistory } from '../../controllers/clubs.controller';
import { deleteClubTerrainHistory } from '../../controllers/clubs.controller';
import { checkClubIntegrity } from '../../lib/integrityChecker';
const router = Router();
router.post('/',       ctrl.create);
router.post('/wizard-create', createClubWithWizard);
router.put('/:id/profile', updateClubProfile);
router.put('/:id/colors', updateClubColors);
router.post('/:id/names', createClubNameHistory);
router.put('/:id/names/:nameId', updateClubNameHistory);
router.delete('/:id/names/:nameId', deleteClubNameHistory);
router.post('/:id/terrains', createClubTerrainHistory);
router.put('/:id/terrains/:terrainId', updateClubTerrainHistory);
router.delete('/:id/terrains/:terrainId', deleteClubTerrainHistory);
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
