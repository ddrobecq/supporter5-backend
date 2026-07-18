import { createEntityService } from '../lib/baseService';

const WRITABLE_COLS = new Set(['IDCIRC', 'CIRC', 'TYPE_TOUR']);

function sanitize(body: Record<string, unknown>, includePk: boolean): Record<string, unknown> {
  const clean = Object.fromEntries(
    Object.entries(body).filter(([key]) => WRITABLE_COLS.has(key) && (includePk || key !== 'IDCIRC')),
  );

  if (typeof clean.IDCIRC === 'string') {
    clean.IDCIRC = clean.IDCIRC.trim().toUpperCase();
  }
  if (typeof clean.CIRC === 'string') {
    clean.CIRC = clean.CIRC.trim();
  }

  return clean;
}

function normalizeTypeTour(value: unknown): number {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 2) {
    return numeric;
  }
  return 1;
}

const baseService = createEntityService({
  table: 'CIRC',
  pk: 'IDCIRC',
  allowedSortCols: ['IDCIRC', 'CIRC', 'TYPE_TOUR'],
  searchCols: ['IDCIRC', 'CIRC'],
});

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, true);

  if (!clean.IDCIRC || (typeof clean.IDCIRC === 'string' && !clean.IDCIRC.trim())) {
    throw new Error('IDCIRC est requis');
  }
  if (String(clean.IDCIRC).length > 5) {
    throw new Error('IDCIRC doit contenir 5 caracteres max');
  }
  if (!clean.CIRC || (typeof clean.CIRC === 'string' && !clean.CIRC.trim())) {
    throw new Error('CIRC est requis');
  }
  if (String(clean.CIRC).trim().length < 12) {
    throw new Error('CIRC doit contenir 12 caracteres minimum');
  }

  clean.TYPE_TOUR = normalizeTypeTour(clean.TYPE_TOUR);

  return baseService.create(clean);
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);
  if (clean.IDCIRC !== undefined) {
    delete clean.IDCIRC;
  }
  if (clean.TYPE_TOUR !== undefined) {
    clean.TYPE_TOUR = normalizeTypeTour(clean.TYPE_TOUR);
  }
  if (!Object.keys(clean).length) throw new Error('No fields provided');
  return baseService.update(id, clean);
}

export default {
  ...baseService,
  create,
  update,
};