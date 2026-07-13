import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath =
  process.env.NODE_ENV === 'production'
    ? '/data/database.sqlite'
    : path.resolve(process.cwd(), 'database.sqlite');

const db = new BetterSqlite3(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/** Exécute un SELECT et retourne toutes les lignes. */
export function dbAll<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db.prepare(sql) as any).all(...params) as T[];
}

/** Exécute un SELECT et retourne la première ligne. */
export function dbGet<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db.prepare(sql) as any).get(...params) as T | undefined;
}

/** Exécute un INSERT / UPDATE / DELETE. */
export function dbRun(
  sql: string,
  params: unknown[] = [],
): BetterSqlite3.RunResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db.prepare(sql) as any).run(...params) as BetterSqlite3.RunResult;
}

export default db;
