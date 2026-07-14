import { dbAll, dbGet, dbRun } from '../config/database';
import { QueryParams, PaginatedResult } from '../types';
import { sanitizeSort, buildWhere } from './queryBuilder';

export interface EntityConfig {
  /** Nom exact de la table SQLite */
  table: string;
  /** Nom exact de la clé primaire */
  pk: string;
  /** Colonnes autorisées pour le tri (whitelist anti-injection) */
  allowedSortCols: readonly string[];
  /** Colonnes incluses dans la recherche LIKE */
  searchCols: readonly string[];
  /** Colonnes acceptées comme filtre exact (param URL = nom en minuscules) */
  filterCols?: readonly string[];
}

export function createEntityService(config: EntityConfig) {
  const { table, pk, allowedSortCols, searchCols, filterCols = [] } = config;

  async function getAll(params: QueryParams): Promise<PaginatedResult> {
    const page   = Math.max(1, Number(params.page)  || 1);
    const limit  = Math.min(200, Math.max(1, Number(params.limit) || 20));
    const offset = (page - 1) * limit;
    const sort   = sanitizeSort(params.sort, allowedSortCols, pk);
    const order  = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const { where, bindings } = buildWhere(params, searchCols, filterCols);

    const row   = await dbGet<{ total: number }>(`SELECT COUNT(*) AS total FROM "${table}" ${where}`, bindings);
    const total = row?.total ?? 0;
    const data  = await dbAll(`SELECT * FROM "${table}" ${where} ORDER BY "${sort}" ${order} LIMIT ? OFFSET ?`, [...bindings, limit, offset]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async function getById(id: string | number): Promise<Record<string, unknown> | undefined> {
    return dbGet(`SELECT * FROM "${table}" WHERE "${pk}" = ?`, [id]);
  }

  async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const keys = Object.keys(body);
    if (!keys.length) throw new Error('No fields provided');
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

  async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const keys = Object.keys(body);
    if (!keys.length) throw new Error('No fields provided');
    const sets = keys.map((c) => `"${c}" = ?`).join(', ');
    await dbRun(`UPDATE "${table}" SET ${sets} WHERE "${pk}" = ?`, [...Object.values(body), id]);
    return getById(id);
  }

  async function bulkUpdate(ids: (string | number)[], body: Record<string, unknown>): Promise<number> {
    if (!ids.length) return 0;
    const keys = Object.keys(body);
    if (!keys.length) throw new Error('No fields provided');
    const sets   = keys.map((c) => `"${c}" = ?`).join(', ');
    const marks  = ids.map(() => '?').join(', ');
    const result = await dbRun(
      `UPDATE "${table}" SET ${sets} WHERE "${pk}" IN (${marks})`,
      [...Object.values(body), ...ids],
    );
    return result.changes;
  }

  async function remove(id: string | number): Promise<boolean> {
    return (await dbRun(`DELETE FROM "${table}" WHERE "${pk}" = ?`, [id])).changes > 0;
  }

  async function bulkDelete(ids: (string | number)[]): Promise<number> {
    if (!ids.length) return 0;
    const marks = ids.map(() => '?').join(', ');
    return (await dbRun(`DELETE FROM "${table}" WHERE "${pk}" IN (${marks})`, ids)).changes;
  }

  return { getAll, getById, create, update, bulkUpdate, remove, bulkDelete };
}

export type EntityService = ReturnType<typeof createEntityService>;
