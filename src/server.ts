import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { resolvedDbPath } from './config/database';
import { refreshActualites } from './services/actualites.service';

const port = process.env.PORT ?? 3000;
const RSS_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${port}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`Database: ${resolvedDbPath}`);

  const refreshNews = () => {
    void refreshActualites()
      .then((count) => console.log(`[news] ${count} actualite(s) RSS enregistree(s).`))
      .catch((error: unknown) => console.error('[news] actualisation RSS ignoree:', error));
  };

  refreshNews();
  setInterval(refreshNews, RSS_REFRESH_INTERVAL_MS).unref();
});
