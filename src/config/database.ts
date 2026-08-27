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
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to apply pending SQLite upload "${pendingPath}": ${details}`);
  }
}

applyPendingUploadedDatabase(resolvedDbPath);

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
