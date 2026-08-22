import { createEntityService, createFieldSanitizer } from '../lib/baseService';
import { AppError } from '../types';

const sanitize = createFieldSanitizer(['TECLEUNIK', 'STADE', 'IDVILLE'], 'TECLEUNIK');

const baseService = createEntityService({
  table: 'TERRAIN',
  pk: 'TECLEUNIK',
  tableAlias: 't',
  joinClause: 'LEFT JOIN "VILLE" v ON t."IDVILLE" = v."VICLEUNIK"',
  selectCols: ['TECLEUNIK', 'STADE', 'IDVILLE'],
  extraSelectCols: ['v."NOM" AS VILLE_NOM'],
  allowedSortCols: ['TECLEUNIK', 'STADE', 'IDVILLE'],
  searchCols: ['TECLEUNIK', 'STADE', 'VILLE_NOM'],
  searchStrategy: 'backend-memory',
});

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  return baseService.create(sanitize(body, true));
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);
  if (!Object.keys(clean).length) throw new AppError(400, 'No fields provided');
  return baseService.update(id, clean);
}

async function bulkUpdate(ids: (string | number)[], body: Record<string, unknown>): Promise<number> {
  return baseService.bulkUpdate(ids, sanitize(body, false));
}

export default {
  ...baseService,
  create,
  update,
  bulkUpdate,
};

