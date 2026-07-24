import { createEntityService } from '../lib/baseService';
import { dbAll, dbGet, dbRun } from '../config/database';
import { buildWhere, sanitizeSort } from '../lib/queryBuilder';
import { levenshteinDistance, normalizeSearchText } from '../lib/searchUtils';
import { AppError, type PaginatedResult, type QueryParams } from '../types';

const WRITABLE_COLS = new Set([
  'IDEPREUVE',
  'EPREUVE',
  'SCOPE',
  'OFFICIELLE',
  'EPR_VISUEL',
  'EPR_WEB',
  'EPR_PAYS',
]);

function sanitize(body: Record<string, unknown>, includePk: boolean): Record<string, unknown> {
  const clean = Object.fromEntries(
    Object.entries(body).filter(([key]) => WRITABLE_COLS.has(key) && (includePk || key !== 'IDEPREUVE')),
  );

  if (typeof clean.EPREUVE === 'string') {
    clean.EPREUVE = clean.EPREUVE.trim();
  }
  if (typeof clean.EPR_WEB === 'string') {
    clean.EPR_WEB = clean.EPR_WEB.trim();
  }

  return clean;
}

function normalizeFlag(value: unknown): number {
  return value ? 1 : 0;
}

function normalizeScope(value: unknown): number {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
}

const baseService = createEntityService({
  table: 'EPREUVE',
  pk: 'IDEPREUVE',
  selectCols: ['IDEPREUVE', 'EPREUVE', 'SCOPE', 'OFFICIELLE', 'EPR_WEB', 'EPR_PAYS'],
  allowedSortCols: ['IDEPREUVE', 'EPREUVE', 'SCOPE', 'OFFICIELLE', 'EPR_PAYS'],
  searchCols: ['EPREUVE'],
});

const EPREUVE_TABLE = 'EPREUVE';
const EPREUVE_PK = 'IDEPREUVE';
const EPREUVE_ALLOWED_SORT_COLS = ['IDEPREUVE', 'EPREUVE', 'SCOPE', 'OFFICIELLE', 'EPR_PAYS'] as const;
const EPREUVE_SEARCH_COLS = ['EPREUVE'] as const;
const EPREUVE_SELECT_COLS = ['IDEPREUVE', 'EPREUVE', 'SCOPE', 'OFFICIELLE', 'EPR_WEB', 'EPR_PAYS'] as const;
const EPREUVE_SELECT_SQL = EPREUVE_SELECT_COLS.map((col) => `"${col}"`).join(', ');
// Keep EPR_VISUEL key for form compatibility while keeping BLOB payload out of standard data endpoints.
const EPREUVE_SELECT_WITH_VISUAL_PLACEHOLDER_SQL = `${EPREUVE_SELECT_SQL}, NULL AS "EPR_VISUEL"`;

export interface EpreuveSuggestionRow {
  IDEPREUVE: number;
  EPREUVE: string;
  SCORE: number;
}

async function getEpreuveAll(params: QueryParams): Promise<PaginatedResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;
  const sort = sanitizeSort(params.sort, EPREUVE_ALLOWED_SORT_COLS, EPREUVE_PK);
  const order = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const { where, bindings } = buildWhere(params, EPREUVE_SEARCH_COLS, []);

  const row = await dbGet<{ total: number }>(
    `SELECT COUNT(*) AS total FROM "${EPREUVE_TABLE}" ${where}`,
    bindings,
  );
  const total = row?.total ?? 0;

  const data = await dbAll(
    `SELECT ${EPREUVE_SELECT_WITH_VISUAL_PLACEHOLDER_SQL}
     FROM "${EPREUVE_TABLE}" ${where}
     ORDER BY "${sort}" ${order}
     LIMIT ? OFFSET ?`,
    [...bindings, limit, offset],
  );

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getEpreuveById(id: string | number): Promise<Record<string, unknown> | undefined> {
  return dbGet<Record<string, unknown>>(
    `SELECT ${EPREUVE_SELECT_WITH_VISUAL_PLACEHOLDER_SQL}
     FROM "${EPREUVE_TABLE}"
     WHERE "${EPREUVE_PK}" = ?`,
    [id],
  );
}

function computeApproxScore(query: string, label: string): number {
  const q = normalizeSearchText(query);
  const n = normalizeSearchText(label);
  if (!q || !n) return 0;

  let score = 0;
  if (n === q) score += 300;
  if (n.startsWith(q)) score += 180;
  if (n.includes(q)) score += 120;

  const dist = levenshteinDistance(q, n.slice(0, Math.max(q.length + 6, 12)));
  if (dist <= 1) score += 130;
  else if (dist === 2) score += 80;
  else if (dist === 3) score += 30;

  return score;
}

export async function getEpreuveSuggestions(search: string, limit = 12): Promise<{ data: EpreuveSuggestionRow[] }> {
  const query = String(search ?? '').trim();
  if (!query) return { data: [] };

  const rows = await dbAll<{ IDEPREUVE: number; EPREUVE: string }>(
    'SELECT IDEPREUVE, EPREUVE FROM EPREUVE ORDER BY EPREUVE ASC, IDEPREUVE ASC',
  );

  const data = rows
    .map((row) => ({ ...row, SCORE: computeApproxScore(query, String(row.EPREUVE ?? '')) }))
    .filter((row) => row.SCORE >= 20)
    .sort((a, b) => b.SCORE - a.SCORE || String(a.EPREUVE).localeCompare(String(b.EPREUVE)))
    .slice(0, Math.max(1, Math.min(limit, 30)));

  return { data };
}

export async function createEpreuveWithWizard(payload: { name: string }): Promise<Record<string, unknown> | undefined> {
  const name = String(payload.name ?? '').trim();
  if (!name) {
    throw new AppError(400, 'Nom de l epreuve requis');
  }

  return create({ EPREUVE: name, SCOPE: 1, OFFICIELLE: 0, EPR_PAYS: 0, EPR_WEB: '' });
}

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);

  if (!clean.EPREUVE || (typeof clean.EPREUVE === 'string' && !clean.EPREUVE.trim())) {
    throw new AppError(400, 'ÉPREUVE est requis');
  }

  clean.SCOPE = normalizeScope(clean.SCOPE);
  clean.OFFICIELLE = normalizeFlag(clean.OFFICIELLE);
  clean.EPR_PAYS = normalizeFlag(clean.EPR_PAYS);
  if (!('EPR_WEB' in clean)) {
    clean.EPR_WEB = '';
  }

  const keys = Object.keys(clean);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const cols = keys.map((key) => `"${key}"`).join(', ');
  const marks = keys.map(() => '?').join(', ');
  const result = await dbRun(
    `INSERT INTO "${EPREUVE_TABLE}" (${cols}) VALUES (${marks})`,
    Object.values(clean),
  );

  const explicitPkValue = clean[EPREUVE_PK];
  if (typeof explicitPkValue === 'string' || typeof explicitPkValue === 'number') {
    return getEpreuveById(explicitPkValue);
  }
  if (typeof result.lastInsertRowid === 'string' || typeof result.lastInsertRowid === 'number') {
    return getEpreuveById(result.lastInsertRowid);
  }

  return undefined;
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);
  delete clean.IDEPREUVE;
  if ('SCOPE' in clean) clean.SCOPE = normalizeScope(clean.SCOPE);
  if ('OFFICIELLE' in clean) clean.OFFICIELLE = normalizeFlag(clean.OFFICIELLE);
  if ('EPR_PAYS' in clean) clean.EPR_PAYS = normalizeFlag(clean.EPR_PAYS);
  if (!Object.keys(clean).length) throw new AppError(400, 'No fields provided');

  const sets = Object.keys(clean).map((key) => `"${key}" = ?`).join(', ');
  await dbRun(
    `UPDATE "${EPREUVE_TABLE}" SET ${sets} WHERE "${EPREUVE_PK}" = ?`,
    [...Object.values(clean), id],
  );

  return getEpreuveById(id);
}

export default {
  ...baseService,
  getAll: getEpreuveAll,
  getById: getEpreuveById,
  create,
  update,
  getEpreuveSuggestions,
  createEpreuveWithWizard,
};