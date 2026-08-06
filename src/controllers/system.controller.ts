import { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { scheduleBackendRestart, uploadSqliteDatabase } from '../services/system.service';

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

export default {
  uploadDatabaseHandler,
  restartBackendHandler,
  versionHandler,
};
