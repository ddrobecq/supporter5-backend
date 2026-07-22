import { createEntityService } from '../lib/baseService';
import { dbAll } from '../config/database';

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

export interface EpreuveSuggestionRow {
  IDEPREUVE: number;
  EPREUVE: string;
  SCORE: number;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const cols = b.length + 1;
  const rows = a.length + 1;
  const dp = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[rows - 1][cols - 1];
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

  const data = rows
    .map((row) => ({ ...row, SCORE: computeApproxScore(query, String(row.EPREUVE ?? '')) }))
    .filter((row) => row.SCORE >= 20)
    .sort((a, b) => b.SCORE - a.SCORE || String(a.EPREUVE).localeCompare(String(b.EPREUVE)))
    .slice(0, Math.max(1, Math.min(limit, 30)));

  return { data };
}

export async function createEpreuveWithWizard(payload: { name: string }): Promise<Record<string, unknown> | undefined> {
  const name = String(payload.name ?? '').trim();
  if (!name) {
    throw new Error('Nom de l epreuve requis');
  }

  return create({ EPREUVE: name, SCOPE: 1, OFFICIELLE: 0, EPR_PAYS: 0, EPR_WEB: '' });
}

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);

  if (!clean.EPREUVE || (typeof clean.EPREUVE === 'string' && !clean.EPREUVE.trim())) {
    throw new Error('ÉPREUVE est requis');
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
  getEpreuveSuggestions,
  createEpreuveWithWizard,
};