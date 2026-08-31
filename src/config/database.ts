import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const configuredDbPath = (process.env.SQLITE_DB_PATH ?? './data/supporter.sqlite').trim();
const resolvedDbPath = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.resolve(process.cwd(), configuredDbPath);

if (!resolvedDbPath) {
  throw new Error('Missing SQLITE_DB_PATH environment variable');
}

const dbDirectory = path.dirname(resolvedDbPath);
try {
  fs.mkdirSync(dbDirectory, { recursive: true });
} catch (error) {
  const details = error instanceof Error ? error.message : String(error);
  throw new Error(`Unable to create SQLite directory "${dbDirectory}": ${details}`);
}

/**
 * Supprime les -wal/-shm laisses par la base precedente. A n'appeler qu'une fois le fichier
 * principal deja remplace: ces sidecars appartiennent alors a l'ancienne generation et seraient
 * sinon rejoues par erreur (recovery WAL) sur le nouveau fichier a l'ouverture, le corrompant.
 */
function removeWalSidecarsSync(dbPath: string): void {
  for (const suffix of ['-wal', '-shm']) {
    try {
      fs.unlinkSync(`${dbPath}${suffix}`);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

function applyPendingUploadedDatabase(dbPath: string): void {
  const pendingPath = `${dbPath}.pending-upload`;
  if (!fs.existsSync(pendingPath)) {
    return;
  }

  const backupPath = `${dbPath}.backup-before-pending`;

  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    fs.copyFileSync(pendingPath, dbPath);
    fs.unlinkSync(pendingPath);
    // Le fichier principal vient d'etre remplace par l'import en attente: purge les -wal/-shm
    // de l'ancienne base avant que la connexion SQLite ne soit ouverte plus bas.
    removeWalSidecarsSync(dbPath);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to apply pending SQLite upload "${pendingPath}": ${details}`);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Supprime les artefacts transitoires laisses par un process precedent qui aurait crashe ou ete
 * redemarre en plein telechargement/upload (ex: deploiement, restart manuel). Ces fichiers ne
 * sont jamais necessaires a l'ouverture normale de la base et peuvent saturer le disque persistant
 * s'ils s'accumulent (chacun peut faire la taille complete de la base).
 */
function cleanupStaleSqliteArtifacts(dbPath: string): void {
  const dbDirectory = path.dirname(dbPath);
  const baseName = path.basename(dbPath);

  for (const suffix of ['.download-snapshot', '.backup-before-pending']) {
    const staleFile = `${dbPath}${suffix}`;
    try {
      fs.unlinkSync(staleFile);
      console.log(`[startup] Removed stale SQLite artifact: ${staleFile}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        console.warn(`[startup] Could not remove stale artifact "${staleFile}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // Upload temp files carry a timestamp suffix (supporter.sqlite.upload-<ts>.tmp): scan the dir.
  const uploadTmpPattern = new RegExp(`^${escapeRegExp(baseName)}\\.upload-\\d+\\.tmp$`);
  try {
    for (const entry of fs.readdirSync(dbDirectory)) {
      if (!uploadTmpPattern.test(entry)) continue;
      const fullPath = path.join(dbDirectory, entry);
      try {
        fs.unlinkSync(fullPath);
        console.log(`[startup] Removed stale SQLite artifact: ${fullPath}`);
      } catch (error) {
        console.warn(`[startup] Could not remove stale artifact "${fullPath}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    console.warn(`[startup] Could not scan "${dbDirectory}" for stale upload temp files: ${error instanceof Error ? error.message : String(error)}`);
  }
}

applyPendingUploadedDatabase(resolvedDbPath);
cleanupStaleSqliteArtifacts(resolvedDbPath);


const db = new Database(resolvedDbPath);
db.pragma('foreign_keys = OFF');
db.exec(`
  CREATE TABLE IF NOT EXISTS APP_THEME (
    CODE VARCHAR(10) PRIMARY KEY NOT NULL,
    LABEL VARCHAR(30) NOT NULL,
    BACKGROUND_COLOR VARCHAR(7) NOT NULL,
    TEXT_COLOR VARCHAR(7) NOT NULL,
    UPDATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (CODE IN ('HOME', 'AWAY', 'THIRD'))
  );
  INSERT OR IGNORE INTO APP_THEME (CODE, LABEL, BACKGROUND_COLOR, TEXT_COLOR) VALUES
    ('HOME', 'Home', '#FFFFFF', '#244A73'),
    ('AWAY', 'Away', '#EEF2F6', '#244A73'),
    ('THIRD', 'Third', '#E8EAF6', '#244A73');
`);

/** Crée un snapshot cohérent (WAL inclus) via l'Online Backup API de SQLite. */
export function backupDatabaseTo(destPath: string): Promise<void> {
  return db.backup(destPath).then(() => undefined);
}

export interface DbRunResult {
  changes: number;
  lastInsertRowid?: number | string;
}

/** Exécute un SELECT et retourne toutes les lignes. */
export async function dbAll<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const stmt = db.prepare(sql);
  const rows = stmt.all(...(params as Array<string | number | null | Uint8Array | boolean>));
  return rows as unknown as T[];
}

/** Exécute un SELECT et retourne la première ligne. */
export async function dbGet<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, params);
  return rows[0];
}

/** Exécute un INSERT / UPDATE / DELETE. */
export async function dbRun(
  sql: string,
  params: unknown[] = [],
): Promise<DbRunResult> {
  const stmt = db.prepare(sql);
  const result = stmt.run(...(params as Array<string | number | null | Uint8Array | boolean>));
  return {
    changes: Number(result.changes ?? 0),
    lastInsertRowid:
      result.lastInsertRowid === null || result.lastInsertRowid === undefined
        ? undefined
        : typeof result.lastInsertRowid === 'bigint'
          ? Number(result.lastInsertRowid)
          : result.lastInsertRowid,
  };
}

export default db;
