import { createEntityService } from '../lib/baseService';
import { dbGet, dbAll } from '../config/database';
import { levenshteinDistance, normalizeSearchText } from '../lib/searchUtils';
import { AppError } from '../types';

/** Generates IDARBITRE (MAX + 1, 4 digits) when missing, then checks the required fields. */
async function prepareWrite(body: Record<string, unknown>, mode: 'create' | 'update'): Promise<Record<string, unknown>> {
  if (mode === 'update') return body;

  const clean = { ...body };
  const idarbitreValue = clean.IDARBITRE;
  if (!idarbitreValue || (typeof idarbitreValue === 'string' && idarbitreValue.trim() === '')) {
    const result = await dbGet<{ maxId: number | null }>(
      'SELECT COALESCE(MAX(CAST(IDARBITRE AS INTEGER)), 0) as maxId FROM ARBITRE',
    );
    const nextId = Math.max(0, Number(result?.maxId ?? 0)) + 1;
    clean.IDARBITRE = String(nextId).padStart(4, '0');
  }

  if (!clean.NOM || (typeof clean.NOM === 'string' && !clean.NOM.trim())) {
    throw new AppError(400, 'NOM est requis');
  }
  if (!clean.IDNATIO || (typeof clean.IDNATIO === 'string' && !clean.IDNATIO.trim())) {
    throw new AppError(400, 'IDNATIO (Nationalité) est requis');
  }
  return clean;
}

const baseService = createEntityService({
  table: 'ARBITRE',
  pk: 'IDARBITRE',
  selectCols: ['IDARBITRE', 'NOM', 'PRENOM', 'IDNATIO'],
  allowedSortCols: ['IDARBITRE', 'NOM', 'PRENOM', 'IDNATIO'],
  searchCols: ['IDARBITRE', 'NOM', 'PRENOM'],
  filterCols: ['IDNATIO'],
  searchStrategy: 'backend-memory',
  // ARB_PHOTO BLOB excluded from payloads (served via /api/images); placeholder keeps the form contract.
  extraSelectCols: ['NULL AS "ARB_PHOTO"'],
  prepareWrite,
});

export interface ArbitreSuggestionRow {
  IDARBITRE: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string;
  SCORE: number;
}

export interface ArbitreSuggestionsResponse {
  data: ArbitreSuggestionRow[];
}

function computeApproxScore(query: string, nom: string, prenom: string): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const n = normalizeSearchText(nom);
  const p = normalizeSearchText(prenom);
  const full = `${n}${p}`;

  let score = 0;
  if (n === q) score += 260;
  if (p === q) score += 120;
  if (full === q) score += 300;
  if (n.startsWith(q)) score += 150;
  if (p.startsWith(q)) score += 90;
  if (full.startsWith(q)) score += 180;
  if (n.includes(q)) score += 100;
  if (p.includes(q)) score += 60;
  if (full.includes(q)) score += 120;

  const distN = n ? levenshteinDistance(q, n.slice(0, Math.max(q.length + 6, 10))) : 99;
  const distP = p ? levenshteinDistance(q, p.slice(0, Math.max(q.length + 6, 10))) : 99;
  const best = Math.min(distN, distP);
  if (best <= 1) score += 130;
  else if (best === 2) score += 80;
  else if (best === 3) score += 30;

  return score;
}

export async function getArbitreSuggestions(search: string, limit = 12): Promise<ArbitreSuggestionsResponse> {
  const query = String(search ?? '').trim();
  if (!query) return { data: [] };

  const rows = await dbAll<{ IDARBITRE: string; NOM: string; PRENOM: string; IDNATIO: string }>(
    `SELECT IDARBITRE, NOM, PRENOM, IDNATIO
     FROM ARBITRE
     ORDER BY NOM ASC, PRENOM ASC, IDARBITRE ASC`,
  );

  const data = rows
    .map((row) => ({ ...row, SCORE: computeApproxScore(query, String(row.NOM ?? ''), String(row.PRENOM ?? '')) }))
    .filter((row) => row.SCORE >= 20)
    .sort((a, b) => b.SCORE - a.SCORE || String(a.NOM).localeCompare(String(b.NOM)) || String(a.PRENOM).localeCompare(String(b.PRENOM)))
    .slice(0, Math.max(1, Math.min(limit, 30)));

  return { data };
}

export async function createArbitreWithWizard(payload: { nom: string; prenom?: string; natioId: string }): Promise<Record<string, unknown> | undefined> {
  const nom = String(payload.nom ?? '').trim().toUpperCase();
  const prenom = String(payload.prenom ?? '').trim();
  const natioId = String(payload.natioId ?? '').trim().toUpperCase();

  if (!nom) throw new AppError(400, 'Nom requis.');
  if (!natioId) throw new AppError(400, 'Nationalite requise.');

  return baseService.create({
    NOM: nom,
    PRENOM: prenom,
    IDNATIO: natioId,
  });
}

export default {
  ...baseService,
  getArbitreSuggestions,
  createArbitreWithWizard,
};
