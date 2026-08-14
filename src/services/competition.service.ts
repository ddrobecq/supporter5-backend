import { dbAll, dbGet, dbRun } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { buildWhere, sanitizeSort } from '../lib/queryBuilder';
import { AppError, type PaginatedResult, type QueryParams } from '../types';

const WRITABLE_COLS = new Set([
  'COCLEUNIK',
  'SAISON',
  'IDEPREUVE',
  'LOGO',
  'NOM',
  'COCOMMENT',
  'CO_WEB',
  'CO_ANNEE',
]);

function sanitize(body: Record<string, unknown>, includePk: boolean): Record<string, unknown> {
  const source = { ...body };

  if (source.CO_COMMENT !== undefined && source.COCOMMENT === undefined) {
    source.COCOMMENT = source.CO_COMMENT;
  }
  delete source.CO_COMMENT;

  const clean = Object.fromEntries(
    Object.entries(source).filter(([key]) => WRITABLE_COLS.has(key) && (includePk || key !== 'COCLEUNIK')),
  );

  if (typeof clean.NOM === 'string') {
    clean.NOM = clean.NOM.trim();
  }
  if (typeof clean.SAISON === 'string') {
    clean.SAISON = clean.SAISON.trim();
  }
  if (typeof clean.CO_WEB === 'string') {
    clean.CO_WEB = clean.CO_WEB.trim();
  }

  return clean;
}

function normalizeFlag(value: unknown): number {
  return value ? 1 : 0;
}

function normalizeSaison(value: unknown): string {
  const saison = String(value ?? '').trim();
  if (!/^\d{4}-\d{4}$/.test(saison)) {
    throw new AppError(400, 'Saison invalide (format xxxx-yyyy).');
  }
  return saison;
}

function normalizeHttpUrl(value: unknown): string {
  const url = String(value ?? '').trim();
  if (!url) return '';

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError(400, 'Site officiel invalide.');
  }

  if (parsed.protocol !== 'https:') {
    throw new AppError(400, 'Le site officiel doit commencer par https://');
  }

  return parsed.toString();
}

async function assertEpreuveExists(epreuveId: number): Promise<void> {
  const row = await dbGet<{ IDEPREUVE: number }>('SELECT IDEPREUVE FROM EPREUVE WHERE IDEPREUVE = ?', [epreuveId]);
  if (!row) {
    throw new AppError(400, 'Épreuve introuvable.');
  }
}

const baseService = createEntityService({
  table: 'COMPET',
  pk: 'COCLEUNIK',
  selectCols: ['COCLEUNIK', 'SAISON', 'IDEPREUVE', 'NOM', 'COCOMMENT', 'CO_WEB', 'CO_ANNEE'],
  allowedSortCols: ['COCLEUNIK', 'SAISON', 'IDEPREUVE', 'NOM', 'CO_ANNEE'],
  searchCols: ['NOM', 'COCOMMENT'],
  filterCols: ['SAISON', 'IDEPREUVE', 'CO_ANNEE'],
});

const COMPET_TABLE = 'COMPET';
const COMPET_PK = 'COCLEUNIK';
const COMPET_ALLOWED_SORT_COLS = ['COCLEUNIK', 'SAISON', 'IDEPREUVE', 'NOM', 'CO_ANNEE'] as const;
const COMPET_SEARCH_COLS = ['NOM', 'COCOMMENT'] as const;
const COMPET_FILTER_COLS = ['SAISON', 'IDEPREUVE', 'CO_ANNEE'] as const;
const COMPET_FINISHED_SQL = [
  'CASE',
  '  WHEN EXISTS (',
  '    SELECT 1',
  '    FROM TOUR t_final',
  '    WHERE t_final.COCLEUNIK = c.COCLEUNIK',
  '      AND COALESCE(t_final.TU_FINAL, 0) = 1',
  '  )',
  '  AND EXISTS (',
  '    SELECT 1',
  '    FROM RENCO r_final',
  '    INNER JOIN TOUR t_final2 ON t_final2.TUCLEUNIK = r_final.TUCLEUNIK',
  '    WHERE t_final2.COCLEUNIK = c.COCLEUNIK',
  '      AND COALESCE(t_final2.TU_FINAL, 0) = 1',
  '  )',
  '  AND NOT EXISTS (',
  '    SELECT 1',
  '    FROM RENCO r_open',
  '    INNER JOIN TOUR t_final3 ON t_final3.TUCLEUNIK = r_open.TUCLEUNIK',
  '    WHERE t_final3.COCLEUNIK = c.COCLEUNIK',
  '      AND COALESCE(t_final3.TU_FINAL, 0) = 1',
  '      AND COALESCE(r_open.ETAT, 0) <> 3',
  '  )',
  '  THEN 1 ELSE 0',
  'END',
].join(' ');
const COMPET_SELECT_SQL = [
  'c."COCLEUNIK"',
  'c."SAISON"',
  'c."IDEPREUVE"',
  'NULL AS "LOGO"',
  'c."NOM"',
  'c."COCOMMENT" AS "CO_COMMENT"',
  'c."CO_WEB"',
  'c."CO_ANNEE"',
  `${COMPET_FINISHED_SQL} AS "CO_TERMINEE"`,
].join(', ');

export interface CompetitionRow {
  COCLEUNIK: number;
  SAISON: string;
  IDEPREUVE: number;
  LOGO: null;
  NOM: string;
  CO_COMMENT: string | null;
  CO_WEB: string | null;
  CO_ANNEE: number;
  CO_TERMINEE: number;
}

async function getCompetitionAll(params: QueryParams): Promise<PaginatedResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;
  const sort = sanitizeSort(params.sort, COMPET_ALLOWED_SORT_COLS, COMPET_PK);
  const order = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const { where, bindings } = buildWhere(params, COMPET_SEARCH_COLS, COMPET_FILTER_COLS);

  const row = await dbGet<{ total: number }>(
    `SELECT COUNT(*) AS total FROM "${COMPET_TABLE}" ${where}`,
    bindings,
  );
  const total = row?.total ?? 0;

  const data = await dbAll(
    `SELECT ${COMPET_SELECT_SQL}
     FROM "${COMPET_TABLE}" c ${where}
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

async function getCompetitionById(id: string | number): Promise<Record<string, unknown> | undefined> {
  return dbGet<Record<string, unknown>>(
    `SELECT ${COMPET_SELECT_SQL}
     FROM "${COMPET_TABLE}" c
     WHERE c."${COMPET_PK}" = ?`,
    [id],
  );
}

async function createCompetitionRecord(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const keys = Object.keys(body);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const cols = keys.map((key) => `"${key}"`).join(', ');
  const marks = keys.map(() => '?').join(', ');
  const result = await dbRun(
    `INSERT INTO "${COMPET_TABLE}" (${cols}) VALUES (${marks})`,
    Object.values(body),
  );

  const explicitPkValue = body[COMPET_PK];
  if (typeof explicitPkValue === 'string' || typeof explicitPkValue === 'number') {
    return getCompetitionById(explicitPkValue);
  }
  if (typeof result.lastInsertRowid === 'string' || typeof result.lastInsertRowid === 'number') {
    return getCompetitionById(result.lastInsertRowid);
  }

  return undefined;
}

async function updateCompetitionRecord(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const keys = Object.keys(body);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const sets = keys.map((key) => `"${key}" = ?`).join(', ');
  await dbRun(
    `UPDATE "${COMPET_TABLE}" SET ${sets} WHERE "${COMPET_PK}" = ?`,
    [...Object.values(body), id],
  );

  return getCompetitionById(id);
}

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);

  if (!clean.NOM || (typeof clean.NOM === 'string' && !clean.NOM.trim())) {
    throw new AppError(400, 'NOM est requis');
  }

  clean.SAISON = normalizeSaison(clean.SAISON);

  const epreuveId = Number(clean.IDEPREUVE);
  if (!Number.isInteger(epreuveId) || epreuveId <= 0) {
    throw new AppError(400, 'IDEPREUVE est requis');
  }
  await assertEpreuveExists(epreuveId);
  clean.IDEPREUVE = epreuveId;

  clean.CO_ANNEE = normalizeFlag(clean.CO_ANNEE);
  clean.CO_WEB = normalizeHttpUrl(clean.CO_WEB);

  if (!('COCOMMENT' in clean)) {
    clean.COCOMMENT = '';
  }

  return createCompetitionRecord(clean);
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);

  delete clean.COCLEUNIK;

  if ('SAISON' in clean) {
    clean.SAISON = normalizeSaison(clean.SAISON);
  }

  if ('IDEPREUVE' in clean) {
    const epreuveId = Number(clean.IDEPREUVE);
    if (!Number.isInteger(epreuveId) || epreuveId <= 0) {
      throw new AppError(400, 'IDEPREUVE invalide');
    }
    await assertEpreuveExists(epreuveId);
    clean.IDEPREUVE = epreuveId;
  }

  if ('CO_ANNEE' in clean) {
    clean.CO_ANNEE = normalizeFlag(clean.CO_ANNEE);
  }

  if ('CO_WEB' in clean) {
    clean.CO_WEB = normalizeHttpUrl(clean.CO_WEB);
  }

  if ('NOM' in clean && (typeof clean.NOM !== 'string' || !clean.NOM.trim())) {
    throw new AppError(400, 'NOM est requis');
  }

  if (!Object.keys(clean).length) {
    throw new AppError(400, 'No fields provided');
  }

  return updateCompetitionRecord(id, clean);
}

export async function createCompetitionWithWizard(payload: {
  epreuveId: string | number;
  saison: string;
  name?: string;
  sameAsLastEdition?: boolean;
}): Promise<Record<string, unknown> | undefined> {
  const epreuveId = Number(payload.epreuveId);
  if (!Number.isInteger(epreuveId) || epreuveId <= 0) {
    throw new AppError(400, 'Épreuve requise.');
  }

  const saison = normalizeSaison(payload.saison);
  await assertEpreuveExists(epreuveId);

  const epreuve = await dbGet<{ EPREUVE: string }>('SELECT EPREUVE FROM EPREUVE WHERE IDEPREUVE = ?', [epreuveId]);
  const name = String(payload.name ?? '').trim() || String(epreuve?.EPREUVE ?? '').trim();
  if (!name) {
    throw new AppError(400, 'Nom de la competition requis.');
  }

  let coAnnee = 0;
  if (payload.sameAsLastEdition) {
    const previous = await dbGet<{ CO_ANNEE: number }>(
      'SELECT CO_ANNEE FROM COMPET WHERE IDEPREUVE = ? ORDER BY SAISON DESC, COCLEUNIK DESC LIMIT 1',
      [epreuveId],
    );
    coAnnee = previous?.CO_ANNEE ? 1 : 0;
  }

  return createCompetitionRecord({
    SAISON: saison,
    IDEPREUVE: epreuveId,
    NOM: name,
    COCOMMENT: '',
    CO_WEB: '',
    CO_ANNEE: coAnnee,
  });
}

export default {
  ...baseService,
  getAll: getCompetitionAll,
  getById: getCompetitionById,
  create,
  update,
  createCompetitionWithWizard,
};
