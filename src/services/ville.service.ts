import { createEntityService } from '../lib/baseService';
import { AppError } from '../types';

function isBlank(value: unknown): boolean {
  return !value || (typeof value === 'string' && !value.trim());
}

function prepareWrite(body: Record<string, unknown>, mode: 'create' | 'update'): Record<string, unknown> {
  const clean = { ...body };
  if (mode === 'create') {
    // ID auto-incrémenté: ignorer toute valeur d'ID fournie à la création.
    delete clean.VICLEUNIK;
  }

  // Champs requis : obligatoires en création, non vides s'ils sont fournis en mise à jour.
  if ((mode === 'create' || 'NOM' in clean) && isBlank(clean.NOM)) {
    throw new AppError(400, 'NOM est requis');
  }
  if ((mode === 'create' || 'IDNATIO' in clean) && isBlank(clean.IDNATIO)) {
    throw new AppError(400, 'IDNATIO (Pays) est requis');
  }
  return clean;
}

export default createEntityService({
  table: 'VILLE',
  pk: 'VICLEUNIK',
  selectCols: ['VICLEUNIK', 'NOM', 'IDNATIO'],
  allowedSortCols: ['VICLEUNIK', 'NOM', 'IDNATIO'],
  searchCols: ['VICLEUNIK', 'NOM'],
  filterCols: ['IDNATIO'],
  searchStrategy: 'backend-memory',
  prepareWrite,
});
