import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './src/routes/auth.routes';
import rencontresRoutes from './src/routes/rencontres.routes';
import joueursRoutes from './src/routes/joueurs.routes';
import statsRoutes from './src/routes/stats.routes';
import matchsRoutes from './src/routes/matchs.routes';
import equipesRoutes from './src/routes/equipes.routes';
import saisonsRoutes from './src/routes/saisons.routes';
import toursRoutes from './src/routes/tours.routes';
import clubsRoutes from './src/routes/clubs.routes';
import adminRoutes from './src/routes/admin';
import { errorMiddleware } from './src/middlewares/error.middleware';

const app = express();

// Middlewares de sécurité
app.use(helmet());

// CORS
const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3001').split(',');
app.use(cors({ origin: origins }));

// Body parser
app.use(express.json({ limit: '10mb' }));

// Routes publiques
app.use('/api/auth', authRoutes);
app.use('/api/rencontres', rencontresRoutes);
app.use('/api/joueurs', joueursRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/matchs', matchsRoutes);
app.use('/api/equipes', equipesRoutes);
app.use('/api/saisons', saisonsRoutes);
app.use('/api/tours', toursRoutes);
app.use('/api/clubs', clubsRoutes);

// Routes admin (sécurisées JWT)
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handler d'erreurs global
app.use(errorMiddleware);

export default app;
