import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { dataHandler, jsonHandler } from '../lib/responseHelpers';
import { getSqliteDatabaseDownloadInfo, getSupportedClubContext, scheduleBackendRestart, uploadSqliteDatabase } from '../services/system.service';
import { listThemes, updateTheme } from '../services/theme.service';
import { requireBodyObject, toRawText, toText } from '../lib/coerce';

function readBackendVersion(): string {
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const raw = fs.readFileSync(packagePath, 'utf-8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    const version = toText(parsed.version);
    return version || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const uploadDatabaseHandler = jsonHandler(async (req) => ({
  message: 'Base SQLite importee sur le serveur. Redemarrez le service pour l utiliser immediatement.',
  ...(await uploadSqliteDatabase(req.file as Express.Multer.File)),
}));

export function downloadDatabaseHandler(_req: Request, res: Response, next: NextFunction): void {
  getSqliteDatabaseDownloadInfo()
    .then(({ path: dbPath, fileName, cleanup }) => {
      res.download(dbPath, fileName, (error) => {
        // cleanup() never rejects (unlink errors are ignored in system.service)
        void cleanup();
        if (error) {
          next(error);
        }
      });
    })
    .catch(next);
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
  const body = requireBodyObject(req.body);
  return updateTheme(req.params.code, toRawText(body.backgroundColor), toRawText(body.textColor));
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
