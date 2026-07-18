import { createEntityService } from '../lib/baseService';
import { dbGet } from '../config/database';

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
  allowedSortCols: ['IDEPREUVE', 'EPREUVE', 'SCOPE', 'OFFICIELLE', 'EPR_PAYS'],
  searchCols: ['EPREUVE'],
});

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, true);

  if (!clean.IDEPREUVE || (typeof clean.IDEPREUVE === 'string' && !clean.IDEPREUVE.trim())) {
    const result = await dbGet<{ maxId: number }>('SELECT COALESCE(MAX(IDEPREUVE), 0) as maxId FROM EPREUVE');
    clean.IDEPREUVE = (result?.maxId ?? 0) + 1;
  }
  if (!clean.EPREUVE || (typeof clean.EPREUVE === 'string' && !clean.EPREUVE.trim())) {
    throw new Error('EPREUVE est requis');
  }

  clean.SCOPE = normalizeScope(clean.SCOPE);
  clean.OFFICIELLE = normalizeFlag(clean.OFFICIELLE);
  clean.EPR_PAYS = normalizeFlag(clean.EPR_PAYS);
  if (!('EPR_WEB' in clean)) {
    clean.EPR_WEB = '';
  }

  return baseService.create(clean);
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);
  delete clean.IDEPREUVE;
  if ('SCOPE' in clean) clean.SCOPE = normalizeScope(clean.SCOPE);
  if ('OFFICIELLE' in clean) clean.OFFICIELLE = normalizeFlag(clean.OFFICIELLE);
  if ('EPR_PAYS' in clean) clean.EPR_PAYS = normalizeFlag(clean.EPR_PAYS);
  if (!Object.keys(clean).length) throw new Error('No fields provided');
  return baseService.update(id, clean);
}

export default {
  ...baseService,
  create,
  update,
};