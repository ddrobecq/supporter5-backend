import { Router } from 'express';
import ctrl, { integrityChecker } from '../../controllers/epreuve.controller';
import { createEpreuveWithWizard } from '../../controllers/epreuve.controller';
import { bindCanDeleteRoute } from './canDeleteRoute';
import { jsonBody } from '../../middlewares/jsonBody.middleware';
import { IMAGE_JSON_BODY_LIMIT_BYTES } from '../../config/uploadLimits';

const router = Router();

// EPR_VISUEL is sent as a data URL (global JSON parser skipped for this prefix in app.ts).
router.use(jsonBody(IMAGE_JSON_BODY_LIMIT_BYTES));

router.post('/', ctrl.create);
router.post('/wizard-create', createEpreuveWithWizard);
router.put('/:id', ctrl.update);

bindCanDeleteRoute(router, integrityChecker);

router.delete('/:id', ctrl.remove);

export default router;