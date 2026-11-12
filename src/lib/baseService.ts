import db, { dbAll, dbGet, dbRun } from '../config/database';
import { AppError, QueryParams, PaginatedResult } from '../types';
import { sanitizeSort, buildWhere } from './queryBuilder';
import { normalizeDayDateFields } from './dates';
import { sanitizeImageFields } from './imageUpload';
import { normalizeSearchText, rowMatchesSearch } from './searchUtils';

export interface EntityConfig {
  /** Nom exact de la table en base de données (Turso/libSQL) */
  table: string;
  /** Nom exact de la clé primaire */
  pk: string;
  /** Colonnes explicitement autorisées dans les réponses de lecture */
  selectCols: readonly string[];
  /** Colonnes autorisées pour le tri (whitelist anti-injection) */
  allowedSortCols: readonly string[];
  /** Colonnes incluses dans la recherche LIKE */
  searchCols: readonly string[];
  /** Colonnes acceptées comme filtre exact (param URL = nom en minuscules) */
  filterCols?: readonly string[];
  /** Strategie de recherche: SQL classique ou filtrage en memoire dans le backend */
  searchStrategy?: 'sql' | 'backend-memory';
  /** Alias de la table principale, requis si joinClause/extraSelectCols est utilisé (ex: 't') */
  tableAlias?: string;
  /** Clause JOIN brute ajoutée après la table principale (ex: `LEFT JOIN "VILLE" v ON t."IDVILLE" = v."VICLEUNIK"`) */
  joinClause?: string;
  /** Expressions SELECT brutes supplémentaires (colonnes calculées/jointes), en lecture seule */
  extraSelectCols?: readonly string[];
  /**
   * Colonnes de selectCols exposées sous un autre nom (ex: { COCOMMENT: 'CO_COMMENT' }).
   * En create/update, l'alias est accepté et reporté sur la colonne si celle-ci n'est pas fournie.
   */
  selectAliases?: Readonly<Record<string, string>>;
  /** Colonnes de selectCols renvoyées NULL à leur place (BLOB servis par /api/images, cf. ADR). */
  nullSelectCols?: readonly string[];
  /**
   * Normalisation / validation métier d'un body create/update, appliquée après la whitelist de colonnes
   * (pickWritableFields) et avant le contrôle "No fields provided". Peut lever une AppError 400.
   */
  prepareWrite?: (
    body: Record<string, unknown>,
    mode: 'create' | 'update',
    id?: string | number,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

export interface PickWritableOptions {
  /** When false, the primary key is removed (a PK is never modified through the API). */
  allowPk: boolean;
}

/** ASCII-only case folding, matching SQLite's case-insensitive identifier comparison. */
function foldIdentifier(name: string): string {
  return name.replace(/[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Reads the real columns of a table (folded name -> real name) through the
 * table-valued form of PRAGMA table_info, with the table name bound as a parameter.
 */
function readTableColumns(table: string): ReadonlyMap<string, string> {
  const rows = db.prepare('SELECT name FROM pragma_table_info(?)').all(table) as Array<{ name: string }>;
  if (!rows.length) {
    throw new Error(`Unknown table or no columns: ${table}`);
  }
  return new Map(rows.map((row) => [foldIdentifier(row.name), row.name]));
}

/**
 * Builds a whitelist filter for write payloads, based on the real columns of `table`.
 * - Unknown keys are silently dropped; matching is case-insensitive and the real column name is kept.
 * - The primary key is kept only when `allowPk` is true.
 * The column list is read lazily on first use, then cached for the lifetime of the picker.
 */
function createWritableFieldPicker(table: string, pk: string) {
  let columns: ReadonlyMap<string, string> | null = null;
  const foldedPk = foldIdentifier(pk);

  return function pickWritableFields(body: unknown, options: PickWritableOptions): Record<string, unknown> {
    if (columns === null) {
      columns = readTableColumns(table);
    }
    const picked: Record<string, unknown> = {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return picked;
    }
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      const folded = foldIdentifier(key);
      const realName = columns.get(folded);
      if (realName === undefined) continue;
      if (!options.allowPk && folded === foldedPk) continue;
      picked[realName] = value;
    }
    // Image columns (IMAGE_CONFIGS) are validated, size-limited and SVG-sanitized before any write.
    return sanitizeImageFields(table, picked);
  };
}

export function createEntityService(config: EntityConfig) {
  const {
    table,
    pk,
    selectCols,
    allowedSortCols,
    searchCols,
    filterCols = [],
    searchStrategy = 'sql',
    tableAlias,
    joinClause,
    extraSelectCols = [],
    selectAliases = {},
    nullSelectCols = [],
    prepareWrite,
  } = config;
  // colPrefix/tableSql restent vides/identiques a l'ancien comportement quand aucun join n'est configure.
  const colPrefix = tableAlias ? `${tableAlias}.` : '';
  const selectExpression = (col: string): string => {
    if (nullSelectCols.includes(col)) return `NULL AS "${col}"`;
    const alias = selectAliases[col];
    return alias ? `${colPrefix}"${col}" AS "${alias}"` : `${colPrefix}"${col}"`;
  };
  const selectClause = [...selectCols.map(selectExpression), ...extraSelectCols].join(', ');
  const tableSql = `"${table}"${tableAlias ? ` ${tableAlias}` : ''}${joinClause ? ` ${joinClause}` : ''}`;
  const pkRef = `${colPrefix}"${pk}"`;
  const pickWritableFields = createWritableFieldPicker(table, pk);

  /** Copies each write alias onto its column when the column itself is absent; alias keys are dropped. */
  function applyWriteAliases(rawBody: Record<string, unknown>): Record<string, unknown> {
    const aliases = Object.entries(selectAliases);
    if (!aliases.length) return rawBody;
    const source = { ...rawBody };
    for (const [col, alias] of aliases) {
      if (source[alias] !== undefined && source[col] === undefined) source[col] = source[alias];
      delete source[alias];
    }
    return source;
  }

  /** Whitelist (aliases, real columns, PK only on create), business hook, day dates, then non-empty check. */
  async function prepareWriteBody(
    rawBody: Record<string, unknown>,
    mode: 'create' | 'update',
    id?: string | number,
  ): Promise<Record<string, unknown>> {
    const picked = pickWritableFields(applyWriteAliases(rawBody), { allowPk: mode === 'create' });
    const prepared = prepareWrite ? await prepareWrite(picked, mode, id) : picked;
    const body = normalizeDayDateFields(table, prepared);
    if (!Object.keys(body).length) throw new AppError(400, 'No fields provided');
    return body;
  }

  async function getAll(params: QueryParams): Promise<PaginatedResult> {
    const page   = Math.max(1, Number(params.page)  || 1);
    const limit  = Math.min(200, Math.max(1, Number(params.limit) || 20));
    const offset = (page - 1) * limit;
    const sort   = sanitizeSort(params.sort, allowedSortCols, pk);
    const order  = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const searchValue = typeof params.search === 'string' ? normalizeSearchText(params.search) : '';

    if (searchStrategy === 'backend-memory' && searchValue) {
      const { where, bindings } = buildWhere({ ...params, search: undefined }, searchCols, filterCols);
      const allRows = await dbAll<Record<string, unknown>>(
        `SELECT ${selectClause} FROM ${tableSql} ${where} ORDER BY ${colPrefix}"${sort}" ${order}`,
        bindings,
      );
      const filteredRows = allRows.filter((row) => rowMatchesSearch(row, searchCols, searchValue));
      const total = filteredRows.length;
      const data = filteredRows.slice(offset, offset + limit);

      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    const { where, bindings } = buildWhere(params, searchCols, filterCols);
    const row   = await dbGet<{ total: number }>(`SELECT COUNT(*) AS total FROM ${tableSql} ${where}`, bindings);
    const total = row?.total ?? 0;
    const data  = await dbAll(`SELECT ${selectClause} FROM ${tableSql} ${where} ORDER BY ${colPrefix}"${sort}" ${order} LIMIT ? OFFSET ?`, [...bindings, limit, offset]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async function getById(id: string | number): Promise<Record<string, unknown> | undefined> {
    return dbGet(`SELECT ${selectClause} FROM ${tableSql} WHERE ${pkRef} = ?`, [id]);
  }

  async function create(rawBody: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const body = await prepareWriteBody(rawBody, 'create');
    const keys = Object.keys(body);
    const cols   = keys.map((c) => `"${c}"`).join(', ');
    const marks  = keys.map(() => '?').join(', ');
    const result = await dbRun(`INSERT INTO "${table}" (${cols}) VALUES (${marks})`, Object.values(body));

    const explicitPkValue = body[pk];
    if (typeof explicitPkValue === 'string' || typeof explicitPkValue === 'number') {
      return getById(explicitPkValue);
    }
    if (typeof result.lastInsertRowid === 'string' || typeof result.lastInsertRowid === 'number') {
      return getById(result.lastInsertRowid);
    }
    return undefined;
  }

  async function update(id: string | number, rawBody: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const body = await prepareWriteBody(rawBody, 'update', id);
    const keys = Object.keys(body);
    const sets = keys.map((c) => `"${c}" = ?`).join(', ');
    await dbRun(`UPDATE "${table}" SET ${sets} WHERE "${pk}" = ?`, [...Object.values(body), id]);
    return getById(id);
  }

  async function remove(id: string | number): Promise<boolean> {
    return (await dbRun(`DELETE FROM "${table}" WHERE "${pk}" = ?`, [id])).changes > 0;
  }

  return { getAll, getById, create, update, remove, pickWritableFields };
}

export type EntityService = ReturnType<typeof createEntityService>;
