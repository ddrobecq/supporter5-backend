import { createClient, InValue } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  throw new Error('Missing TURSO_DATABASE_URL environment variable');
}

const db = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

export interface DbRunResult {
  changes: number;
  lastInsertRowid?: number | string;
}

/** Exécute un SELECT et retourne toutes les lignes. */
export async function dbAll<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await db.execute({ sql, args: params as InValue[] });
  return result.rows as unknown as T[];
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
  const result = await db.execute({ sql, args: params as InValue[] });
  return {
    changes: Number(result.rowsAffected ?? 0),
    lastInsertRowid:
      result.lastInsertRowid === null || result.lastInsertRowid === undefined
        ? undefined
        : typeof result.lastInsertRowid === 'bigint'
          ? Number(result.lastInsertRowid)
          : result.lastInsertRowid,
  };
}

export default db;
