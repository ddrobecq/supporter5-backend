import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import rencontresAdmin from './rencontres.admin.routes';
import joueursAdmin    from './joueurs.admin.routes';
import statsAdmin      from './stats.admin.routes';
import matchsAdmin     from './matchs.admin.routes';
import equipesAdmin    from './equipes.admin.routes';
import saisonsAdmin    from './saisons.admin.routes';
import toursAdmin      from './tours.admin.routes';
import clubsAdmin      from './clubs.admin.routes';
import natioAdmin      from './natio.admin.routes';
import villeAdmin      from './ville.admin.routes';

const router = Router();

// Toutes les routes admin requièrent un JWT valide
router.use(authMiddleware);

router.use('/rencontres', rencontresAdmin);
router.use('/joueurs',    joueursAdmin);
router.use('/stats',      statsAdmin);
router.use('/matchs',     matchsAdmin);
router.use('/equipes',    equipesAdmin);
router.use('/saisons',    saisonsAdmin);
router.use('/tours',      toursAdmin);
router.use('/clubs',      clubsAdmin);
router.use('/natio',      natioAdmin);
router.use('/ville',      villeAdmin);

export default router;
