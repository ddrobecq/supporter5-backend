import { createEntityService } from '../lib/baseService';
import { AppError } from '../types';

function normalizeTypeTour(value: unknown): number {
  const numeric = Number(value);
  if (numeric === 0 || numeric === 1 || numeric === 2) {
    return numeric;
  }
  return 1;
}

function prepareWrite(body: Record<string, unknown>, mode: 'create' | 'update'): Record<string, unknown> {
  const clean = { ...body };

  if (typeof clean.IDCIRC === 'string') {
    clean.IDCIRC = clean.IDCIRC.trim().toUpperCase();
  }
  if (typeof clean.CIRC === 'string') {
    clean.CIRC = clean.CIRC.trim();
  }

  if (mode === 'update') {
    if (clean.TYPE_TOUR !== undefined) {
      clean.TYPE_TOUR = normalizeTypeTour(clean.TYPE_TOUR);
    }
    return clean;
  }

  if (!clean.IDCIRC || (typeof clean.IDCIRC === 'string' && !clean.IDCIRC.trim())) {
    throw new AppError(400, 'IDCIRC est requis');
  }
  if (String(clean.IDCIRC).length > 5) {
    throw new AppError(400, 'IDCIRC doit contenir 5 caracteres max');
  }
  if (!clean.CIRC || (typeof clean.CIRC === 'string' && !clean.CIRC.trim())) {
    throw new AppError(400, 'CIRC est requis');
  }
  if (String(clean.CIRC).trim().length < 12) {
    throw new AppError(400, 'CIRC doit contenir 12 caracteres minimum');
  }

  clean.TYPE_TOUR = normalizeTypeTour(clean.TYPE_TOUR);
  return clean;
}

export default createEntityService({
  table: 'CIRC',
  pk: 'IDCIRC',
  selectCols: ['IDCIRC', 'CIRC', 'TYPE_TOUR'],
  allowedSortCols: ['IDCIRC', 'CIRC', 'TYPE_TOUR'],
  searchCols: ['IDCIRC', 'CIRC'],
  prepareWrite,
});
