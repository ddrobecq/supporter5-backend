import dotenv from 'dotenv';

dotenv.config();

import path from 'node:path';
import app from './app';

const port = process.env.PORT ?? 3000;

const configuredDbPath = (process.env.SQLITE_DB_PATH ?? '/data/supporter.sqlite').trim();
const resolvedDbPath = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.resolve(process.cwd(), configuredDbPath);

app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${port}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`Database: ${resolvedDbPath}`);
});
