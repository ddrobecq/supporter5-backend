import { createEntityService, createFieldSanitizer } from '../lib/baseService';
import { AppError } from '../types';

const baseService = createEntityService({
  table: 'DEVISE',
  pk: 'DVCLEUNIK',
  selectCols: ['DVCLEUNIK', 'NOM', 'SYMBOLE', 'CONVERSION', 'DVDEFAUT'],
  allowedSortCols: ['DVCLEUNIK', 'NOM', 'SYMBOLE', 'CONVERSION', 'DVDEFAUT'],
  searchCols: ['NOM', 'SYMBOLE'],
  searchStrategy: 'backend-memory',
});

const sanitize = createFieldSanitizer(['DVCLEUNIK', 'NOM', 'SYMBOLE', 'CONVERSION', 'DVDEFAUT'], 'DVCLEUNIK');

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);

  if (!clean.NOM || (typeof clean.NOM === 'string' && !(clean.NOM as string).trim())) {
    throw new AppError(400, 'NOM est requis');
  }
  if (!clean.SYMBOLE || (typeof clean.SYMBOLE === 'string' && !(clean.SYMBOLE as string).trim())) {
    throw new AppError(400, 'SYMBOLE est requis');
  }
  return baseService.create(clean);
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);
  if (!Object.keys(clean).length) throw new AppError(400, 'No fields provided');
  return baseService.update(id, clean);
}

export default {
  ...baseService,
  create,
  update,
};
