import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index';
import { errorMiddleware } from './middlewares/error.middleware';
import { getSitemapXml } from './services/sitemap.service';

dotenv.config();

const app = express();

// Sécurité
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Parsing
app.use(express.json({ limit: '1mb' }));

// Santé
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Référencement : contenu généré et mis en cache côté serveur pendant 24 h.
app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const xml = await getSitemapXml();
    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=86400')
      .send(xml);
  } catch (error) {
    next(error);
  }
});

// API
app.use('/api', routes);

// Gestion globale des erreurs (doit être le dernier middleware)
app.use(errorMiddleware);

export default app;
