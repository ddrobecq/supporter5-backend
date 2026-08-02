import { Router } from 'express';
import { updateImage } from '../../controllers/image.controller';

const router = Router();

router.put('/:entity/:id', (req, res, next) => {
  updateImage(req, res).catch(next);
});

export default router;
