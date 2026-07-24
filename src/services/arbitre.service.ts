import { createEntityService } from '../lib/baseService';
import { dbGet, dbAll, dbRun } from '../config/database';
import { buildWhere, sanitizeSort } from '../lib/queryBuilder';
import { levenshteinDistance, normalizeSearchText } from '../lib/searchUtils';
import { AppError, type PaginatedResult, type QueryParams } from '../types';

const baseService = createEntityService({
  table: 'ARBITRE',
  pk: 'IDARBITRE',
  selectCols: ['IDARBITRE', 'NOM', 'PRENOM', 'IDNATIO'],
  allowedSortCols: ['IDARBITRE', 'NOM', 'PRENOM', 'IDNATIO'],
  searchCols: ['IDARBITRE', 'NOM', 'PRENOM'],
  filterCols: ['IDNATIO'],
  searchStrategy: 'backend-memory',
});

const ARBITRE_TABLE = 'ARBITRE';
const ARBITRE_PK = 'IDARBITRE';
const ARBITRE_ALLOWED_SORT_COLS = ['IDARBITRE', 'NOM', 'PRENOM', 'IDNATIO'] as const;
const ARBITRE_SEARCH_COLS = ['IDARBITRE', 'NOM', 'PRENOM'] as const;
const ARBITRE_FILTER_COLS = ['IDNATIO'] as const;
// Deliberately excludes ARB_PHOTO BLOB from payloads; image bytes are served via /api/images.
const ARBITRE_SELECT_COLS = ['IDARBITRE', 'NOM', 'PRENOM', 'IDNATIO'] as const;
const ARBITRE_SELECT_SQL = ARBITRE_SELECT_COLS.map((col) => `"${col}"`).join(', ');
const ARBITRE_SELECT_WITH_PHOTO_PLACEHOLDER_SQL = `${ARBITRE_SELECT_SQL}, NULL AS "ARB_PHOTO"`;

export interface ArbitreSuggestionRow {
  IDARBITRE: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string;
  SCORE: number;
}

export interface ArbitreSuggestionsResponse {
  data: ArbitreSuggestionRow[];
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

async function getArbitreAll(params: QueryParams): Promise<PaginatedResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;
  const sort = sanitizeSort(params.sort, ARBITRE_ALLOWED_SORT_COLS, ARBITRE_PK);
  const order = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const searchValue = typeof params.search === 'string' ? normalizeSearchText(params.search) : '';

  const { where, bindings } = buildWhere({ ...params, search: undefined }, ARBITRE_SEARCH_COLS, ARBITRE_FILTER_COLS);
  const allRows = await dbAll<Record<string, unknown>>(
    `SELECT ${ARBITRE_SELECT_WITH_PHOTO_PLACEHOLDER_SQL}
     FROM "${ARBITRE_TABLE}" ${where}
     ORDER BY "${sort}" ${order}`,
    bindings,
  );

  const filteredRows = searchValue
    ? allRows.filter((row) => rowMatchesSearch(row, ARBITRE_SEARCH_COLS, searchValue))
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
}

async function getArbitreById(id: string | number): Promise<Record<string, unknown> | undefined> {
  return dbGet<Record<string, unknown>>(
    `SELECT ${ARBITRE_SELECT_WITH_PHOTO_PLACEHOLDER_SQL}
     FROM "${ARBITRE_TABLE}"
     WHERE "${ARBITRE_PK}" = ?`,
    [id],
  );
}

async function createArbitreRecord(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const keys = Object.keys(body);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const cols = keys.map((key) => `"${key}"`).join(', ');
  const marks = keys.map(() => '?').join(', ');
  const result = await dbRun(
    `INSERT INTO "${ARBITRE_TABLE}" (${cols}) VALUES (${marks})`,
    Object.values(body),
  );

  const explicitPkValue = body[ARBITRE_PK];
  if (typeof explicitPkValue === 'string' || typeof explicitPkValue === 'number') {
    return getArbitreById(explicitPkValue);
  }
  if (typeof result.lastInsertRowid === 'string' || typeof result.lastInsertRowid === 'number') {
    return getArbitreById(result.lastInsertRowid);
  }

  return undefined;
}

async function updateArbitreRecord(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const keys = Object.keys(body);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const sets = keys.map((key) => `"${key}" = ?`).join(', ');
  await dbRun(
    `UPDATE "${ARBITRE_TABLE}" SET ${sets} WHERE "${ARBITRE_PK}" = ?`,
    [...Object.values(body), id],
  );

  return getArbitreById(id);
}

function computeApproxScore(query: string, nom: string, prenom: string): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const n = normalizeSearchText(nom);
  const p = normalizeSearchText(prenom);
  const full = `${n}${p}`;

  let score = 0;
  if (n === q) score += 260;
  if (p === q) score += 120;
  if (full === q) score += 300;
  if (n.startsWith(q)) score += 150;
  if (p.startsWith(q)) score += 90;
  if (full.startsWith(q)) score += 180;
  if (n.includes(q)) score += 100;
  if (p.includes(q)) score += 60;
  if (full.includes(q)) score += 120;

  const distN = n ? levenshteinDistance(q, n.slice(0, Math.max(q.length + 6, 10))) : 99;
  const distP = p ? levenshteinDistance(q, p.slice(0, Math.max(q.length + 6, 10))) : 99;
  const best = Math.min(distN, distP);
  if (best <= 1) score += 130;
  else if (best === 2) score += 80;
  else if (best === 3) score += 30;

  return score;
}

export async function getArbitreSuggestions(search: string, limit = 12): Promise<ArbitreSuggestionsResponse> {
  const query = String(search ?? '').trim();
  if (!query) return { data: [] };

  const rows = await dbAll<{ IDARBITRE: string; NOM: string; PRENOM: string; IDNATIO: string }>(
    `SELECT IDARBITRE, NOM, PRENOM, IDNATIO
     FROM ARBITRE
     ORDER BY NOM ASC, PRENOM ASC, IDARBITRE ASC`,
  );

  const data = rows
    .map((row) => ({ ...row, SCORE: computeApproxScore(query, String(row.NOM ?? ''), String(row.PRENOM ?? '')) }))
    .filter((row) => row.SCORE >= 20)
    .sort((a, b) => b.SCORE - a.SCORE || String(a.NOM).localeCompare(String(b.NOM)) || String(a.PRENOM).localeCompare(String(b.PRENOM)))
    .slice(0, Math.max(1, Math.min(limit, 30)));

  return { data };
}

export async function createArbitreWithWizard(payload: { nom: string; prenom?: string; natioId: string }): Promise<Record<string, unknown> | undefined> {
  const nom = String(payload.nom ?? '').trim().toUpperCase();
  const prenom = String(payload.prenom ?? '').trim();
  const natioId = String(payload.natioId ?? '').trim().toUpperCase();

  if (!nom) throw new AppError(400, 'Nom requis.');
  if (!natioId) throw new AppError(400, 'Nationalite requise.');

  return create({
    NOM: nom,
    PRENOM: prenom,
    IDNATIO: natioId,
  });
}

// Override create pour générer IDARBITRE automatiquement
async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const idarbitreValue = body.IDARBITRE;

  // Si IDARBITRE est vide, null, ou une string vide, générer automatiquement
  if (!idarbitreValue || (typeof idarbitreValue === 'string' && idarbitreValue.trim() === '')) {
    // Trouver le prochain ID disponible (MAX + 1, formaté en 4 chiffres)
    const result = await dbGet<{ maxId: number | null }>(
      'SELECT COALESCE(MAX(CAST(IDARBITRE AS INTEGER)), 0) as maxId FROM ARBITRE',
    );
    const nextId = Math.max(0, Number(result?.maxId ?? 0)) + 1;
    body.IDARBITRE = String(nextId).padStart(4, '0');
  }

  // Valider que les champs requis sont présents
  if (!body.NOM || (typeof body.NOM === 'string' && !body.NOM.trim())) {
    throw new AppError(400, 'NOM est requis');
  }
  if (!body.IDNATIO || (typeof body.IDNATIO === 'string' && !body.IDNATIO.trim())) {
    throw new AppError(400, 'IDNATIO (Nationalité) est requis');
  }

  return createArbitreRecord(body);
}

export default {
  ...baseService,
  getAll: getArbitreAll,
  getById: getArbitreById,
  create: create,
  update: updateArbitreRecord,
  getArbitreSuggestions,
  createArbitreWithWizard,
};
