import { createEntityService } from '../lib/baseService';
import { dbAll } from '../config/database';
import { levenshteinDistance, normalizeSearchText, rankSuggestions } from '../lib/searchUtils';
import { parseFlag } from '../lib/coerce';
import { AppError } from '../types';

/** Strict 0/1 flag (OFFICIELLE, EPR_PAYS). Absent on create, it keeps its historical default 0 (nothing was sent). */
function normalizeFlag(value: unknown, field: string): number {
  return value === undefined ? 0 : parseFlag(value, field);
}

function normalizeScope(value: unknown): number {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
}

/** Trims texts, normalizes SCOPE / flags; on create the PK is ignored, EPREUVE is required and EPR_WEB defaults to ''. */
function prepareWrite(body: Record<string, unknown>, mode: 'create' | 'update'): Record<string, unknown> {
  const clean = { ...body };
  delete clean.IDEPREUVE;

  if (typeof clean.EPREUVE === 'string') {
    clean.EPREUVE = clean.EPREUVE.trim();
  }
  if (typeof clean.EPR_WEB === 'string') {
    clean.EPR_WEB = clean.EPR_WEB.trim();
  }

  if (mode === 'update') {
    if ('SCOPE' in clean) clean.SCOPE = normalizeScope(clean.SCOPE);
    if ('OFFICIELLE' in clean) clean.OFFICIELLE = normalizeFlag(clean.OFFICIELLE, 'OFFICIELLE');
    if ('EPR_PAYS' in clean) clean.EPR_PAYS = normalizeFlag(clean.EPR_PAYS, 'EPR_PAYS');
    return clean;
  }

  if (!clean.EPREUVE || (typeof clean.EPREUVE === 'string' && !clean.EPREUVE.trim())) {
    throw new AppError(400, 'ÉPREUVE est requis');
  }

  clean.SCOPE = normalizeScope(clean.SCOPE);
  clean.OFFICIELLE = normalizeFlag(clean.OFFICIELLE, 'OFFICIELLE');
  clean.EPR_PAYS = normalizeFlag(clean.EPR_PAYS, 'EPR_PAYS');
  if (!('EPR_WEB' in clean)) {
    clean.EPR_WEB = '';
  }
  return clean;
}

const baseService = createEntityService({
  table: 'EPREUVE',
  pk: 'IDEPREUVE',
  selectCols: ['IDEPREUVE', 'EPREUVE', 'SCOPE', 'OFFICIELLE', 'EPR_WEB', 'EPR_PAYS'],
  allowedSortCols: ['IDEPREUVE', 'EPREUVE', 'SCOPE', 'OFFICIELLE', 'EPR_PAYS'],
  searchCols: ['EPREUVE'],
  // Keep EPR_VISUEL key for form compatibility while keeping BLOB payload out of standard data endpoints.
  extraSelectCols: ['NULL AS "EPR_VISUEL"'],
  prepareWrite,
});

export interface EpreuveSuggestionRow {
  IDEPREUVE: number;
  EPREUVE: string;
  SCORE: number;
}


function computeApproxScore(query: string, label: string): number {
  const q = normalizeSearchText(query);
  const n = normalizeSearchText(label);
  if (!q || !n) return 0;

  let score = 0;
  if (n === q) score += 300;
  if (n.startsWith(q)) score += 180;
  if (n.includes(q)) score += 120;

  const dist = levenshteinDistance(q, n.slice(0, Math.max(q.length + 6, 12)));
  if (dist <= 1) score += 130;
  else if (dist === 2) score += 80;
  else if (dist === 3) score += 30;

  return score;
}

export async function getEpreuveSuggestions(search: string, limit = 12): Promise<{ data: EpreuveSuggestionRow[] }> {
  const query = String(search ?? '').trim();
  if (!query) return { data: [] };

  const rows = await dbAll<{ IDEPREUVE: number; EPREUVE: string }>(
    'SELECT IDEPREUVE, EPREUVE FROM EPREUVE ORDER BY EPREUVE ASC, IDEPREUVE ASC',
  );

  const data = rankSuggestions(rows, (row) => computeApproxScore(query, String(row.EPREUVE ?? '')), {
    min: 20,
    limit: Math.max(1, Math.min(limit, 30)),
    tieBreak: (a, b) => String(a.EPREUVE).localeCompare(String(b.EPREUVE)),
  });

  return { data };
}

export async function createEpreuveWithWizard(payload: { name: string }): Promise<Record<string, unknown> | undefined> {
  const name = String(payload.name ?? '').trim();
  if (!name) {
    throw new AppError(400, 'Nom de l epreuve requis');
  }

  return baseService.create({ EPREUVE: name, SCOPE: 1, OFFICIELLE: 0, EPR_PAYS: 0, EPR_WEB: '' });
}


export default {
  ...baseService,
  getEpreuveSuggestions,
  createEpreuveWithWizard,
};
