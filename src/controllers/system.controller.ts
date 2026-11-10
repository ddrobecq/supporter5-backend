import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { dataHandler, jsonHandler } from '../lib/responseHelpers';
import { getSqliteDatabaseDownloadInfo, getSupportedClubContext, scheduleBackendRestart, uploadSqliteDatabase } from '../services/system.service';
import { listThemes, updateTheme } from '../services/theme.service';

function readBackendVersion(): string {
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const raw = fs.readFileSync(packagePath, 'utf-8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    const version = String(parsed.version ?? '').trim();
    return version || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const uploadDatabaseHandler = jsonHandler(async (req) => ({
  message: 'Base SQLite importee sur le serveur. Redemarrez le service pour l utiliser immediatement.',
  ...(await uploadSqliteDatabase(req.file as Express.Multer.File)),
}));

export async function downloadDatabaseHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { path: dbPath, fileName, cleanup } = await getSqliteDatabaseDownloadInfo();

    res.download(dbPath, fileName, async (error) => {
      await cleanup();
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
}

export const restartBackendHandler = jsonHandler(async () => {
  const { scheduledInMs, mode } = scheduleBackendRestart();
  return {
    message: mode === 'respawn'
      ? 'Redemarrage du backend programme (relance automatique locale).'
      : 'Redemarrage du backend programme (relance par le superviseur).',
    scheduledInMs,
    mode,
  };
}, 202);

export const versionHandler = jsonHandler(async () => ({ version: readBackendVersion() }));

export const contextHandler = jsonHandler(() => getSupportedClubContext());

export const themesHandler = dataHandler(() => listThemes());

export const updateThemeHandler = dataHandler((req) => {
  const body = req.body as { backgroundColor?: string; textColor?: string };
  return updateTheme(String(req.params.code ?? ''), String(body.backgroundColor ?? ''), String(body.textColor ?? ''));
});

export default {
  uploadDatabaseHandler,
  downloadDatabaseHandler,
  restartBackendHandler,
  versionHandler,
  contextHandler,
  themesHandler,
  updateThemeHandler,
};
