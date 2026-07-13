import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginHandler } from '../controllers/auth.controller';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();
router.post('/login', limiter, loginHandler);

export default router;
