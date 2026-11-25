import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { resolvedDbPath } from './config/database';
import { refreshActualites } from './services/actualites.service';
import { flushHits, startTrafic } from './services/trafic.service';

const port = process.env.PORT ?? 3000;
const RSS_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

app.listen(port, () => {
  console.info(`[${new Date().toISOString()}] Server running on port ${port}`);
  console.info(`NODE_ENV: ${process.env.NODE_ENV ?? 'development'}`);
  console.info(`Database: ${resolvedDbPath}`);

  const refreshNews = () => {
    void refreshActualites()
      .then((count) => console.info(`[news] ${count} actualite(s) RSS enregistree(s).`))
      .catch((error: unknown) => console.error('[news] actualisation RSS ignoree:', error));
  };

  refreshNews();
  setInterval(refreshNews, RSS_REFRESH_INTERVAL_MS).unref();

  startTrafic();
});

// Clean stop (Render sends SIGTERM on deploy / restart): write the audience hits still buffered.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    flushHits();
    process.exit(0);
  });
}
