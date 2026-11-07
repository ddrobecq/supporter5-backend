import { Router } from 'express';
import { updateImage } from '../../controllers/image.controller';
import { jsonBody } from '../../middlewares/jsonBody.middleware';
import { IMAGE_JSON_BODY_LIMIT_BYTES } from '../../config/uploadLimits';

const router = Router();

// Image data URLs exceed the global 1 MB JSON limit (skipped for this prefix in app.ts).
router.use(jsonBody(IMAGE_JSON_BODY_LIMIT_BYTES));

router.put('/:entity/:id', (req, res, next) => {
  updateImage(req, res).catch(next);
});

export default router;
