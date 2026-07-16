import { Router } from 'express';
import { getImage } from '../controllers/image.controller';

const router = Router();

/**
 * GET /api/images/:entity/:id
 * Route publique (pas de JWT requis) — lecture d'image uniquement.
 * Les entités autorisées sont définies dans lib/imageConfig.ts.
 */
router.get('/:entity/:id', (req, res, next) => {
  getImage(req, res).catch(next);
});

export default router;
