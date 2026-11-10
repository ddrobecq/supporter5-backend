import { Router } from 'express';
import ctrl, { integrityChecker, createCompetitionWithWizard } from '../../controllers/competition.controller';
import { bindCanDeleteRoute } from './canDeleteRoute';
import { jsonBody } from '../../middlewares/jsonBody.middleware';
import { IMAGE_JSON_BODY_LIMIT_BYTES } from '../../config/uploadLimits';

const router = Router();

// LOGO is sent as a data URL (global JSON parser skipped for this prefix in app.ts).
router.use(jsonBody(IMAGE_JSON_BODY_LIMIT_BYTES));

router.post('/', ctrl.create);
router.post('/wizard-create', createCompetitionWithWizard);
router.put('/:id', ctrl.update);
router.patch('/bulk', ctrl.bulkUpdate);
router.delete('/bulk', ctrl.bulkDelete);

bindCanDeleteRoute(router, integrityChecker);

router.delete('/:id', ctrl.remove);

export default router;
