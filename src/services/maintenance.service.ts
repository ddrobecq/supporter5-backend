import db from '../config/database';
import { AppError } from '../types';

/** Nombre de lignes renvoyees par defaut pour un SELECT de maintenance. */
const DEFAULT_ROW_LIMIT = 500;
/** Plafond absolu : au dela, la reponse JSON devient trop lourde pour le navigateur. */
const MAX_ROW_LIMIT = 5000;
/** Longueur maximale d'une valeur texte renvoyee dans une cellule. */
const MAX_TEXT_CELL_LENGTH = 2000;
/** Longueur maximale du script SQL accepte. */
const MAX_SQL_LENGTH = 100_000;

export interface MaintenanceQueryInput {
  sql: string;
  confirmed: boolean;
  limit?: number;
}

export interface MaintenanceSelectResult {
  kind: 'select';
  /** Libelles des colonnes, dans l'ordre du SELECT. */
  columns: string[];
  /** Lignes sous forme de tableaux positionnels (evite les collisions de noms de colonnes). */
  rows: Array<Array<string | number | boolean | null>>;
  rowCount: number;
  /** Vrai si le resultat a ete tronque par la limite de lignes. */
  truncated: boolean;
  limit: number;
  /** Vrai pour un SELECT ... RETURNING qui a aussi modifie la base. */
  mutating: boolean;
  durationMs: number;
}

export interface MaintenanceMutationResult {
  kind: 'mutation' | 'script';
  changes: number | null;
  lastInsertRowid: number | string | null;
  durationMs: number;
}

export type MaintenanceQueryResult = MaintenanceSelectResult | MaintenanceMutationResult;

/** Erreur levee quand une requete modifiante est soumise sans confirmation explicite. */
export const CONFIRMATION_REQUIRED_STATUS = 428;

/**
 * `lastInsertRowid` reflete l'etat de la connexion et reste renseigne apres un
 * UPDATE ou un DDL : on ne le remonte que pour une insertion de premier niveau.
 */
function isInsertStatement(sql: string): boolean {
  const withoutLeadingComments = sql
    .replace(/^(\s|--[^\n]*|\/\*[\s\S]*?\*\/)+/, '')
    .trimStart();
  return /^(insert|replace)\b/i.test(withoutLeadingComments);
}

function isMultiStatementError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /more than one statement/i.test(message);
}

function toSqlError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : String(error);
  return new AppError(400, `SQL invalide : ${message}`);
}

function resolveRowLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit) || (limit as number) <= 0) {
    return DEFAULT_ROW_LIMIT;
  }
  return Math.min(Math.floor(limit as number), MAX_ROW_LIMIT);
}

/** Rend une valeur SQLite serialisable en JSON : les BLOB ne sont jamais transferes. */
function toJsonSafeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Buffer.isBuffer(value)) {
    return `[BLOB ${value.length} octets]`;
  }
  if (value instanceof Uint8Array) {
    return `[BLOB ${value.byteLength} octets]`;
  }
  if (typeof value === 'bigint') {
    return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > MAX_TEXT_CELL_LENGTH
      ? `${value.slice(0, MAX_TEXT_CELL_LENGTH)}...`
      : value;
  }
  return String(value);
}

/** Deduplique les libelles de colonnes pour que la grille puisse les afficher tous. */
function resolveColumnLabels(names: Array<string | null>): string[] {
  const occurrences = new Map<string, number>();
  return names.map((name, index) => {
    const base = String(name ?? '').trim() || `colonne_${index + 1}`;
    const seen = occurrences.get(base) ?? 0;
    occurrences.set(base, seen + 1);
    return seen === 0 ? base : `${base} (${seen + 1})`;
  });
}

/** Execute un script multi-instructions (uniquement apres confirmation explicite). */
function executeScript(sql: string): MaintenanceMutationResult {
  const startedAt = Date.now();
  try {
    db.exec(sql);
  } catch (error) {
    throw toSqlError(error);
  }
  return {
    kind: 'script',
    changes: null,
    lastInsertRowid: null,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Outils > Maintenance : execute une requete SQL libre sur la base.
 * Les requetes non « readonly » (INSERT / UPDATE / DELETE / DDL...) exigent `confirmed`.
 */
export async function executeMaintenanceQuery({
  sql,
  confirmed,
  limit,
}: MaintenanceQueryInput): Promise<MaintenanceQueryResult> {
  const normalizedSql = String(sql ?? '').trim();
  if (!normalizedSql) {
    throw new AppError(400, 'Requete SQL vide.');
  }
  if (normalizedSql.length > MAX_SQL_LENGTH) {
    throw new AppError(400, `Requete SQL trop longue (maximum ${MAX_SQL_LENGTH} caracteres).`);
  }

  let statement;
  try {
    statement = db.prepare(normalizedSql);
  } catch (error) {
    if (isMultiStatementError(error)) {
      // Un script multi-instructions est toujours considere comme modifiant.
      if (!confirmed) {
        throw new AppError(
          CONFIRMATION_REQUIRED_STATUS,
          'Ce script contient plusieurs instructions et peut modifier la base : confirmation requise.',
        );
      }
      return executeScript(normalizedSql);
    }
    throw toSqlError(error);
  }

  // `readonly` provient de SQLite lui-meme : il couvre aussi les cas
  // « INSERT ... RETURNING » ou « WITH ... DELETE » que l'analyse textuelle rate.
  const isReadOnly = statement.readonly;
  if (!isReadOnly && !confirmed) {
    throw new AppError(
      CONFIRMATION_REQUIRED_STATUS,
      'Cette requete modifie la base de donnees : confirmation requise.',
    );
  }

  const rowLimit = resolveRowLimit(limit);
  const startedAt = Date.now();

  try {
    if (!statement.reader) {
      const result = statement.run();
      const changes = Number(result.changes ?? 0);
      const reportRowid = changes > 0 && isInsertStatement(normalizedSql);
      return {
        kind: 'mutation',
        changes,
        lastInsertRowid: reportRowid
          ? (typeof result.lastInsertRowid === 'bigint'
            ? Number(result.lastInsertRowid)
            : (result.lastInsertRowid ?? null))
          : null,
        durationMs: Date.now() - startedAt,
      };
    }

    const columns = resolveColumnLabels(
      statement.columns().map((column) => column.name as string | null),
    );

    const rows: Array<Array<string | number | boolean | null>> = [];
    let truncated = false;
    for (const rawRow of statement.raw(true).iterate() as Iterable<unknown[]>) {
      if (rows.length >= rowLimit) {
        truncated = true;
        break;
      }
      rows.push(rawRow.map(toJsonSafeValue));
    }

    return {
      kind: 'select',
      columns,
      rows,
      rowCount: rows.length,
      truncated,
      limit: rowLimit,
      mutating: !isReadOnly,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    throw toSqlError(error);
  }
}
