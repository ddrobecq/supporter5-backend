import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { AppError } from '../types';

const ALLOWED_EXTENSIONS = new Set(['.sqlite', '.db']);
const SQLITE_PENDING_SUFFIX = '.pending-upload';

function getPendingUploadPath(dbPath: string): string {
  return `${dbPath}${SQLITE_PENDING_SUFFIX}`;
}

function isLockedFileError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  return code === 'EPERM' || code === 'EACCES' || code === 'EBUSY';
}

function resolveDbPath(): string {
  const configuredDbPath = (process.env.SQLITE_DB_PATH ?? './data/supporter.sqlite').trim();
  if (!configuredDbPath) {
    throw new AppError(500, 'SQLITE_DB_PATH est vide.');
  }

  return path.isAbsolute(configuredDbPath)
    ? configuredDbPath
    : path.resolve(process.cwd(), configuredDbPath);
}

function assertAllowedExtension(originalName: string): void {
  const ext = path.extname(String(originalName ?? '')).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    return;
  }
  throw new AppError(400, 'Le fichier doit etre une base SQLite (.sqlite ou .db).');
}

export async function uploadSqliteDatabase(file: Express.Multer.File): Promise<{ path: string; size: number; restartRequired: true }> {
  if (!file) {
    throw new AppError(400, 'Aucun fichier recu.');
  }

  assertAllowedExtension(file.originalname);

  const resolvedDbPath = resolveDbPath();
  const dbDirectory = path.dirname(resolvedDbPath);
  await fs.mkdir(dbDirectory, { recursive: true });

  const tempPath = `${resolvedDbPath}.upload-${Date.now()}.tmp`;
  const pendingPath = getPendingUploadPath(resolvedDbPath);
  const sourcePath = typeof file.path === 'string' && file.path.length > 0 ? file.path : null;

  if (sourcePath) {
    const stats = await fs.stat(sourcePath).catch(() => null);
    if (!stats || stats.size < 1024) {
      throw new AppError(400, 'Fichier SQLite invalide ou trop petit.');
    }
  } else if (!file.buffer || file.buffer.length < 1024) {
    throw new AppError(400, 'Fichier SQLite invalide ou trop petit.');
  }

  try {
    if (sourcePath) {
      await fs.copyFile(sourcePath, tempPath);
    } else {
      await fs.writeFile(tempPath, file.buffer);
    }

    try {
      await fs.rename(tempPath, resolvedDbPath);
    } catch (error) {
      if (!isLockedFileError(error)) {
        throw error;
      }

      // Windows can lock the active SQLite file while the backend process is running.
      // Store the upload and apply it at next startup before opening the DB connection.
      await fs.copyFile(tempPath, pendingPath);
    }
  } finally {
    // Cleanup if rename failed.
    fs.rm(tempPath, { force: true }).catch(() => undefined);
    if (sourcePath) {
      fs.rm(sourcePath, { force: true }).catch(() => undefined);
    }
  }

  return {
    path: resolvedDbPath,
    size: file.size,
    restartRequired: true,
  };
}

export function scheduleBackendRestart(delayMs = 350): { scheduledInMs: number; mode: 'exit' | 'respawn' } {
  const safeDelay = Number.isFinite(delayMs) ? Math.max(100, Math.floor(delayMs)) : 350;
  const configuredMode = (process.env.BACKEND_RESTART_MODE ?? '').trim().toLowerCase();
  const mode: 'exit' | 'respawn' = configuredMode === 'respawn'
    ? 'respawn'
    : configuredMode === 'exit'
      ? 'exit'
      : process.env.NODE_ENV === 'production'
        ? 'exit'
        : 'respawn';

  setTimeout(() => {
    if (mode === 'respawn') {
      try {
        const child = spawn(
          process.execPath,
          [...process.execArgv, ...process.argv.slice(1)],
          {
            cwd: process.cwd(),
            env: process.env,
            detached: true,
            stdio: 'ignore',
          },
        );
        child.unref();
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.error(`[system] restart respawn failed: ${details}`);
        process.exit(1);
      }
    }

    process.exit(0);
  }, safeDelay);

  return { scheduledInMs: safeDelay, mode };
}

export default {
  uploadSqliteDatabase,
  scheduleBackendRestart,
};
