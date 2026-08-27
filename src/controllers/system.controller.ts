import { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
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

export async function uploadDatabaseHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await uploadSqliteDatabase(req.file as Express.Multer.File);
    res.status(200).json({
      message: 'Base SQLite importee sur le serveur. Redemarrez le service pour l utiliser immediatement.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

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

export async function restartBackendHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { scheduledInMs, mode } = scheduleBackendRestart();
    res.status(202).json({
      message: mode === 'respawn'
        ? 'Redemarrage du backend programme (relance automatique locale).'
        : 'Redemarrage du backend programme (relance par le superviseur).',
      scheduledInMs,
      mode,
    });
  } catch (error) {
    next(error);
  }
}

export async function versionHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({
      version: readBackendVersion(),
    });
  } catch (error) {
    next(error);
  }
}

export async function contextHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const context = await getSupportedClubContext();
    res.status(200).json(context);
  } catch (error) {
    next(error);
  }
}

export async function themesHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(200).json({ data: await listThemes() }); } catch (error) { next(error); }
}

export async function updateThemeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as { backgroundColor?: string; textColor?: string };
    res.status(200).json({ data: await updateTheme(String(req.params.code ?? ''), String(body.backgroundColor ?? ''), String(body.textColor ?? '')) });
  } catch (error) { next(error); }
}

export default {
  uploadDatabaseHandler,
  downloadDatabaseHandler,
  restartBackendHandler,
  versionHandler,
  contextHandler,
  themesHandler,
  updateThemeHandler,
};
