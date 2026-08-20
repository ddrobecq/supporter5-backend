import { Router } from 'express';
import ctrl from '../controllers/stats.controller';
import statsJoueurRoutes from './stats/joueur.routes';
import statsRencontreRoutes from './stats/rencontre.routes';
import statsArbitreRoutes from './stats/arbitre.routes';
const router = Router();
// Domaines montes avant les routes generiques pour eviter le conflit avec /:id
router.use('/joueur', statsJoueurRoutes);
router.use('/rencontre', statsRencontreRoutes);
router.use('/arbitre', statsArbitreRoutes);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
export default router;
