import { Router } from 'express';
import authRoutes      from './auth.routes';
import rencontresRoutes from './rencontres.routes';
import joueursRoutes   from './joueurs.routes';
import statsRoutes     from './stats.routes';
import matchsRoutes    from './matchs.routes';
import equipesRoutes   from './equipes.routes';
import saisonsRoutes   from './saisons.routes';
import toursRoutes     from './tours.routes';
import clubsRoutes     from './clubs.routes';
import natioRoutes     from './natio.routes';
import villeRoutes     from './ville.routes';
import arbitreRoutes   from './arbitre.routes';
import terrainRoutes   from './terrain.routes';
import deviseRoutes    from './devise.routes';
import circRoutes      from './circ.routes';
import imageRoutes     from './image.routes';
import adminRoutes     from './admin/index';

const router = Router();

// Authentification
router.use('/auth', authRoutes);

// Routes publiques (lecture seule)
router.use('/rencontres', rencontresRoutes);
router.use('/joueurs',    joueursRoutes);
router.use('/stats',      statsRoutes);
router.use('/matchs',     matchsRoutes);
router.use('/equipes',    equipesRoutes);
router.use('/saisons',    saisonsRoutes);
router.use('/tours',      toursRoutes);
router.use('/clubs',      clubsRoutes);
router.use('/natio',      natioRoutes);
router.use('/ville',      villeRoutes);
router.use('/arbitre',    arbitreRoutes);
router.use('/terrains',   terrainRoutes);
router.use('/devises',    deviseRoutes);
router.use('/circs',      circRoutes);
router.use('/images',     imageRoutes);

// Routes admin (JWT requis – appliqué dans admin/index.ts)
router.use('/admin', adminRoutes);

export default router;
