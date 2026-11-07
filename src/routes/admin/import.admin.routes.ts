import { Router } from 'express';
import {
	getImportAssociationsList,
	importRencontresFromFile,
	upsertImportAssociation,
} from '../../controllers/import.controller';
import { jsonBody } from '../../middlewares/jsonBody.middleware';
import { CSV_IMPORT_JSON_BODY_LIMIT_BYTES } from '../../config/uploadLimits';
const router = Router();
router.get('/associations', getImportAssociationsList);
router.post('/associations', upsertImportAssociation);
// CSV rows sent as JSON (global JSON parser skipped for this path in app.ts).
router.post('/rencontres', jsonBody(CSV_IMPORT_JSON_BODY_LIMIT_BYTES), importRencontresFromFile);
export default router;
