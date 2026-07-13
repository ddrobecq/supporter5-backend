import dotenv from 'dotenv';

dotenv.config();

import app from './app';

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${port}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? 'development'}`);
});
