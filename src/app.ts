import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index';
import { errorMiddleware } from './middlewares/error.middleware';
import { jsonBody } from './middlewares/jsonBody.middleware';
import { DEFAULT_JSON_BODY_LIMIT_BYTES } from './config/uploadLimits';
import { getSitemapXml } from './services/sitemap.service';
import { sendNotFound } from './lib/responseHelpers';

dotenv.config();

const app = express();

// Hosted behind a single reverse proxy (Render): trust its X-Forwarded-For hop only,
// so req.ip (used by express-rate-limit) is the real client address.
app.set('trust proxy', 1);

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
// These admin routers parse their own JSON body with a larger limit, after the JWT check
// (see their route files); every other route keeps the default 1 MB limit.
const OWN_JSON_PARSER_PREFIXES = [
  '/api/admin/images',
  '/api/admin/epreuves',
  '/api/admin/competitions',
  '/api/admin/import/rencontres',
];
const defaultJsonBody = jsonBody(DEFAULT_JSON_BODY_LIMIT_BYTES);
app.use((req, res, next) => {
  const path = req.path.toLowerCase();
  if (OWN_JSON_PARSER_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    next();
    return;
  }
  defaultJsonBody(req, res, next);
});

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

// Unknown /api routes: JSON 404 (same body as sendNotFound) instead of Express's HTML page.
// The app serves no static files nor the front, so nothing else lives under /api.
app.use('/api', (_req, res) => sendNotFound(res));

// Gestion globale des erreurs (doit être le dernier middleware)
app.use(errorMiddleware);

export default app;
