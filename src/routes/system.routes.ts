import { Router } from 'express';
import { contextHandler, themesHandler } from '../controllers/system.controller';

const router = Router();

// Contexte d'affichage public : aucun parametre d'administration n'est expose.
router.get('/context', contextHandler);
router.get('/themes', themesHandler);

export default router;