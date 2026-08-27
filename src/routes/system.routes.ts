import { Router } from 'express';
import { contextHandler } from '../controllers/system.controller';

const router = Router();

// Contexte d'affichage public : aucun parametre d'administration n'est expose.
router.get('/context', contextHandler);

export default router;