import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

const configuredDbPath = (process.env.SQLITE_DB_PATH ?? '/data/supporter.sqlite').trim();
const resolvedDbPath = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.resolve(process.cwd(), configuredDbPath);

if (!resolvedDbPath) {
  throw new Error('Missing SQLITE_DB_PATH environment variable');
}

const db = new Database(resolvedDbPath);
db.pragma('foreign_keys = OFF');

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
