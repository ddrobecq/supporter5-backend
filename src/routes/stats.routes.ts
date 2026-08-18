import { Router } from 'express';
import ctrl from '../controllers/stats.controller';
import statsJoueurRoutes from './stats/joueur.routes';
const router = Router();
// Domaine: Joueur (mont avant les routes generiques pour eviter le conflit avec /:id)
router.use('/joueur', statsJoueurRoutes);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
