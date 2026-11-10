import { createEntityService } from '../lib/baseService';
import { AppError } from '../types';

function prepareWrite(body: Record<string, unknown>, mode: 'create' | 'update'): Record<string, unknown> {
  if (mode === 'update') return body;

  // DVCLEUNIK is auto-generated: an explicit value is ignored on create.
  const clean = { ...body };
  delete clean.DVCLEUNIK;
  if (!clean.NOM || (typeof clean.NOM === 'string' && !(clean.NOM as string).trim())) {
    throw new AppError(400, 'NOM est requis');
  }
  if (!clean.SYMBOLE || (typeof clean.SYMBOLE === 'string' && !(clean.SYMBOLE as string).trim())) {
    throw new AppError(400, 'SYMBOLE est requis');
  }
  return clean;
}

export default createEntityService({
  table: 'DEVISE',
  pk: 'DVCLEUNIK',
  selectCols: ['DVCLEUNIK', 'NOM', 'SYMBOLE', 'CONVERSION', 'DVDEFAUT'],
  allowedSortCols: ['DVCLEUNIK', 'NOM', 'SYMBOLE', 'CONVERSION', 'DVDEFAUT'],
  searchCols: ['NOM', 'SYMBOLE'],
  searchStrategy: 'backend-memory',
  prepareWrite,
});
