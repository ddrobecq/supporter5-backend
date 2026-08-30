import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import rencontresAdmin from './rencontres.admin.routes';
import joueursAdmin    from './joueurs.admin.routes';
import statsAdmin      from './stats.admin.routes';
import matchsAdmin     from './matchs.admin.routes';
import equipesAdmin    from './equipes.admin.routes';
import saisonsAdmin    from './saisons.admin.routes';
import qualifAdmin     from './qualif.admin.routes';
import toursAdmin      from './tours.admin.routes';
import tourDefAdmin    from './tourdef.admin.routes';
import clubsAdmin      from './clubs.admin.routes';
import natioAdmin      from './natio.admin.routes';
import villeAdmin      from './ville.admin.routes';
import arbitreAdmin    from './arbitre.admin.routes';
import terrainAdmin    from './terrain.admin.routes';
import deviseAdmin     from './devise.admin.routes';
import circAdmin       from './circ.admin.routes';
import epreuveAdmin    from './epreuve.admin.routes';
import competitionAdmin from './competition.admin.routes';
import rssAdmin        from './rss.admin.routes';
import imagesAdmin     from './images.admin.routes';
import importAdmin     from './import.admin.routes';
import incompletsAdmin from './incomplets.admin.routes';
import maintenanceAdmin from './maintenance.admin.routes';
import systemAdmin     from './system.admin.routes';

const router = Router();

// Toutes les routes admin requièrent un JWT valide
router.use(authMiddleware);

router.use('/rencontres', rencontresAdmin);
router.use('/joueurs',    joueursAdmin);
router.use('/stats',      statsAdmin);
router.use('/incomplets', incompletsAdmin);
router.use('/import',     importAdmin);
router.use('/matchs',     matchsAdmin);
router.use('/equipes',    equipesAdmin);
router.use('/saisons',    saisonsAdmin);
router.use('/qualifs',    qualifAdmin);
router.use('/tours',      toursAdmin);
router.use('/tourdefs',   tourDefAdmin);
router.use('/clubs',      clubsAdmin);
router.use('/natio',      natioAdmin);
router.use('/ville',      villeAdmin);
router.use('/arbitre',    arbitreAdmin);
router.use('/terrains',   terrainAdmin);
router.use('/devises',    deviseAdmin);
router.use('/circs',      circAdmin);
router.use('/epreuves',   epreuveAdmin);
router.use('/competitions', competitionAdmin);
router.use('/rss',        rssAdmin);
router.use('/images', imagesAdmin);
router.use('/system', systemAdmin);
router.use('/maintenance', maintenanceAdmin);

export default router;
