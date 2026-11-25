import { Router } from 'express';
import {
  getAppareils,
  getPages,
  getPays,
  getReferents,
  getResume,
  getSerie,
  getTempsReel,
} from '../../controllers/trafic.controller';

const router = Router();
router.get('/resume', getResume);
router.get('/serie', getSerie);
router.get('/pages', getPages);
router.get('/referents', getReferents);
router.get('/pays', getPays);
router.get('/appareils', getAppareils);
router.get('/temps-reel', getTempsReel);

export default router;
