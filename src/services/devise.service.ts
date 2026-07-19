import { createEntityService } from '../lib/baseService';

const WRITABLE_COLS = new Set(['DVCLEUNIK', 'NOM', 'SYMBOLE', 'CONVERSION', 'DVDEFAUT']);

const baseService = createEntityService({
  table: 'DEVISE',
  pk: 'DVCLEUNIK',
  allowedSortCols: ['DVCLEUNIK', 'NOM', 'SYMBOLE', 'CONVERSION', 'DVDEFAUT'],
  searchCols: ['NOM', 'SYMBOLE'],
  searchStrategy: 'backend-memory',
});

function sanitize(body: Record<string, unknown>, includePk: boolean): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => WRITABLE_COLS.has(k) && (includePk || k !== 'DVCLEUNIK')),
  );
}

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);

  if (!clean.NOM || (typeof clean.NOM === 'string' && !(clean.NOM as string).trim())) {
    throw new Error('NOM est requis');
  }
  if (!clean.SYMBOLE || (typeof clean.SYMBOLE === 'string' && !(clean.SYMBOLE as string).trim())) {
    throw new Error('SYMBOLE est requis');
  }
  return baseService.create(clean);
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);
  if (!Object.keys(clean).length) throw new Error('No fields provided');
  return baseService.update(id, clean);
}

export default {
  ...baseService,
  create,
  update,
};
