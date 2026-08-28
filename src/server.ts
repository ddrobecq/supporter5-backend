import dotenv from 'dotenv';

dotenv.config();

import path from 'node:path';
import app from './app';
import { refreshActualites } from './services/actualites.service';

const port = process.env.PORT ?? 3000;
const RSS_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

const configuredDbPath = (process.env.SQLITE_DB_PATH ?? './data/supporter.sqlite').trim();
const resolvedDbPath = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.resolve(process.cwd(), configuredDbPath);

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
