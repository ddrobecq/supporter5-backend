import { Router } from 'express';
import {
	getImportAssociationsList,
	importRencontresFromFile,
	upsertImportAssociation,
} from '../../controllers/import.controller';
const router = Router();
router.get('/associations', getImportAssociationsList);
router.post('/associations', upsertImportAssociation);
router.post('/rencontres', importRencontresFromFile);
export default router;
