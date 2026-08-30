import { Router } from 'express';
import { executeMaintenanceQueryHandler } from '../../controllers/maintenance.controller';

const router = Router();

// Console SQL de maintenance : requete libre, confirmation requise pour toute ecriture.
router.post('/query', executeMaintenanceQueryHandler);

export default router;
