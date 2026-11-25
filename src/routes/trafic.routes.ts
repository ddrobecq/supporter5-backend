import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { postHit } from '../controllers/trafic.controller';
import { textBody } from '../middlewares/textBody.middleware';

const HIT_BODY_LIMIT_BYTES = 2 * 1024;

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();
// Public: sent by navigator.sendBeacon as text/plain (no CORS preflight), JSON inside.
router.post('/hit', limiter, textBody(HIT_BODY_LIMIT_BYTES), postHit);

export default router;
