import { dbAll, dbGet, dbRun } from '../config/database';
import { QueryParams, PaginatedResult } from '../types';
import { sanitizeSort } from '../lib/queryBuilder';

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function rowMatchesSearch(row: Record<string, unknown>, searchCols: readonly string[], search: string): boolean {
  if (!search) {
    return true;
  }

  return searchCols.some((col) => {
    const value = row[col];
    return normalizeSearchText(String(value ?? '')).includes(search);
  });
}

const TABLE = 'TERRAIN';
const PK = 'TECLEUNIK';
const ALLOWED_SORT_COLS = ['TECLEUNIK', 'STADE', 'IDVILLE'];
const SEARCH_COLS = ['TECLEUNIK', 'STADE'];

export default {
  async getAll(params: QueryParams): Promise<PaginatedResult> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 200));
    const offset = (page - 1) * limit;
    const sort = sanitizeSort(params.sort, ALLOWED_SORT_COLS, PK);
    const order = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const searchValue = typeof params.search === 'string' ? normalizeSearchText(params.search) : '';

    // Fetch all rows with LEFT JOIN for VILLE_NOM
    const allRows = await dbAll<Record<string, unknown>>(
      `SELECT t."${PK}", t."STADE", t."IDVILLE", v."NOM" as VILLE_NOM
       FROM "${TABLE}" t
       LEFT JOIN "VILLE" v ON t."IDVILLE" = v."VICLEUNIK"
       ORDER BY t."${sort}" ${order}`,
    );

    // Apply search filter in memory
    const filteredRows = searchValue
      ? allRows.filter((row) => rowMatchesSearch(row, SEARCH_COLS, searchValue))
      : allRows;

    const total = filteredRows.length;
    const data = filteredRows.slice(offset, offset + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string | number): Promise<Record<string, unknown> | undefined> {
    return dbGet<Record<string, unknown>>(
      `SELECT t."${PK}", t."STADE", t."IDVILLE", v."NOM" as VILLE_NOM
       FROM "${TABLE}" t
       LEFT JOIN "VILLE" v ON t."IDVILLE" = v."VICLEUNIK"
       WHERE t."${PK}" = ?`,
      [id],
    );
  },

  async create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const keys = Object.keys(body);
    if (!keys.length) throw new Error('No fields provided');
    const cols = keys.map((c) => `"${c}"`).join(', ');
    const marks = keys.map(() => '?').join(', ');
    const result = await dbRun(
      `INSERT INTO "${TABLE}" (${cols}) VALUES (${marks})`,
      Object.values(body),
    );

    const explicitPkValue = body[PK];
    if (typeof explicitPkValue === 'string' || typeof explicitPkValue === 'number') {
      return this.getById(explicitPkValue);
    }
    if (typeof result.lastInsertRowid === 'string' || typeof result.lastInsertRowid === 'number') {
      return this.getById(result.lastInsertRowid);
    }
    return undefined;
  },

  async update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const keys = Object.keys(body);
    if (!keys.length) throw new Error('No fields provided');
    const sets = keys.map((c) => `"${c}" = ?`).join(', ');
    await dbRun(`UPDATE "${TABLE}" SET ${sets} WHERE "${PK}" = ?`, [...Object.values(body), id]);
    return this.getById(id);
  },

  async remove(id: string | number): Promise<boolean> {
    return (await dbRun(`DELETE FROM "${TABLE}" WHERE "${PK}" = ?`, [id])).changes > 0;
  },

  async bulkUpdate(ids: (string | number)[], body: Record<string, unknown>): Promise<number> {
    if (!ids.length) return 0;
    const keys = Object.keys(body);
    if (!keys.length) throw new Error('No fields provided');
    const sets = keys.map((c) => `"${c}" = ?`).join(', ');
    const marks = ids.map(() => '?').join(', ');
    const result = await dbRun(
      `UPDATE "${TABLE}" SET ${sets} WHERE "${PK}" IN (${marks})`,
      [...Object.values(body), ...ids],
    );
    return result.changes;
  },

  async bulkDelete(ids: (string | number)[]): Promise<number> {
    if (!ids.length) return 0;
    const marks = ids.map(() => '?').join(', ');
    return (await dbRun(`DELETE FROM "${TABLE}" WHERE "${PK}" IN (${marks})`, ids)).changes;
  },
};
