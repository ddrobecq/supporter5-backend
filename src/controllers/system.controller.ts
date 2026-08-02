import { Request, Response, NextFunction } from 'express';
import { scheduleBackendRestart, uploadSqliteDatabase } from '../services/system.service';

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

export default {
  uploadDatabaseHandler,
  restartBackendHandler,
};
